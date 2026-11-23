import math
from datetime import datetime, time
from pathlib import Path
from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.accounts.models import User
from apps.leads.models import Lead, LeadHistory, LeadStage
from .models import (
    CallAttempt,
    Contact,
    DailyAssignment,
    Recording,
    RecordingPart,
    SalesMember,
    SalesSettings,
)
from .serializers import ContactSerializer, OutcomeSerializer
from .services import (
    BISHKEK,
    HEAD_ROLES,
    admin,
    allocate,
    head,
    local_now,
    member,
    next_workday,
    parse_batch,
    supervisor,
    sync_members,
    working,
)

CHUNK = 1024 * 1024


class SalesAccess(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return (
            u.is_authenticated
            and u.is_active
            and bool(u.role_id)
            and u.role.name != "client"
            and (admin(u) or supervisor(u) or member(u))
        )


class SalesView(APIView):
    permission_classes = [SalesAccess]

    def require_supervisor(self):
        if not supervisor(self.request.user):
            raise PermissionDenied("Действие доступно руководителю.")

    def contacts(self):
        qs = Contact.objects.select_related("assigned_to").prefetch_related(
            "calls__employee", "calls__recording"
        )
        return qs if supervisor(self.request.user) else qs.filter(assigned_to=self.request.user)


class BootstrapView(SalesView):
    def get(self, request):
        settings, _ = SalesSettings.objects.get_or_create(pk=1)
        own = SalesMember.objects.filter(user=request.user).first()
        boss = supervisor(request.user, settings)
        manage = boss or admin(request.user)
        if manage:
            sync_members()
        lead_head = head(settings)
        return Response(
            {
                "is_supervisor": boss,
                "is_admin": admin(request.user),
                "supervisor": settings.supervisor_id,
                "owner_is_head": settings.owner_is_head,
                "head": (
                    {"id": lead_head.id, "name": lead_head.get_full_name() or lead_head.email}
                    if lead_head
                    else None
                ),
                "daily_limit": own.daily_limit if own else None,
                "members": (
                    [
                        {
                            "id": m.user_id,
                            "name": m.user.get_full_name() or m.user.email,
                            "daily_limit": m.daily_limit,
                            "active": m.active,
                        }
                        for m in SalesMember.objects.select_related("user").all()
                    ]
                    if manage
                    else []
                ),
                "users": (
                    [
                        {
                            "id": u.id,
                            "name": u.get_full_name() or u.email,
                            "can_supervise": u.role.name in HEAD_ROLES,
                        }
                        for u in User.objects.filter(is_active=True, role__isnull=False)
                        .exclude(role__name="client")
                        .select_related("role")
                    ]
                    if manage
                    else []
                ),
            }
        )

    @transaction.atomic
    def patch(self, request):
        settings, _ = SalesSettings.objects.get_or_create(pk=1)
        settings = SalesSettings.objects.select_for_update().get(pk=1)
        if "owner_is_head" in request.data:
            if not admin(request.user):
                raise PermissionDenied("Эту настройку меняет владелец или администратор.")
            settings.owner_is_head = serializers.BooleanField().run_validation(
                request.data["owner_is_head"]
            )
            settings.save()
        if "supervisor" in request.data:
            if not admin(request.user):
                raise PermissionDenied("Назначить руководителя может владелец или администратор.")
            if request.data["supervisor"] in (None, ""):
                settings.supervisor = None
            else:
                uid = serializers.UUIDField().run_validation(request.data["supervisor"])
                settings.supervisor = get_object_or_404(
                    User, pk=uid, is_active=True, role__name__in=HEAD_ROLES
                )
            settings.save()
        if "daily_limit" in request.data:
            uid = serializers.UUIDField().run_validation(
                request.data.get("user", str(request.user.id))
            )
            boss = supervisor(request.user, settings) or admin(request.user)
            if str(uid) != str(request.user.id) and not boss:
                raise PermissionDenied()
            limit = serializers.IntegerField(
                min_value=1 if boss else 20, max_value=40
            ).run_validation(request.data["daily_limit"])
            target = get_object_or_404(User, pk=uid, is_active=True, role__isnull=False)
            if target.role.name == "client":
                raise ValidationError("Клиент не может участвовать в обзвоне.")
            if not boss and not member(target):
                raise PermissionDenied()
            m, _ = SalesMember.objects.get_or_create(user=target)
            m.daily_limit = limit
            if "active" in request.data:
                if not boss:
                    raise PermissionDenied("Действие доступно руководителю.")
                m.active = serializers.BooleanField().run_validation(request.data["active"])
            m.save()
        return self.get(request)


class QueueView(SalesView):
    def post(self, request):
        allocate()
        return self.get(request)

    def get(self, request):
        now = local_now()
        qs = self.contacts()
        if request.query_params.get("user"):
            uid = serializers.UUIDField().run_validation(request.query_params["user"])
            qs = qs.filter(assigned_to_id=uid)
        if request.query_params.get("mode") != "all":
            end = datetime.combine(now.date(), time(23, 59, 59), BISHKEK)
            qs = qs.filter(assigned_to__isnull=False).filter(
                Q(status="callback", next_call_at__lte=end)
                | Q(
                    status__in=["new", "no_answer"],
                    pk__in=DailyAssignment.objects.filter(date=now.date()).values("contact_id"),
                )
                & (Q(next_call_at__isnull=True) | Q(next_call_at__lte=now))
            )
        search = request.query_params.get("search", "")[:255]
        if search:
            qs = qs.filter(Q(company__icontains=search) | Q(phone__icontains=search))
        page = serializers.IntegerField(min_value=1).run_validation(
            request.query_params.get("page", 1)
        )
        count = qs.count()
        qs = qs.extra(
            select={"callback_first": "CASE WHEN status = 'callback' THEN 0 ELSE 1 END"}
        ).order_by("callback_first", "next_call_at", "created_at", "id")
        return Response(
            {
                "results": ContactSerializer(qs[(page - 1) * 50 : page * 50], many=True).data,
                "count": count,
                "working": working(now),
                "today": now.date(),
                "unassigned": (
                    Contact.objects.filter(assigned_to__isnull=True, status="new").count()
                    if supervisor(request.user)
                    else None
                ),
            }
        )


class ImportView(SalesView):
    @transaction.atomic
    def post(self, request):
        self.require_supervisor()
        SalesSettings.objects.get_or_create(pk=1)
        SalesSettings.objects.select_for_update().get(pk=1)
        rows = parse_batch(request.data.get("text"))
        commit = request.data.get("commit") is True
        created = 0
        if commit:
            for row in rows:
                if not row["duplicate"]:
                    Contact.objects.create(**{k: v for k, v in row.items() if k != "duplicate"})
                    created += 1
        return Response(
            {"rows": rows, "created": created, "duplicates": sum(r["duplicate"] for r in rows)}
        )


class OutcomeView(SalesView):
    @transaction.atomic
    def post(self, request, pk):
        s = OutcomeSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = s.validated_data
        SalesSettings.objects.get_or_create(pk=1)
        settings = SalesSettings.objects.select_for_update().get(pk=1)
        get_object_or_404(self.contacts(), pk=pk)
        c = Contact.objects.select_for_update().get(pk=pk)
        existing = CallAttempt.objects.filter(request_id=data["request_id"]).first()
        if existing:
            if existing.contact_id != c.id or existing.employee_id != request.user.id:
                raise ValidationError("Идентификатор звонка уже использован.")
            return Response(ContactSerializer(c).data)
        if c.status in ("interested", "rejected", "wrong_number", "exhausted"):
            raise ValidationError("Обзвон контакта завершён.")
        outcome = data["outcome"]
        recording = None
        if data.get("recording"):
            recording = get_object_or_404(
                Recording.objects.select_for_update(),
                pk=data["recording"],
                uploaded_by=request.user,
            )
            if CallAttempt.objects.filter(recording=recording).exists():
                raise ValidationError("Запись уже прикреплена к другому звонку.")
            chunks = list(recording.chunks.values_list("index", "data"))
            if len(chunks) != recording.parts or sum(len(b) for _, b in chunks) != recording.size:
                raise ValidationError("Дождитесь завершения загрузки записи.")
        if outcome not in ("no_answer", "wrong_number") and recording is None:
            raise ValidationError("Прикрепите запись разговора.")
        now = local_now()
        scheduled = data.get("next_call_at")
        if outcome == "callback":
            if (
                not scheduled
                or scheduled <= timezone.now()
                or not working(scheduled.astimezone(BISHKEK))
            ):
                raise ValidationError("Выберите будущее рабочее время: пн–пт, 09:00–19:00, Бишкек.")
        else:
            scheduled = None
        c.status = outcome
        c.next_call_at = scheduled
        if outcome == "no_answer":
            c.missed_attempts += 1
            c.status = "exhausted" if c.missed_attempts >= 3 else "no_answer"
            c.next_call_at = None if c.missed_attempts >= 3 else next_workday(now)
        if outcome == "interested":
            boss = head(settings)
            if boss is None:
                raise ValidationError("Сначала назначьте действующего руководителя отдела.")
            stage = LeadStage.objects.filter(name="Заинтересован").first()
            if not stage:
                stage = LeadStage.objects.create(
                    name="Заинтересован", order=2, probability=30, color="#10b981"
                )
            c.lead = Lead.objects.create(
                contact_name=c.company,
                company_name=c.company,
                phone=c.phone,
                source="call",
                assigned_to=boss,
                created_by=request.user,
                current_stage=stage,
                business_need=c.offer,
                notes="D2C · DEOCORE TO CLIENT\n"
                + "\n\n".join(
                    f"{k}: {getattr(c, v)}"
                    for k, v in [
                        ("Сфера", "industry"),
                        ("Предложение", "offer"),
                        ("УТП", "usp"),
                        ("Начало разговора", "script"),
                        ("Возражения", "objections"),
                    ]
                )
                + f"\n\nКомментарий: {data['notes']}\nИстория звонков: /outreach?contact={c.pk}",
            )
            LeadHistory.objects.create(
                lead=c.lead,
                to_stage=stage,
                user=request.user,
                notes="Заинтересован после D2C-обзвона; передан руководителю.",
            )
        CallAttempt.objects.create(
            contact=c,
            employee=request.user,
            outcome=outcome,
            notes=data["notes"],
            recording=recording,
            next_call_at=scheduled,
            request_id=data["request_id"],
        )
        c.save()
        return Response(ContactSerializer(c).data)


class ContactView(SalesView):
    def get(self, request, pk):
        return Response(ContactSerializer(get_object_or_404(self.contacts(), pk=pk)).data)

    @transaction.atomic
    def patch(self, request, pk):
        self.require_supervisor()
        SalesSettings.objects.select_for_update().get(pk=1)
        c = get_object_or_404(Contact.objects.select_for_update(), pk=pk)
        if c.status not in ("new", "no_answer", "callback"):
            raise ValidationError("Можно перераспределить только активный контакт.")
        uid = serializers.UUIDField().run_validation(request.data.get("assigned_to"))
        target = get_object_or_404(SalesMember, user_id=uid, active=True, user__is_active=True)
        if not member(target.user):
            raise ValidationError("Сотрудник больше не имеет доступа к обзвону.")
        now = local_now()
        if c.status != "callback" and c.assigned_to_id != uid:
            used = DailyAssignment.objects.filter(user_id=uid, date=now.date()).count()
            if used >= target.daily_limit:
                raise ValidationError("У сотрудника уже заполнен дневной лимит.")
            DailyAssignment.objects.update_or_create(
                contact=c, date=now.date(), defaults={"user_id": uid}
            )
        c.assigned_to_id = uid
        c.assigned_on = now.date()
        c.save()
        return Response(ContactSerializer(c).data)


class RecordingView(SalesView):
    def post(self, request):
        name = serializers.CharField(max_length=255).run_validation(request.data.get("name"))
        if Path(name).suffix.lower() not in (
            ".mp3",
            ".m4a",
            ".wav",
            ".ogg",
            ".aac",
            ".webm",
            ".amr",
            ".3gp",
        ):
            raise ValidationError("Допустимы MP3, M4A, WAV, OGG, AAC, WEBM, AMR, 3GP.")
        size = serializers.IntegerField(min_value=1, max_value=30 * CHUNK).run_validation(
            request.data.get("size")
        )
        if (
            Recording.objects.filter(
                uploaded_by=request.user,
                callattempt__isnull=True,
                created_at__gte=timezone.now() - timezone.timedelta(hours=24),
            ).count()
            >= 100
        ):
            raise ValidationError("Слишком много незавершённых загрузок за сутки.")
        r = Recording.objects.create(
            uploaded_by=request.user, name=Path(name).name, size=size, parts=math.ceil(size / CHUNK)
        )
        return Response({"id": r.id, "parts": r.parts, "chunk_size": CHUNK}, status=201)


class RecordingPartView(SalesView):
    @transaction.atomic
    def put(self, request, pk, index):
        r = get_object_or_404(
            Recording.objects.select_for_update(), pk=pk, uploaded_by=request.user
        )
        if CallAttempt.objects.filter(recording=r).exists():
            raise ValidationError("Запись прикреплённого звонка нельзя изменить.")
        upload = request.FILES.get("file")
        expected = min(CHUNK, r.size - index * CHUNK)
        if index >= r.parts or not upload or upload.size != expected:
            raise ValidationError("Некорректная часть записи.")
        RecordingPart.objects.update_or_create(
            recording=r, index=index, defaults={"data": upload.read()}
        )
        return Response({"ok": True})

    def get(self, request, pk, index):
        call = get_object_or_404(CallAttempt.objects.select_related("contact"), recording_id=pk)
        get_object_or_404(self.contacts(), pk=call.contact_id)
        part = get_object_or_404(RecordingPart, recording_id=pk, index=index)
        response = HttpResponse(bytes(part.data), content_type="application/octet-stream")
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response
