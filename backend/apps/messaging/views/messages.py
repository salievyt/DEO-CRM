import mimetypes
import uuid

import requests
from django.conf import settings
from django.http import StreamingHttpResponse
from django.utils.decorators import method_decorator
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ..logging import audit_log, log_event
from ..models import Conversation, Message
from ..models.enums import Direction, MessageStatus, MessageType
from ..permissions import IsInboxStaff
from ..ratelimit import is_ratelimited, method_ratelimit
from ..serializers import MessageSerializer, SendMessageSerializer
from ..services.base import (
    MessagingServiceError,
    TemplateRequiredError,
)
from ..services.conversations import (
    conversation_serialized,
    message_serialized,
    record_outgoing_message,
)
from ..services.realtime import notify
from ..services.whatsapp import WhatsAppService

_MEDIA_MAP = {
    "image": MessageType.IMAGE,
    "document": MessageType.DOCUMENT,
    "audio": MessageType.AUDIO,
    "video": MessageType.VIDEO,
}


def _media_type_for(mime: str) -> str:
    if not mime:
        return "document"
    if mime.startswith("image/"):
        return "image"
    if mime.startswith("video/"):
        return "video"
    if mime.startswith("audio/"):
        return "audio"
    return "document"


def _store_media(file) -> str:
    """Store an uploaded file (S3 in prod, local media root in dev) → URL."""
    from django.core.files.storage import default_storage

    name = getattr(file, "name", "") or "file"
    ext = mimetypes.guess_extension(getattr(file, "content_type", "") or "") or ""
    stored_name = default_storage.save(f"messaging/{uuid.uuid4().hex}{ext}", file)
    return default_storage.url(stored_name)


