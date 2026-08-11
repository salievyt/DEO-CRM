"""WhatsApp Cloud API webhook.

Public endpoint (no authentication) protected by:
  * Meta webhook verification on GET,
  * optional ``X-Hub-Signature-256`` HMAC on POST when
    ``WHATSAPP_WEBHOOK_APP_SECRET`` is configured,
  * IP rate limiting.

Processing is idempotent: inbound messages are keyed on
``external_message_id``, status updates never downgrade a message status.
"""
import hashlib
import hmac
import logging

from django.conf import settings
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status as http_status

try:
    from django_ratelimit.decorators import ratelimit

    _HAS_RATELIMIT = True
except ImportError:  # pragma: no cover - optional dependency
    _HAS_RATELIMIT = False

    def ratelimit(*args, **kwargs):
        def decorator(func):
            return func

        return decorator
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ..logging import log_event
from ..models import Message, WhatsAppAccount
from ..models.enums import (
    Channel,
    Direction,
    MessageStatus,
    MessageType,
)
from ..services.conversations import (
    conversation_serialized,
    find_or_create_conversation,
    get_or_create_client,
    message_serialized,
    record_incoming_message,
)
from ..services.realtime import notify

logger = logging.getLogger("messaging.whatsapp")

STATUS_PRIORITY = {
    MessageStatus.PENDING: 1,
    MessageStatus.SENT: 2,
    MessageStatus.DELIVERED: 3,
    MessageStatus.READ: 4,
    MessageStatus.FAILED: 5,
}


