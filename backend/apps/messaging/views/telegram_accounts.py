import secrets

from django.conf import settings
from django.shortcuts import get_object_or_404
from django.urls import reverse
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsOwner

from ..models import TelegramAccount
from ..permissions import IsInboxStaff
from ..serializers import TelegramAccountSerializer
from ..services.base import MessagingServiceError
from ..services.telegram import TelegramService


class TelegramAccountListView(generics.ListAPIView):
    """List connected Telegram bots (no tokens in output)."""

    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]
    queryset = TelegramAccount.objects.all()
    serializer_class = TelegramAccountSerializer


class TelegramAccountCreateView(generics.CreateAPIView):
    """Create a Telegram bot account (owner/superadmin only; token is write-only)."""

    permission_classes = [permissions.IsAuthenticated, IsOwner]
    queryset = TelegramAccount.objects.all()
    serializer_class = TelegramAccountSerializer

    def perform_create(self, serializer):
        account = serializer.save()
        # Best-effort enrichment with getMe so the card shows the real bot name
        # and username right after creation (never blocks the request).
        self._enrich_from_getme(account)

    @staticmethod
    def _enrich_from_getme(account):
        try:
            info = TelegramService(account).test_connection()
        except MessagingServiceError:
            return
        username = (info.get("bot_username") or "").strip()
        bot_name = (info.get("bot_name") or "").strip()
        if username or bot_name:
            fields = ["updated_at"]
            if username and not account.bot_username:
                account.bot_username = username
                fields.append("bot_username")
            if bot_name and not account.bot_name:
                account.bot_name = bot_name
                fields.append("bot_name")
            if len(fields) > 1:
                account.save(update_fields=fields)


class TelegramAccountDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get/update/delete a Telegram bot (owner/superadmin only)."""

    permission_classes = [permissions.IsAuthenticated, IsOwner]
    queryset = TelegramAccount.objects.all()
    serializer_class = TelegramAccountSerializer


class TelegramAccountTestView(APIView):
    """Validate a bot token against the Bot API (getMe).

    POST with ``pk`` tests a saved bot; without ``pk`` tests draft credentials
    from the request body (nothing is saved). Owner/superadmin only.
    """

    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def post(self, request, pk=None):
        if pk:
            account = get_object_or_404(TelegramAccount, pk=pk)
        else:
            token = (request.data.get("bot_token") or "").strip()
            if not token:
                return Response(
                    {"ok": False, "error": "Укажите bot token для проверки"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            account = TelegramAccount(name="draft")
            account.set_bot_token(token)

        try:
            result = TelegramService(account).test_connection()
        except MessagingServiceError as exc:
            return Response(
                {"ok": False, "error": exc.user_message, "code": exc.code},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response(result)


class TelegramAccountWebhookView(APIView):
    """Manage the bot's webhook.

    POST — point the bot at our webhook endpoint (generates a secret token and
    stores it on the account). GET — current webhook state from the Bot API.
    Owner/superadmin only.
    """

    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def _get_bot_info(self, account: TelegramAccount) -> tuple[str, str]:
        """Return (bot_username, bot_name) — a single getMe call."""
        username = account.bot_username.strip()
        bot_name = account.bot_name.strip()
        if username and bot_name:
            return username, bot_name
        try:
            info = TelegramService(account).test_connection()
        except MessagingServiceError:
            return username, bot_name
        return (
            username or (info.get("bot_username") or "").strip(),
            bot_name or (info.get("bot_name") or "").strip(),
        )

    def _webhook_url(self, request, username: str) -> str:
        base = getattr(settings, "TELEGRAM_WEBHOOK_BASE_URL", "").rstrip("/")
        path = reverse("telegram-webhook", kwargs={"username": username})
        if base:
            return f"{base}{path}"
        return request.build_absolute_uri(path)

    def post(self, request, pk):
        account = get_object_or_404(TelegramAccount, pk=pk)
        if not account.bot_token:
            return Response(
                {"ok": False, "error": "У бота не настроен bot token"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        username, bot_name = self._get_bot_info(account)
        if not username:
            return Response(
                {"ok": False, "error": "Не удалось определить username бота. Проверьте токен."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        url = self._webhook_url(request, username)
        secret = secrets.token_urlsafe(32)
        try:
            TelegramService(account).set_webhook(url, secret)
        except MessagingServiceError as exc:
            return Response(
                {"ok": False, "error": exc.user_message, "code": exc.code},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        account.webhook_secret = secret
        account.bot_username = username
        account.save(update_fields=["webhook_secret", "bot_username", "bot_name", "updated_at"])
        return Response({"ok": True, "url": url, "username": username})

    def get(self, request, pk):
        account = get_object_or_404(TelegramAccount, pk=pk)
        try:
            info = TelegramService(account).get_webhook_info()
        except MessagingServiceError as exc:
            return Response(
                {"ok": False, "error": exc.user_message, "code": exc.code},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response({
            "ok": True,
            "url": info.get("url", ""),
            "pending_update_count": info.get("pending_update_count", 0),
            "last_error_message": info.get("last_error_message", ""),
            "last_error_date": info.get("last_error_date"),
        })
