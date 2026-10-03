from datetime import timedelta
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, serializers, views
from rest_framework.response import Response
from apps.tasks.models import Task, TaskTimer
from .models import FocusNote, FocusProfile, FocusSession
from .serializers import (
    FocusNoteSerializer,
    FocusProfileSerializer,
    FocusSessionSerializer,
    FocusStartSerializer,
)
from .services import elapsed, finish, settle


def allowed_task(user, task_id):
    if not task_id:
        return None
    queryset = Task.objects.all()
    if getattr(user.role, "name", "") not in ["superadmin", "owner", "project_manager"]:
        queryset = queryset.filter(
            Q(assignee=user) | Q(reviewer=user) | Q(created_by=user) | Q(project__team__user=user)
        ).distinct()
    task = queryset.filter(pk=task_id).first()
    if not task:
        raise serializers.ValidationError({"task": "Задача недоступна."})
    return task


def lock_user(user):
    get_user_model().objects.select_for_update().get(pk=user.pk)


def active(user):
    return settle(
        FocusSession.objects.select_for_update(of=("self",))
        .select_related("task")
        .filter(user=user, status__in=["running", "paused"])
        .first()
    )


def snapshot(session):
    if not session or session.status not in ["running", "paused"]:
        return None
    data = FocusSessionSerializer(session).data
    data["elapsed_seconds"] = elapsed(session)
    return data


class FocusStateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def get(self, request):
        lock_user(request.user)
        session = active(request.user)
        running_timer = TaskTimer.objects.filter(user=request.user, is_running=True).first()
        return Response(
            {
                "active": snapshot(session),
                "last_session": (
                    FocusSessionSerializer(
                        session or FocusSession.objects.filter(user=request.user).first()
                    ).data
                    if session or FocusSession.objects.filter(user=request.user).exists()
                    else None
                ),
                "running_timer": (
                    {"task": str(running_timer.task_id), "task_title": running_timer.task.title, "started_at": running_timer.start_time}
                    if running_timer
                    else None
                ),
                "server_time": timezone.now(),
            }
        )


class FocusTimerStopView(views.APIView):
    """Stop a running task timer so a focus session can start."""

    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        lock_user(request.user)
        timer = TaskTimer.objects.filter(user=request.user, is_running=True).first()
        if not timer:
            return Response({"detail": "Нет активного таймера."}, status=404)
        now = timezone.now()
        timer.end_time = now
        timer.duration_seconds = int((now - timer.start_time).total_seconds())
        timer.is_running = False
        timer.save()
        from apps.tasks.time_tracking import recalculate_task_time

        recalculate_task_time(timer.task)
        return Response({"detail": "Таймер остановлен.", "duration_seconds": timer.duration_seconds})


class FocusStartView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        payload = FocusStartSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        lock_user(request.user)
        session = active(request.user)
        if snapshot(session):
            return Response({"detail": "У вас уже есть активная фокус-сессия."}, status=409)
        if TaskTimer.objects.filter(user=request.user, is_running=True).exists():
            return Response({"detail": "Сначала остановите активный таймер задачи."}, status=409)
        data = payload.validated_data
        profile, _ = FocusProfile.objects.get_or_create(user=request.user)
        phase = data["phase"]
        minutes = data.get(
            "duration_minutes",
            getattr(
                profile,
                {
                    "work": "work_minutes",
                    "short_break": "short_break_minutes",
                    "long_break": "long_break_minutes",
                }[phase],
            ),
        )
        now = timezone.now()
        session = FocusSession.objects.create(
            user=request.user,
            task=allowed_task(request.user, data.get("task")),
            phase=phase,
            goal=data.get("goal", ""),
            planned_seconds=minutes * 60,
            started_at=now,
            resumed_at=now,
            ends_at=now + timedelta(minutes=minutes),
        )
        return Response(FocusSessionSerializer(session).data, status=201)


class FocusActionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk, action):
        lock_user(request.user)
        session = (
            FocusSession.objects.select_for_update(of=("self",))
            .select_related("task")
            .filter(user=request.user, pk=pk)
            .first()
        )
        if not session:
            return Response({"detail": "Сессия не найдена."}, status=404)
        settle(session)
        if action == "result":
            result = serializers.CharField(max_length=10000, allow_blank=True).run_validation(
                request.data.get("result", "")
            )
            session.result = result
            session.save(update_fields=["result"])
        elif session.status not in ["running", "paused"]:
            # Retried finish/cancel requests never create another time entry.
            if action not in ["finish", "cancel"]:
                return Response({"detail": "Сессия уже завершена."}, status=409)
        elif action == "pause" and session.status == "running":
            session.elapsed_seconds = elapsed(session)
            session.status = "paused"
            session.ends_at = None
            session.resumed_at = None
            session.save()
        elif action == "resume" and session.status == "paused":
            now = timezone.now()
            session.status = "running"
            session.resumed_at = now
            session.ends_at = now + timedelta(
                seconds=session.planned_seconds - session.elapsed_seconds
            )
            session.save()
        elif action in ["finish", "cancel"]:
            finish(session, status="completed" if action == "finish" else "cancelled")
        else:
            return Response({"detail": "Действие недоступно."}, status=409)
        return Response(FocusSessionSerializer(session).data)


