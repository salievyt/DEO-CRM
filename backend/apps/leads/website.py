"""Server-to-server intake for the DEO CORE studio website."""

import hashlib
import io
import json
import re
import secrets
from pathlib import PurePosixPath
from uuid import UUID
from zipfile import BadZipFile, ZipFile

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.serializers.json import DjangoJSONEncoder
from django.db import transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import APIException, AuthenticationFailed
from rest_framework.parsers import BaseParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from common.permissions import IsProjectManager
from common.phone import normalize_phone

from .models import Lead, LeadHistory, LeadStage
from .website_models import (
    CHUNK_BYTES,
    MAX_ATTACHMENT_BYTES,
    WebsiteAttachmentChunk,
    WebsiteSubmission,
)

BUDGET_LABELS = {
    "estimate": "Нужна оценка",
    "under-1000": "до $1,000",
    "1000-3000": "$1,000–3,000",
    "3000-5000": "$3,000–5,000",
    "5000-10000": "$5,000–10,000",
    "10000-plus": "$10,000+",
}
TIMELINE_LABELS = {
    "flexible": "Не определён",
    "asap": "Как можно быстрее",
    "1-2 months": "1–2 месяца",
    "3-6 months": "3–6 месяцев",
}
MANAGER_ROLES = ["superadmin", "owner", "project_manager"]


class IntegrationUnavailable(APIException):
    status_code = 503
    default_detail = "Интеграция сайта не настроена."


class Conflict(APIException):
    status_code = 409
    default_detail = "Конфликт повторной доставки."


class RemovedSubmission(APIException):
    status_code = 410
    default_detail = "Лид удалён в CRM. Повторное создание запрещено."


class PayloadTooLarge(APIException):
    status_code = 413
    default_detail = "Превышен размер запроса."


class WebsitePrincipal:
    is_authenticated = True
    pk = "deo-core-website"


class WebsiteAuthentication(BaseAuthentication):
    def authenticate_header(self, request):
        return "Bearer"

    def authenticate(self, request):
        expected = getattr(settings, "WEBSITE_INGEST_TOKEN", "")
        if len(expected) < 32:
            raise IntegrationUnavailable()
        parts = get_authorization_header(request).split()
        if len(parts) != 2 or parts[0].lower() != b"bearer":
            raise AuthenticationFailed("Требуется ключ интеграции сайта.")
        if not secrets.compare_digest(parts[1], expected.encode()):
            raise AuthenticationFailed("Неверный ключ интеграции сайта.")
        return WebsitePrincipal(), None


class WebsiteThrottle(SimpleRateThrottle):
    scope = "website_integration"
    rate = "120/minute"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": "deo-core-website"}


class BoundedJSONParser(JSONParser):
    def parse(self, stream, media_type=None, parser_context=None):
        body = stream.read(128 * 1024 + 1)
        if len(body) > 128 * 1024:
            raise PayloadTooLarge()
        return super().parse(io.BytesIO(body), media_type, parser_context)


class ChunkParser(BaseParser):
    media_type = "application/octet-stream"

    def parse(self, stream, media_type=None, parser_context=None):
        body = stream.read(CHUNK_BYTES + 1)
        if len(body) > CHUNK_BYTES:
            raise PayloadTooLarge()
        return body


