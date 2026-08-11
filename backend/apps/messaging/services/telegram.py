"""Telegram Bot API client built on aiogram.

Every Bot API interaction lives in this module and goes through
:class:`TelegramService`. aiogram is async, so each call is executed in a
fresh event loop via ``asyncio.run`` with a dedicated ``Bot`` instance whose
aiohttp session is closed afterwards (sessions are bound to their loop).
Views and webhooks never touch aiogram directly.
"""
import asyncio
import logging

from aiogram import Bot
from aiogram.exceptions import (
    TelegramAPIError,
    TelegramNetworkError,
    TelegramRetryAfter,
    TelegramServerError,
    TelegramUnauthorizedError,
)
from django.conf import settings

from ..logging import log_event
from .base import (
    BaseMessagingService,
    InvalidTokenError,
    PermanentMessagingError,
    TemporaryMessagingError,
)

logger = logging.getLogger("messaging.telegram")

TELEGRAM_API_BASE = "https://api.telegram.org"

# aiogram Bad Request descriptions → human-readable RU messages.
FRIENDLY_ERRORS = {
    "chat not found": "Клиент не найден в Telegram — возможно, он ещё не написал боту.",
    "message is too long": "Сообщение слишком длинное для Telegram (максимум 4096 символов).",
    "can't parse entities": "Не удалось разобрать форматирование сообщения.",
    "user is deactivated": "Пользователь отключил бота.",
    "bot was blocked by the user": "Пользователь заблокировал бота.",
    "bot can't initiate conversation": "Бот не может начать диалог — клиент должен сначала написать боту.",
    "wrong file identifier": "Файл недоступен или устарел.",
    "file is too big": "Файл слишком большой для Telegram.",
}


def _friendly_message(error_text: str) -> str:
    lowered = (error_text or "").lower()
    for key, message in FRIENDLY_ERRORS.items():
        if key in lowered:
            return message
    return error_text or "Ошибка Telegram API"

# aiogram Bot methods and their file parameter names for URL / file_id uploads.
MEDIA_METHODS = {
    "image": "send_photo",
    "document": "send_document",
    "audio": "send_audio",
    "video": "send_video",
    "voice": "send_voice",
    "sticker": "send_sticker",
    "animation": "send_animation",
}
MEDIA_FIELDS = {
    "image": "photo",
    "document": "document",
    "audio": "audio",
    "video": "video",
    "voice": "voice",
    "sticker": "sticker",
    "animation": "animation",
}