@method_decorator(csrf_exempt, name="dispatch")
@method_decorator(
    ratelimit(key="ip", rate="300/m", method="ALL", block=False),
    name="dispatch",
)
class WhatsAppWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    # ------------------------------------------------------------------ GET
    def get(self, request):
        """Meta subscription verification."""
        mode = request.query_params.get("hub.mode")
        token = request.query_params.get("hub.verify_token")
        challenge = request.query_params.get("hub.challenge")

        if mode == "subscribe" and self._verify_token(token):
            log_event("whatsapp.webhook.verified", ip=request.META.get("REMOTE_ADDR", ""))
            return HttpResponse(challenge, content_type="text/plain", status=200)
        log_event("whatsapp.webhook.verification_failed", level=logging.WARNING)
        return HttpResponse("Verification failed", status=403)

    def _verify_token(self, token) -> bool:
        if not token:
            return False
        if settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN and token == settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN:
            return True
        return WhatsAppAccount.objects.filter(
            webhook_verify_token=token, status="active"
        ).exists()

    # ----------------------------------------------------------------- POST
    def post(self, request):
        if getattr(request, "ratelimited", False):
            return Response(
                {"error": "Слишком много запросов. Попробуйте позже."},
                status=http_status.HTTP_429_TOO_MANY_REQUESTS,
            )
        if not self._verify_signature(request):
            log_event("whatsapp.webhook.invalid_signature", level=logging.WARNING)
            return Response(
                {"error": "Invalid signature"}, status=http_status.HTTP_403_FORBIDDEN
            )

        try:
            payload = request.data
        except Exception as exc:
            log_event("whatsapp.webhook.invalid_payload", level=logging.WARNING,
                      error=str(exc))
            return Response({"error": "Invalid payload"}, status=400)

        if not isinstance(payload, dict):
            return Response({"error": "Invalid payload"}, status=400)

        log_event("whatsapp.webhook.received",
                  entries=len(payload.get("entry", []) or []))

        for entry in payload.get("entry", []) or []:
            for change in entry.get("changes", []) or []:
                # Unknown / unrelated event types (e.g. template status updates,
                # account updates) are acknowledged and ignored.
                if change.get("field") != "messages":
                    continue

                value = change.get("value") or {}
                if value.get("messaging_product") != "whatsapp":
                    continue

                account = self._find_account(value)
                if account is None:
                    log_event("whatsapp.webhook.unknown_account",
                              level=logging.WARNING,
                              phone_number_id=(
                                  (value.get("metadata") or {}).get("phone_number_id", "")
                              ))
                    continue

                for msg in value.get("messages", []) or []:
                    self._process_incoming_message(account, value, msg)
                for st in value.get("statuses", []) or []:
                    self._process_status(account, st)

        return Response({"status": "ok"})

    # ------------------------------------------------------------ signature
    def _verify_signature(self, request) -> bool:
        app_secret = getattr(settings, "WHATSAPP_WEBHOOK_APP_SECRET", "")
        if not app_secret:
            # Signature enforcement is optional: if the secret is not configured
            # the endpoint is still protected by the verify token (GET) and IP
            # rate limiting. Production is strongly advised to set the secret.
            # Log once per process (cache-backed) to avoid log spam.
            from django.core.cache import cache

            if cache.add("whatsapp_signature_disabled_logged", True, 3600):
                log_event("whatsapp.webhook.signature_disabled", level=logging.WARNING)
            return True
        header = request.headers.get("X-Hub-Signature-256", "")
        if not header.startswith("sha256="):
            return False
        digest = hmac.new(
            app_secret.encode("utf-8"), request.body, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(header[7:], digest)

    # ------------------------------------------------------------- account
    def _find_account(self, value):
        metadata = value.get("metadata") or {}
        phone_number_id = metadata.get("phone_number_id") or ""
        display_phone = metadata.get("display_phone_number") or ""

        account = None
        if phone_number_id:
            account = WhatsAppAccount.objects.filter(
                phone_number_id=phone_number_id
            ).first()
        if account is None and display_phone:
            account = WhatsAppAccount.objects.filter(
                display_phone_number=display_phone
            ).first()
        if account is None and phone_number_id == settings.WHATSAPP_PHONE_NUMBER_ID:
            # Environment-configured account: persist it once so conversations
            # can reference a real DB row.
            env_account = WhatsAppAccount.from_env()
            if env_account is not None:
                account, _ = WhatsAppAccount.objects.get_or_create(
                    phone_number_id=phone_number_id,
                    defaults={
                        "name": "Default (env)",
                        "business_account_id": env_account.business_account_id or "",
                        "display_phone_number": env_account.display_phone_number or "",
                        "webhook_verify_token": env_account.webhook_verify_token or "",
                        "status": "active",
                        "is_default": True,
                    },
                )
                if not account.access_token_encrypted:
                    account.set_access_token(settings.WHATSAPP_ACCESS_TOKEN)
                    account.save(update_fields=["access_token_encrypted"])
        return account

    # ------------------------------------------------------------ messages
    def _process_incoming_message(self, account, value, msg):
        wa_id = msg.get("from")
        if not wa_id:
            log_event("whatsapp.webhook.message_without_sender",
                      level=logging.WARNING)
            return

        if msg.get("errors"):
            for err in msg["errors"]:
                log_event("whatsapp.message.failed", level=logging.WARNING,
                          code=err.get("code"), message=err.get("message", ""))

        contacts = value.get("contacts") or []
        profile_name = (contacts[0].get("profile") or {}).get("name", "") if contacts else ""

        client = get_or_create_client(wa_id, profile_name)
        conversation = find_or_create_conversation(account, client, Channel.WHATSAPP)

        external_id = msg.get("id", "")
        msg_type = self._map_message_type(msg)
        text, media, metadata = self._extract_message_payload(msg, msg_type)

        message, created = Message.objects.get_or_create(
            external_message_id=external_id,
            defaults={
                "conversation": conversation,
                "contact": client,
                "channel": Channel.WHATSAPP,
                "direction": Direction.INCOMING,
                "type": msg_type,
                "text": text,
                "media_url": media.get("media_url", ""),
                "media_name": media.get("media_name", ""),
                "media_mime": media.get("media_mime", ""),
                "metadata": metadata,
                "status": MessageStatus.SENT,  # inbound is "received" by nature
            },
        )

        if created:
            preview = text or media.get("media_name") or conversation.get_channel_display()
            record_incoming_message(message, preview)
            log_event("whatsapp.message.received", direction="incoming",
                      type=msg_type, conversation_id=str(conversation.id))
            notify(conversation, "message.created", message_serialized(message))
            notify(conversation, "conversation.updated",
                   conversation_serialized(conversation))
            self._run_scenarios(message)
        # else: duplicate webhook delivery — already processed, no-op.
    def _run_scenarios(self, message) -> None:
        """Trigger keyword auto-responses for a freshly stored inbound message."""
        try:
            from apps.scenarios.services import maybe_auto_respond

            maybe_auto_respond(message)
        except Exception:  # noqa: BLE001 - automation must never break the webhook
            log_event("scenarios.processor_error", level=logging.ERROR,
                      conversation_id=str(message.conversation_id))

    @staticmethod
    def _map_message_type(msg) -> str:
        t = msg.get("type", "text")
        mapping = {
            "text": MessageType.TEXT,
            "image": MessageType.IMAGE,
            "document": MessageType.DOCUMENT,
            "audio": MessageType.AUDIO,
            "video": MessageType.VIDEO,
            "sticker": MessageType.STICKER,
            "location": MessageType.LOCATION,
            "contacts": MessageType.CONTACT,
            "button": MessageType.TEXT,
            "interactive": MessageType.TEXT,
        }
        return mapping.get(t, MessageType.SYSTEM)

    @staticmethod
    def _extract_message_payload(msg, msg_type):
        """Return (text, media_dict, metadata) from a raw WhatsApp message."""
        text = ""
        media = {"media_url": "", "media_name": "", "media_mime": ""}
        metadata: dict = {"raw_type": msg.get("type", "")}

        if msg_type == MessageType.TEXT:
            text = (msg.get("text") or {}).get("body", "")
            if not text:
                # Quick-reply button / interactive replies carry the text here.
                interactive = msg.get("interactive") or {}
                text = (
                    (msg.get("button") or {}).get("text", "")
                    or (interactive.get("button_reply") or {}).get("title", "")
                    or (interactive.get("list_reply") or {}).get("title", "")
                )
        elif msg_type in (MessageType.IMAGE, MessageType.DOCUMENT,
                          MessageType.AUDIO, MessageType.VIDEO, MessageType.STICKER):
            part = msg.get(msg.get("type")) or {}
            media = {
                "media_url": "",  # resolved via media proxy on demand
                "media_name": part.get("filename") or part.get("caption") or "",
                "media_mime": part.get("mime_type", ""),
            }
            metadata["media_id"] = part.get("id", "")
            metadata["caption"] = part.get("caption", "")
            metadata["file_size"] = part.get("file_size")
            text = part.get("caption", "")
        elif msg_type == MessageType.LOCATION:
            loc = msg.get("location") or {}
            metadata.update({
                "latitude": loc.get("latitude"),
                "longitude": loc.get("longitude"),
                "name": loc.get("name", ""),
                "address": loc.get("address", ""),
            })
            text = f"📍 {loc.get('name', '')} {loc.get('address', '')}".strip()
        elif msg_type == MessageType.CONTACT:
            metadata["contacts"] = msg.get("contacts", [])

        return text, media, metadata

    # ------------------------------------------------------------- statuses
    def _process_status(self, account, st):
        external_id = st.get("id", "")
        new_status = st.get("status", "")
        if not external_id or new_status not in MessageStatus.values:
            return

        message = Message.objects.filter(external_message_id=external_id).first()
        if message is None:
            # Status for a message we don't know (e.g. sent before the
            # integration or duplicate delivery) — ignore idempotently.
            log_event("whatsapp.status.unknown_message", level=logging.DEBUG,
                      external_message_id=external_id)
            return

        if not self._should_apply_status(message.status, new_status):
            return

        fields = ["status", "updated_at"]
        if new_status == MessageStatus.FAILED:
            errors = st.get("errors") or []
            error = errors[0] if errors else {}
            message.error_code = str(error.get("code", "unknown"))
            message.error_message = error.get("message", "Ошибка доставки")
            message.metadata["errors"] = errors
            fields += ["error_code", "error_message", "metadata"]
            log_event("whatsapp.message.failed", level=logging.WARNING,
                      conversation_id=str(message.conversation_id),
                      code=message.error_code)
        elif new_status == MessageStatus.READ:
            log_event("whatsapp.message.read", conversation_id=str(message.conversation_id))
        elif new_status == MessageStatus.DELIVERED:
            log_event("whatsapp.message.delivered", conversation_id=str(message.conversation_id))

        message.status = new_status
        message.save(update_fields=fields)

        notify(message.conversation, "message.status.updated", message_serialized(message))

    @staticmethod
    def _should_apply_status(current: str, new: str) -> bool:
        """Never downgrade: read > delivered > sent > pending; failed is final."""
        if new == MessageStatus.FAILED:
            # A read message must not be flipped back to failed.
            return current not in (MessageStatus.READ, MessageStatus.FAILED)
        return STATUS_PRIORITY.get(new, 0) > STATUS_PRIORITY.get(current, 0)
