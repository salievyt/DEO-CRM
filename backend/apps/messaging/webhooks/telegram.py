"""Telegram Bot API webhook (aiogram).

Public endpoint (no authentication) protected by:
  * per-bot URL (``/webhooks/telegram/<bot_username>/`` — Telegram requires a
    unique webhook URL per bot),
  * ``X-Telegram-Bot-Api-Secret-Token`` header check when the account has a
    secret configured (set automatically via ``setWebhook``),
  * IP rate limiting.

Inbound updates are handed to the aiogram ``Dispatcher``
(``services.telegram_bot.feed_update``); the registered message handler writes
into the CRM. Processing is idempotent: messages are keyed on
``tg:{bot_username}:{message_id}``.
"""
import logging
import secrets

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from pydantic import ValidationError
from rest_framework import status as http_status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

try:
    from django_ratelimit.decorators import ratelimit

    _HAS_RATELIMIT = True
except ImportError:  # pragma: no cover - optional dependency
    _HAS_RATELIMIT = False

    def ratelimit(*args, **kwargs):
        def decorator(func):
            return func

        return decorator

from ..logging import log_event
from ..models import TelegramAccount
from ..services.telegram_bot import feed_update

logger = logging.getLogger("messaging.telegram")


@method_decorator(csrf_exempt, name="dispatch")
@method_decorator(
    ratelimit(key="ip", rate="300/m", method="ALL", block=False),
    name="dispatch",
)
class TelegramWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    # ----------------------------------------------------------------- POST
    def post(self, request, username=None):
        if getattr(request, "ratelimited", False):
            return Response(
                {"error": "Слишком много запросов. Попробуйте позже."},
                status=http_status.HTTP_429_TOO_MANY_REQUESTS,
            )

        account = TelegramAccount.objects.filter(
            bot_username=username or ""
        ).first()
        if account is None:
            log_event("telegram.webhook.unknown_bot", level=logging.WARNING,
                      username=username or "")
            return Response({"ok": True})  # acknowledge; nothing to do

        if not self._verify_secret(request, account):
            log_event("telegram.webhook.invalid_secret", level=logging.WARNING,
                      username=username or "")
            return Response(
                {"error": "Invalid secret token"}, status=http_status.HTTP_403_FORBIDDEN
            )

        try:
            update = request.data
        except Exception as exc:
            log_event("telegram.webhook.invalid_payload", level=logging.WARNING,
                      error=str(exc))
            return Response({"error": "Invalid payload"}, status=400)

        if not isinstance(update, dict):
            return Response({"error": "Invalid payload"}, status=400)

        log_event("telegram.webhook.received", update_id=update.get("update_id"),
                  username=username or "")

        try:
            feed_update(account, update)
        except ValidationError as exc:
            # Malformed update that aiogram cannot parse — acknowledge so
            # Telegram does not retry a payload that will never succeed.
            log_event("telegram.webhook.invalid_payload", level=logging.WARNING,
                      error=str(exc), username=username or "")
        except Exception as exc:  # noqa: BLE001
            # Transient failure (DB, network...) — return 5xx so Telegram
            # retries. Processing is idempotent, so retries are deduplicated.
            log_event("telegram.webhook.processing_error", level=logging.ERROR,
                      error=str(exc), username=username or "")
            return Response(
                {"error": "Internal error"},
                status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"ok": True})

    # -------------------------------------------------------------- security
    def _verify_secret(self, request, account) -> bool:
        if not account.webhook_secret:
            # Webhook was configured outside the CRM (no secret stored) —
            # accept and rely on the unique URL + rate limiting.
            return True
        header = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        return bool(header) and secrets.compare_digest(header, account.webhook_secret)