class AttachmentDescriptor(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    size = serializers.IntegerField(min_value=1, max_value=MAX_ATTACHMENT_BYTES)
    sha256 = serializers.RegexField(r"^[0-9a-f]{64}$")
    parts = serializers.IntegerField(min_value=1, max_value=10)

    def validate_name(self, value):
        if "/" in value or "\\" in value or any(ord(c) < 32 or ord(c) == 127 for c in value):
            raise serializers.ValidationError("Некорректное имя файла.")
        if PurePosixPath(value).suffix.lower() not in [".pdf", ".docx", ".txt"]:
            raise serializers.ValidationError("Допустимы PDF, DOCX, TXT.")
        return value

    def validate(self, data):
        if data["parts"] != (data["size"] + CHUNK_BYTES - 1) // CHUNK_BYTES:
            raise serializers.ValidationError("Некорректное количество частей.")
        return data


class WebsiteIntakeSerializer(serializers.Serializer):
    protocol_version = serializers.ChoiceField(choices=[1])
    id = serializers.UUIDField()
    created_at = serializers.DateTimeField()
    name = serializers.CharField(max_length=120)
    company = serializers.CharField(max_length=160, required=False, allow_blank=True, default="")
    email = serializers.EmailField()
    contact = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    project_type = serializers.ChoiceField(
        choices=["Mobile App", "Website", "Web App", "CRM", "UI/UX", "Automation", "Other"]
    )
    description = serializers.CharField(min_length=10, max_length=5000)
    budget = serializers.ChoiceField(choices=list(BUDGET_LABELS), default="estimate")
    timeline = serializers.ChoiceField(choices=list(TIMELINE_LABELS), default="flexible")
    locale = serializers.ChoiceField(choices=["ru", "en"], default="ru")
    source = serializers.ChoiceField(choices=["Website"], default="Website")
    kind = serializers.ChoiceField(choices=["project", "contact"], default="project")
    consent = serializers.BooleanField()
    consent_version = serializers.CharField(max_length=30)
    referrer = serializers.URLField(max_length=2000, allow_blank=True, required=False, default="")
    utm_source = serializers.CharField(max_length=250, allow_blank=True, required=False, default="")
    utm_medium = serializers.CharField(max_length=250, allow_blank=True, required=False, default="")
    utm_campaign = serializers.CharField(
        max_length=250, allow_blank=True, required=False, default=""
    )
    utm_term = serializers.CharField(max_length=250, allow_blank=True, required=False, default="")
    utm_content = serializers.CharField(
        max_length=250, allow_blank=True, required=False, default=""
    )
    attachment = AttachmentDescriptor(required=False)

    def validate_consent(self, value):
        if not value:
            raise serializers.ValidationError("Согласие обязательно.")
        return value


class WebsiteReceiptSerializer(serializers.Serializer):
    lead_id = serializers.UUIDField()
    website_request_id = serializers.UUIDField()
    attachment_complete = serializers.BooleanField()
    created = serializers.BooleanField(required=False)


class WebsiteMetadataSerializer(serializers.ModelSerializer):
    budget_label = serializers.SerializerMethodField()
    timeline_label = serializers.SerializerMethodField()
    has_attachment = serializers.SerializerMethodField()

    def get_budget_label(self, obj) -> str:
        return BUDGET_LABELS.get(obj.budget_range, obj.budget_range)

    def get_timeline_label(self, obj) -> str:
        return TIMELINE_LABELS.get(obj.timeline, obj.timeline)

    def get_has_attachment(self, obj) -> bool:
        return bool(obj.attachment_name and obj.attachment_complete)

    class Meta:
        model = WebsiteSubmission
        fields = [
            "request_id",
            "project_type",
            "budget_range",
            "budget_label",
            "timeline",
            "timeline_label",
            "locale",
            "original_contact",
            "referrer",
            "utm",
            "consent",
            "consent_version",
            "source_created_at",
            "has_attachment",
            "attachment_name",
            "attachment_size",
            "attachment_sha256",
            "attachment_parts",
            "attachment_complete",
        ]


class WebsiteServiceView(APIView):
    authentication_classes = [WebsiteAuthentication]
    permission_classes = [IsAuthenticated]
    throttle_classes = [WebsiteThrottle]


class WebsiteHealthView(WebsiteServiceView):
    @extend_schema(responses={200: dict})
    def get(self, request):
        WebsiteSubmission.objects.exists()  # Verify the intake migration is applied.
        return Response(
            {
                "status": "ok",
                "service": "deo-crm-website-ingest",
                "protocol_version": 1,
                "chunk_bytes": CHUNK_BYTES,
                "max_attachment_bytes": MAX_ATTACHMENT_BYTES,
                "stage_ready": LeadStage.objects.exists(),
            }
        )


def receipt(submission, created=None):
    if not submission.lead_id:
        raise RemovedSubmission()
    data = {
        "lead_id": str(submission.lead_id),
        "website_request_id": str(submission.pk),
        "attachment_complete": submission.attachment_complete,
    }
    if created is not None:
        data["created"] = created
    return data


def assigned_user():
    user_id = getattr(settings, "WEBSITE_LEAD_ASSIGNEE_ID", "").strip()
    if not user_id:
        return None
    try:
        user_id = UUID(user_id)
    except ValueError as exc:
        raise IntegrationUnavailable("Некорректный ответственный за заявки сайта.") from exc
    user = (
        get_user_model()
        .objects.filter(pk=user_id, is_active=True, role__name__in=MANAGER_ROLES)
        .first()
    )
    if user is None:
        raise IntegrationUnavailable("Ответственный за заявки сайта недоступен.")
    return user


def notify_managers(lead):
    from apps.notifications.models import Notification

    users = get_user_model().objects.filter(is_active=True, role__name__in=MANAGER_ROLES)
    if lead.assigned_to_id:
        users = users.filter(pk=lead.assigned_to_id)
    Notification.objects.bulk_create(
        [
            Notification(
                user=user,
                type="system",
                urgency="important",
                title="Новая заявка с сайта DEO CORE",
                message=f"{lead.contact_name}. Открыть карточку: /leads/{lead.pk}",
            )
            for user in users
        ]
    )


class WebsiteIntakeView(WebsiteServiceView):
    parser_classes = [BoundedJSONParser]

    @extend_schema(
        request=WebsiteIntakeSerializer,
        responses={201: WebsiteReceiptSerializer, 200: WebsiteReceiptSerializer},
    )
    def post(self, request):
        serializer = WebsiteIntakeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if request.headers.get("Idempotency-Key") != str(data["id"]):
            raise serializers.ValidationError(
                {"id": "Idempotency-Key должен совпадать с id заявки."}
            )
        digest = hashlib.sha256(
            json.dumps(data, cls=DjangoJSONEncoder, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        attachment = data.get("attachment", {})
        with transaction.atomic():
            submission, created = WebsiteSubmission.objects.get_or_create(
                request_id=data["id"],
                defaults={
                    "payload_digest": digest,
                    "project_type": data["project_type"],
                    "budget_range": data["budget"],
                    "timeline": data["timeline"],
                    "locale": data["locale"],
                    "original_contact": data["contact"],
                    "referrer": data["referrer"],
                    "utm": {
                        k: data[k]
                        for k in [
                            "utm_source",
                            "utm_medium",
                            "utm_campaign",
                            "utm_term",
                            "utm_content",
                        ]
                        if data[k]
                    },
                    "consent": data["consent"],
                    "consent_version": data["consent_version"],
                    "source_created_at": data["created_at"],
                    "attachment_name": attachment.get("name", ""),
                    "attachment_size": attachment.get("size", 0),
                    "attachment_sha256": attachment.get("sha256", ""),
                    "attachment_parts": attachment.get("parts", 0),
                    "attachment_complete": not bool(attachment),
                },
            )
            submission = WebsiteSubmission.objects.select_for_update().get(pk=submission.pk)
            if not created:
                if submission.payload_digest != digest:
                    raise Conflict("Заявка с этим UUID уже получена с другими данными.")
                return Response(receipt(submission, False))
            stage = LeadStage.objects.order_by("order", "pk").first()
            if stage is None:
                raise IntegrationUnavailable("Настройте этапы воронки CRM перед приёмом заявок.")
            contact = data["contact"].strip()
            phone = normalize_phone(contact) if re.fullmatch(r"[+\d\s().-]+", contact) else ""
            if not 6 <= len(phone) <= 15:
                phone = ""
            telegram = contact[:100] if re.fullmatch(r"@[A-Za-z0-9_]{1,99}", contact) else ""
            notes = [
                "Заявка с сайта DEO CORE",
                f"Тип проекта: {data['project_type']}",
                f"Бюджет: {BUDGET_LABELS[data['budget']]}",
                f"Срок: {TIMELINE_LABELS[data['timeline']]}",
                f"Контакт: {contact or data['email']}",
                f"Язык: {data['locale']}",
                "",
                data["description"],
                "",
                f"ID заявки сайта: {data['id']}",
            ]
            if data["referrer"]:
                notes.append(f"Referrer: {data['referrer']}")
            notes.extend(f"{key}: {value}" for key, value in submission.utm.items())
            lead = Lead.objects.create(
                contact_name=data["name"],
                company_name=data["company"],
                phone=phone,
                email=data["email"],
                telegram=telegram,
                source="website",
                budget=None,
                current_stage=stage,
                assigned_to=assigned_user(),
                business_need=data["description"],
                brief_completed=True,
                next_action="Связаться с заявителем сайта",
                notes="\n".join(notes),
            )
            submission.lead = lead
            submission.save(update_fields=["lead"])
            LeadHistory.objects.create(
                lead=lead, to_stage=stage, notes="Заявка получена с сайта DEO CORE."
            )
            notify_managers(lead)
        return Response(receipt(submission, True), status=status.HTTP_201_CREATED)


def validate_complete_attachment(submission, chunks):
    content = b"".join(bytes(chunk.content) for chunk in chunks)
    if (
        len(content) != submission.attachment_size
        or hashlib.sha256(content).hexdigest() != submission.attachment_sha256
    ):
        raise Conflict("Контрольная сумма вложения не совпадает.")
    extension = PurePosixPath(submission.attachment_name).suffix.lower()
    if extension == ".pdf" and not content.startswith(b"%PDF-"):
        raise serializers.ValidationError("Некорректное PDF-вложение.")
    if extension == ".txt":
        try:
            content.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise serializers.ValidationError("TXT должен быть в UTF-8.") from exc
        if b"\x00" in content:
            raise serializers.ValidationError("Некорректное текстовое вложение.")
    if extension == ".docx":
        try:
            with ZipFile(io.BytesIO(content)) as archive:
                names = archive.namelist()
                if not {"[Content_Types].xml", "word/document.xml"}.issubset(names) or any(
                    name.lower().endswith("vbaproject.bin") for name in names
                ):
                    raise serializers.ValidationError("Некорректное DOCX-вложение.")
        except BadZipFile as exc:
            raise serializers.ValidationError("Некорректное DOCX-вложение.") from exc


class WebsiteChunkView(WebsiteServiceView):
    parser_classes = [ChunkParser]

    @extend_schema(
        request={"application/octet-stream": {"type": "string", "format": "binary"}},
        responses=WebsiteReceiptSerializer,
    )
    def post(self, request, request_id, index):
        if request.headers.get("Idempotency-Key") != str(request_id):
            raise serializers.ValidationError("Некорректный Idempotency-Key.")
        content = request.data
        with transaction.atomic():
            submission = get_object_or_404(
                WebsiteSubmission.objects.select_for_update(), pk=request_id
            )
            if not submission.lead_id:
                raise RemovedSubmission()
            if index >= submission.attachment_parts:
                raise serializers.ValidationError("Номер части вне диапазона.")
            expected = min(CHUNK_BYTES, submission.attachment_size - index * CHUNK_BYTES)
            if len(content) != expected:
                raise serializers.ValidationError("Некорректный размер части.")
            digest = hashlib.sha256(content).hexdigest()
            chunk, created = WebsiteAttachmentChunk.objects.get_or_create(
                submission=submission, index=index, defaults={"content": content, "sha256": digest}
            )
            if not created and chunk.sha256 != digest:
                raise Conflict("Эта часть уже получена с другим содержимым.")
            if not submission.attachment_complete:
                chunks = list(submission.chunks.order_by("index"))
                if len(chunks) == submission.attachment_parts:
                    validate_complete_attachment(submission, chunks)
                    submission.attachment_complete = True
                    submission.save(update_fields=["attachment_complete"])
        return Response(receipt(submission))


class WebsiteAttachmentView(APIView):
    permission_classes = [IsAuthenticated, IsProjectManager]

    @extend_schema(responses={"200": {"type": "string", "format": "binary"}})
    def get(self, request, pk):
        submission = get_object_or_404(WebsiteSubmission, lead_id=pk, attachment_complete=True)
        try:
            index = int(request.query_params.get("part", "0"))
        except ValueError as exc:
            raise serializers.ValidationError("Некорректный номер части.") from exc
        chunk = get_object_or_404(WebsiteAttachmentChunk, submission=submission, index=index)
        response = HttpResponse(bytes(chunk.content), content_type="application/octet-stream")
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response
