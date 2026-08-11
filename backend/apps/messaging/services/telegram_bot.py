"""aiogram-based Telegram inbound pipeline.

The Django webhook feeds raw updates into a reusable aiogram ``Dispatcher``
via ``dp.feed_update``; the registered message handler writes straight into
the CRM using the existing sync helpers. aiogram runs synchronous handlers in
a thread pool, so no async ORM is required.

A fresh ``Bot`` (with the receiving account's token) is created per update and
its aiohttp session is closed in the same event loop.
"""
import asyncio
import logging

from aiogram import Bot, Dispatcher, Router
from aiogram.types import Message, Update
from django.db import close_old_connections

from ..logging import log_event
from ..models import Message as CrmMessage
from ..models.enums import Channel, Direction, MessageStatus, MessageType
from .conversations import (
    conversation_serialized,
    find_or_create_conversation,
    get_or_create_telegram_client,
    message_serialized,
    record_incoming_message,
)
from .realtime import notify

logger = logging.getLogger("messaging.telegram")

router = Router()
dp = Dispatcher()
dp.include_router(router)


def feed_update(account, update: dict) -> None:
    """Feed one raw webhook update into the dispatcher (sync bridge)."""
    token = account.bot_token
    if not token:
        log_event("telegram.webhook.account_without_token", level=logging.WARNING,
                  username=account.bot_username)
        return

    async def _run():
        bot = Bot(token=token)
        try:
            # aiogram 3.19 expects a parsed Update (with the bot mounted).
            update_obj = Update.model_validate(update, context={"bot": bot})
            await dp.feed_update(bot, update_obj, account=account)
        finally:
            await bot.session.close()

    asyncio.run(_run())


@router.message()
def on_telegram_message(message: Message, account) -> None:
    """Handle an inbound message. Sync — aiogram runs it in a thread pool.

    The CRM writes below are plain sync Django ORM code, so the handler is
    intentionally synchronous. ``close_old_connections`` keeps the executor
    thread's DB connection fresh between webhook deliveries.

    ``account`` (the TelegramAccount that owns the webhook) is forwarded from
    the webhook view via ``feed_update(..., account=account)``.
    """
    close_old_connections()
    try:
        _process_message(message, account)
    finally:
        close_old_connections()


def _process_message(message: Message, account) -> None:
    chat = message.chat
    if not chat or not chat.id:
        log_event("telegram.webhook.message_without_chat", level=logging.WARNING)
        return

    sender = message.from_user
    client = get_or_create_telegram_client(
        chat.id,
        first_name=sender.first_name if sender else "",
        last_name=sender.last_name if sender else "",
        username=sender.username if sender else "",
    )
    conversation = find_or_create_conversation(
        account, client, Channel.TELEGRAM, telegram_chat_id=str(chat.id)
    )

    external_id = f"tg:{account.bot_username}:{message.message_id}"
    msg_type, text, media, metadata = extract_message(message, account.bot_username)

    crm_message, created = CrmMessage.objects.get_or_create(
        external_message_id=external_id,
        defaults={
            "conversation": conversation,
            "contact": client,
            "channel": Channel.TELEGRAM,
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
        preview = text or media.get("media_name") or "📎 Вложение"
        record_incoming_message(crm_message, preview)
        log_event("telegram.message.received", direction="incoming",
                  type=msg_type, conversation_id=str(conversation.id))
        notify(conversation, "message.created", message_serialized(crm_message))
        notify(conversation, "conversation.updated",
               conversation_serialized(conversation))
        _run_scenarios(crm_message)
    # else: duplicate webhook delivery — already processed, no-op.


def _run_scenarios(message) -> None:
    """Trigger keyword auto-responses for a freshly stored inbound message."""
    try:
        from apps.scenarios.services import maybe_auto_respond

        maybe_auto_respond(message)
    except Exception:  # noqa: BLE001 - automation must never break the webhook
        log_event("scenarios.processor_error", level=logging.ERROR,
                  conversation_id=str(message.conversation_id))


def extract_message(message: Message, bot_username: str):
    """Map an aiogram ``Message`` to (msg_type, text, media_dict, metadata)."""
    text = (message.text or "").strip()
    caption = (message.caption or "").strip()
    media = {"media_url": "", "media_name": "", "media_mime": ""}
    metadata: dict = {"bot_username": bot_username, "raw_type": "text"}
    msg_type = MessageType.TEXT

    if message.photo:
        # Photo → pick the largest available size.
        msg_type = MessageType.IMAGE
        largest = max(message.photo, key=lambda p: p.file_size or 0)
        media["media_mime"] = "image/jpeg"
        metadata["file_id"] = largest.file_id
        metadata["raw_type"] = "photo"
        text = caption
    elif message.document:
        doc = message.document
        msg_type = MessageType.DOCUMENT
        media["media_name"] = doc.file_name or "Документ"
        media["media_mime"] = doc.mime_type or ""
        metadata["file_id"] = doc.file_id
        metadata["raw_type"] = "document"
        text = caption
    elif message.video:
        video = message.video
        msg_type = MessageType.VIDEO
        media["media_mime"] = video.mime_type or "video/mp4"
        metadata["file_id"] = video.file_id
        metadata["raw_type"] = "video"
        text = caption
    elif message.voice:
        voice = message.voice
        msg_type = MessageType.AUDIO
        media["media_mime"] = voice.mime_type or "audio/ogg"
        metadata["file_id"] = voice.file_id
        metadata["raw_type"] = "voice"
        text = caption
    elif message.audio:
        audio = message.audio
        msg_type = MessageType.AUDIO
        media["media_name"] = audio.file_name or "Аудио"
        media["media_mime"] = audio.mime_type or "audio/mpeg"
        metadata["file_id"] = audio.file_id
        metadata["raw_type"] = "audio"
        text = caption
    elif message.animation:
        anim = message.animation
        msg_type = MessageType.DOCUMENT
        media["media_name"] = anim.file_name or "Анимация"
        media["media_mime"] = anim.mime_type or ""
        metadata["file_id"] = anim.file_id
        metadata["raw_type"] = "animation"
        text = caption
    elif message.sticker:
        msg_type = MessageType.STICKER
        media["media_mime"] = "image/webp"
        metadata["file_id"] = message.sticker.file_id
        metadata["raw_type"] = "sticker"
    elif message.location:
        loc = message.location
        msg_type = MessageType.LOCATION
        metadata["latitude"] = loc.latitude
        metadata["longitude"] = loc.longitude
        metadata["raw_type"] = "location"
        text = f"📍 {loc.latitude}, {loc.longitude}"
    elif message.contact:
        contact = message.contact
        msg_type = MessageType.CONTACT
        metadata["phone"] = contact.phone_number
        metadata["contact_name"] = contact.first_name
        metadata["raw_type"] = "contact"
        text = f"📇 {contact.first_name or ''} {contact.phone_number or ''}".strip()
    elif message.new_chat_members or message.left_chat_member:
        msg_type = MessageType.SYSTEM
        metadata["raw_type"] = (
            "new_chat_members" if message.new_chat_members else "left_chat_member"
        )
        text = (
            "Пользователь присоединился к чату"
            if message.new_chat_members
            else "Пользователь покинул чат"
        )
    elif message.text is None:
        msg_type = MessageType.SYSTEM
        metadata["raw_type"] = "unknown"
    return msg_type, text, media, metadata