class FocusHistoryView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FocusSessionSerializer

    def get_queryset(self):
        return FocusSession.objects.filter(user=self.request.user).select_related("task")


class FocusProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FocusProfileSerializer

    def get_object(self):
        return FocusProfile.objects.get_or_create(user=self.request.user)[0]


class FocusNotesView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FocusNoteSerializer

    def get_queryset(self):
        return FocusNote.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        task = serializer.validated_data.get("task")
        allowed_task(self.request.user, task.pk if task else None)
        serializer.save(user=self.request.user)


class FocusNoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FocusNoteSerializer

    def get_queryset(self):
        return FocusNote.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        task = serializer.validated_data.get("task")
        allowed_task(self.request.user, task.pk if task else None)
        serializer.save()


class FocusStatsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def get(self, request):
        lock_user(request.user)
        active(request.user)
        now = timezone.localdate()
        # Date grouping follows the server timezone, consistently across devices.
        sessions = list(
            FocusSession.objects.filter(
                user=request.user, phase="work", status__in=["completed", "cancelled"]
            )
            .order_by("-started_at")
            .values("elapsed_seconds", "status", "finished_at")
        )
        days = {}
        completed = total = 0
        for row in sessions:
            key = timezone.localtime(row["finished_at"]).date().isoformat()
            daily = days.setdefault(key, {"date": key, "seconds": 0, "sessions": 0})
            daily["seconds"] += row["elapsed_seconds"]
            total += row["elapsed_seconds"]
            if row["status"] == "completed":
                daily["sessions"] += 1
                completed += 1
        today = days.get(now.isoformat(), {"seconds": 0, "sessions": 0})
        streak = 0
        day = now if today["sessions"] else now - timedelta(days=1)
        while days.get(day.isoformat(), {}).get("sessions", 0):
            streak += 1
            day -= timedelta(days=1)
        profile, _ = FocusProfile.objects.get_or_create(user=request.user)
        achievements = [
            {"id": key, "title": title, "unlocked": value}
            for key, title, value in [
                ("first", "Первый шаг", completed >= 1),
                ("ten", "10 сессий", completed >= 10),
                ("hundred", "100 сессий", completed >= 100),
                ("week", "Неделя привычки", streak >= 7),
                ("deep", "10 часов фокуса", total >= 36000),
            ]
        ]
        return Response(
            {
                "today_seconds": today["seconds"],
                "today_sessions": today["sessions"],
                "total_seconds": total,
                "total_sessions": completed,
                "streak": streak,
                "level": 1 + total // 7200,
                "xp": total // 60,
                "daily_goal": profile.daily_goal,
                "daily": [
                    days.get(
                        (now - timedelta(days=i)).isoformat(),
                        {
                            "date": (now - timedelta(days=i)).isoformat(),
                            "seconds": 0,
                            "sessions": 0,
                        },
                    )
                    for i in range(27, -1, -1)
                ],
                "achievements": achievements,
            }
        )


SHOP = [
    {"id": "flower", "title": "Цветок", "price": 30, "emoji": "🌼"},
    {"id": "hat", "title": "Шляпа", "price": 60, "emoji": "🎩"},
    {"id": "crown", "title": "Корона", "price": 120, "emoji": "👑"},
]


class FocusShopView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(SHOP)

    @transaction.atomic
    def post(self, request):
        lock_user(request.user)
        profile, _ = FocusProfile.objects.select_for_update().get_or_create(user=request.user)
        item = next((item for item in SHOP if item["id"] == request.data.get("item")), None)
        if not item:
            return Response({"detail": "Предмет не найден."}, status=400)
        if item["id"] in profile.inventory:
            return Response(FocusProfileSerializer(profile).data)
        if profile.coins < item["price"]:
            return Response({"detail": "Недостаточно монет."}, status=400)
        profile.coins -= item["price"]
        profile.inventory = [*profile.inventory, item["id"]]
        profile.save()
        return Response(FocusProfileSerializer(profile).data)