@method_decorator(
    method_ratelimit(key="user", rate="120/m", method="POST"),
    name="dispatch",
)
class MessageListCreateView(generics.ListCreateAPIView):
    """GET — messages of a conversation (newest-last); POST — send a message."""

    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]

    def get_serializer_class(self):
        return MessageSerializer

    def get_queryset(self):
        qs = Message.objects.filter(
            conversation_id=self.kwargs["conversation_pk"]
        ).select_related("sender", "contact")
        before = self.request.query_params.get("before")
        if before:
            from django.utils.dateparse import parse_datetime

            dt = parse_datetime(before)
            if dt:
                qs = qs.filter(created_at__lt=dt)
        return qs.order_by("created_at")

    # -------------------------------------------------------------- sending
    def create(self, request, *args, **kwargs):
        if is_ratelimited(request):
            return Response(
                {"error": "Слишком много запросов. Попробуйте позже."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        conversation = Conversation.objects.filter(
            pk=self.kwargs["conversation_pk"]
        ).first()
        if not conversation:
            return Response({"error": "Диалог не найден"}, status=404)

        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            message = self._create_pending_message(conversation, data, request.user)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = self._dispatch_send(conversation, message, data)
            message.external_message_id = result.get("external_message_id", "")
            message.status = MessageStatus.SENT
            message.save(update_fields=["external_message_id", "status", "updated_at"])
            record_outgoing_message(message, message.text or message.media_name)
            log_event("whatsapp.message.sent", direction="outgoing",
                      type=message.type, conversation_id=str(conversation.id))
            audit_log(request.user, "message.send", "messaging_message",
                      message.id, {"conversation_id": str(conversation.id),
                                   "type": message.type})
            notify(conversation, "message.created", message_serialized(message))
            return Response({
                "message": MessageSerializer(message).data,
                "sent": True,
                "error": None,
            }, status=status.HTTP_201_CREATED)
        except TemplateRequiredError as exc:
            message.status = MessageStatus.FAILED
            message.error_code = "template_required"
            message.error_message = exc.user_message
            message.save(update_fields=["status", "error_code", "error_message", "updated_at"])
            notify(conversation, "message.status.updated", message_serialized(message))
            return self._error_response(
                message, exc, templates=self._templates_for(conversation)
            )
        except MessagingServiceError as exc:
            message.status = MessageStatus.FAILED
            message.error_code = exc.code
            message.error_message = exc.user_message
            message.save(update_fields=["status", "error_code", "error_message", "updated_at"])
            import logging as _logging

            log_event("whatsapp.message.failed", level=_logging.WARNING, direction="outgoing",
                      code=exc.code, conversation_id=str(conversation.id))
            notify(conversation, "message.status.updated", message_serialized(message))
            return self._error_response(message, exc)

    # ------------------------------------------------------------- helpers
    def _create_pending_message(self, conversation, data, user) -> Message:
        media = data.get("media")
        if media is not None:
            max_bytes = getattr(settings, "WHATSAPP_MAX_MEDIA_SIZE_MB", 16) * 1024 * 1024
            if media.size > max_bytes:
                raise ValueError("Файл превышает максимальный размер (16 МБ)")
            media_url = _store_media(media)
            mime = getattr(media, "content_type", "") or ""
            msg_type = _MEDIA_MAP.get(_media_type_for(mime), MessageType.DOCUMENT)
            return Message.objects.create(
                conversation=conversation,
                contact=conversation.contact,
                channel=conversation.channel,
                direction=Direction.OUTGOING,
                type=msg_type,
                text=(data.get("text") or "").strip(),
                media_url=media_url,
                media_name=data.get("filename") or (getattr(media, "name", "") or ""),
                media_mime=mime,
                sender=user,
            )
        if data.get("template"):
            tpl = data["template"]
            return Message.objects.create(
                conversation=conversation,
                contact=conversation.contact,
                channel=conversation.channel,
                direction=Direction.OUTGOING,
                type=MessageType.TEMPLATE,
                text=(data.get("text") or "").strip(),
                metadata={"template": {"name": tpl["name"], "language": tpl["language"]}},
                sender=user,
            )
        return Message.objects.create(
            conversation=conversation,
            contact=conversation.contact,
            channel=conversation.channel,
            direction=Direction.OUTGOING,
            type=MessageType.TEXT,
            text=(data.get("text") or "").strip(),
            media_url=data.get("media_url") or "",
            sender=user,
        )

    def _dispatch_send(self, conversation, message, data) -> dict:
        if conversation.channel != "whatsapp":
            raise MessagingServiceError(
                f"Канал «{conversation.get_channel_display()}» пока не подключён.",
                code="channel_not_configured",
            )
        account = conversation.whatsapp_account
        if account is None:
            from ..models import WhatsAppAccount

            account = WhatsAppAccount.get_default()
        if account is None:
            raise MessagingServiceError(
                "WhatsApp аккаунт не настроен. Обратитесь к администратору.",
                code="no_whatsapp_account",
            )

        service = WhatsAppService(account)
        to = conversation.contact.phone

        if data.get("template"):
            tpl = data["template"]
            return service.send_template_message(
                to, tpl["name"], tpl["language"],
                parameters=tpl.get("parameters") or [],
            )
        if message.media_url:
            media_type = _media_type_for(message.media_mime)
            return service.send_media(
                to, media_type, message.media_url,
                caption=message.text or None,
                filename=message.media_name or None,
            )
        return service.send_text_message(to, message.text)

    @staticmethod
    def _templates_for(conversation) -> list:
        from ..services.templates import get_cached_templates

        account = conversation.whatsapp_account
        if account is None:
            from ..models import WhatsAppAccount

            account = WhatsAppAccount.get_default()
        if account is None:
            return []
        try:
            return get_cached_templates(account)
        except MessagingServiceError:
            return []

    @staticmethod
    def _error_response(message, exc, templates=None) -> Response:
        return Response({
            "message": MessageSerializer(message).data,
            "sent": False,
            "error": {
                "code": exc.code,
                "message": exc.user_message,
                "template_required": isinstance(exc, TemplateRequiredError),
                "templates": templates or [],
            },
        }, status=status.HTTP_200_OK)


class MessageMediaView(APIView):
    """Proxy incoming WhatsApp media through the backend (token stays server-side)."""

    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]

    def get(self, request, pk):
        message = Message.objects.select_related("conversation__whatsapp_account").filter(
            pk=pk, direction=Direction.INCOMING
        ).first()
        if not message:
            return Response({"error": "Сообщение не найдено"}, status=404)

        media_id = message.metadata.get("media_id")
        if not media_id:
            return Response({"error": "Медиа недоступно"}, status=404)

        account = message.conversation.whatsapp_account
        if account is None:
            from ..models import WhatsAppAccount

            account = WhatsAppAccount.from_env()
        if account is None:
            return Response({"error": "WhatsApp аккаунт не настроен"}, status=400)

        try:
            info = WhatsAppService(account).get_media_url(media_id)
        except MessagingServiceError as exc:
            return Response({"error": exc.user_message}, status=502)

        if not info.get("url"):
            return Response({"error": "Медиа недоступно"}, status=404)

        upstream = requests.get(info["url"], stream=True, timeout=30)
        if upstream.status_code != 200:
            return Response({"error": "Не удалось загрузить медиа"}, status=502)

        content_type = message.media_mime or info.get("mime_type") or "application/octet-stream"
        filename = message.media_name or f"whatsapp-media-{message.id}.bin"
        response = StreamingHttpResponse(
            upstream.iter_content(chunk_size=64 * 1024),
            content_type=content_type,
        )
        if content_type.startswith("image/"):
            response["Content-Disposition"] = f'inline; filename="{filename}"'
        else:
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
        response["Content-Length"] = str(info.get("file_size") or "")
        return response


class MessagingUnreadCountView(APIView):
    """Total unread count across conversations visible to the current user."""

    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]

    def get(self, request):
        total = sum(
            Conversation.objects.filter(
                assigned_user=request.user
            ).values_list("unread_count", flat=True)
        )
        # Unassigned conversations are visible to every inbox staff member.
        total += sum(
            Conversation.objects.filter(assigned_user__isnull=True)
            .values_list("unread_count", flat=True)
        )
        return Response({"total_unread": total})