class TelegramService(BaseMessagingService):
    """Wraps the Telegram Bot API via aiogram (getMe, send, media, webhook)."""

    channel = "telegram"

    def __init__(self, account):
        self.account = account

    # ------------------------------------------------------------------ urls
    @property
    def _token(self) -> str:
        token = getattr(self.account, "bot_token", "")
        if not token:
            raise InvalidTokenError(
                "Bot token Telegram не настроен. Создайте бота через @BotFather.",
                code="token_missing",
            )
        return token

    # ---------------------------------------------------------------- helpers
    def _run(self, coro_factory):
        """Run one aiogram coroutine synchronously in a fresh event loop.

        ``coro_factory(bot)`` receives a fresh ``Bot``; the aiohttp session is
        always closed inside the same loop. aiogram errors are mapped to the
        typed messaging errors.
        """
        token = self._token

        async def _wrapper():
            bot = Bot(token=token)
            try:
                return await coro_factory(bot)
            finally:
                await bot.session.close()

        try:
            return asyncio.run(_wrapper())
        except TelegramUnauthorizedError as exc:
            log_event("telegram.api.error", level=logging.WARNING,
                      code="401", message="unauthorized")
            raise InvalidTokenError(
                "Неверный или отозванный bot token. Создайте новый через @BotFather.",
                code="invalid_token",
                details={"api_message": str(exc)},
            ) from exc
        except TelegramRetryAfter as exc:
            raise TemporaryMessagingError(
                "Telegram временно ограничил запросы (429). Попробуйте позже.",
                code="rate_limited",
            ) from exc
        except TelegramNetworkError as exc:
            log_event("telegram.api.error", level=logging.ERROR,
                      error="network_error")
            raise TemporaryMessagingError(
                f"Нет соединения с Telegram API: {exc.__class__.__name__}"
            ) from exc
        except TelegramServerError as exc:
            raise TemporaryMessagingError(
                "Telegram API временно недоступен. Попробуйте позже.",
                code="http_5xx",
            ) from exc
        except TelegramAPIError as exc:
            raise PermanentMessagingError(
                _friendly_message(str(exc)),
                code="telegram_api_error",
            ) from exc

    # ------------------------------------------------------------- messaging
    def send_text_message(self, to: str, text: str, **kwargs) -> dict:
        """Send a text message to ``chat_id``."""
        if not to:
            raise PermanentMessagingError(
                "Не указан chat_id получателя", code="missing_recipient"
            )
        result = self._run(
            lambda bot: bot.send_message(chat_id=to, text=text)
        )
        log_event("telegram.message.sent", direction="outgoing", type="text")
        return {"external_message_id": str(result.message_id)}

    def send_media(self, to: str, media_type: str, media_url: str, *,
                   caption: str | None = None, filename: str | None = None) -> dict:
        """Send a photo / document / audio / video / voice / sticker by URL.

        The Bot API fetches the file from ``media_url`` server-side, so any
        publicly reachable URL (including our own media proxy) works.
        """
        if media_type not in MEDIA_METHODS:
            raise PermanentMessagingError(
                f"Неподдерживаемый тип медиа: {media_type}", code="unsupported_media"
            )
        if not to:
            raise PermanentMessagingError(
                "Не указан chat_id получателя", code="missing_recipient"
            )

        async def _send(bot):
            method = getattr(bot, MEDIA_METHODS[media_type])
            return await method(
                chat_id=to,
                **{MEDIA_FIELDS[media_type]: media_url},
                caption=caption or None,
            )

        result = self._run(_send)
        log_event("telegram.message.sent", direction="outgoing", type=media_type)
        return {"external_message_id": str(result.message_id)}

    def send_template_message(self, to: str, template_name: str, language: str,
                              **kwargs) -> dict:
        """Telegram has no message templates — raise a typed error."""
        raise PermanentMessagingError(
            "Telegram не поддерживает шаблонные сообщения. Отправьте обычное сообщение.",
            code="templates_unsupported",
        )

    def mark_message_as_read(self, message_id: str) -> None:
        """Telegram has no read receipts — nothing to do."""

    # ------------------------------------------------------ connection test
    def test_connection(self) -> dict:
        """Validate the bot token via getMe.

        Returns a structured result dict; never raises for API failures — the
        caller gets ``ok`` + a human-readable ``error`` instead.
        """
        try:
            me = self._run(lambda bot: bot.get_me())
        except (InvalidTokenError, TemporaryMessagingError) as exc:
            return {"ok": False, "token_valid": False, "error": str(exc)}
        return {
            "ok": True,
            "token_valid": True,
            "bot_id": me.id,
            "bot_username": me.username or "",
            "bot_name": me.first_name or "",
        }

    # ---------------------------------------------------------------- webhook
    def set_webhook(self, url: str, secret_token: str | None = None) -> dict:
        """Point the bot's updates to our webhook endpoint."""
        self._run(
            lambda bot: bot.set_webhook(
                url=url,
                secret_token=secret_token or None,
                allowed_updates=["message"],
                drop_pending_updates=True,
            )
        )
        log_event("telegram.webhook.set", url=url)
        return {"ok": True}

    def delete_webhook(self) -> dict:
        """Remove the webhook (bot returns to long polling)."""
        self._run(lambda bot: bot.delete_webhook(drop_pending_updates=True))
        log_event("telegram.webhook.deleted")
        return {"ok": True}

    def get_webhook_info(self) -> dict:
        """Current webhook state (url, pending updates, error message)."""
        info = self._run(lambda bot: bot.get_webhook_info())
        log_event("telegram.webhook.info", url=info.url or "")
        return {
            "url": info.url or "",
            "pending_update_count": info.pending_update_count or 0,
            "last_error_message": info.last_error_message or "",
            "last_error_date": info.last_error_date,
        }

    # ----------------------------------------------------------------- media
    def get_file(self, file_id: str) -> dict:
        """Resolve a file_id to a Bot API file path."""
        info = self._run(lambda bot: bot.get_file(file_id=file_id))
        return {
            "file_path": info.file_path or "",
            "file_size": info.file_size or 0,
        }

    def get_file_url(self, file_path: str) -> str:
        """Public download URL for a file path (requires the bot token)."""
        base = getattr(settings, "TELEGRAM_API_BASE", TELEGRAM_API_BASE).rstrip("/")
        return f"{base}/file/bot{self._token}/{file_path}"
