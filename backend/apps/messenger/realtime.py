"""Realtime chat delivery over Django Channels + Redis.

The chat WebSocket (``ChatConsumer``) and the REST messenger API share the
payload helpers here, so a message looks identical whichever way it was
created.

Events:
- ``chat.message`` to the chat group ``chat_{chat_id}``
- ``chat.typing`` / ``chat.read`` to the same group
- ``chat.message`` to each participant's ``notifications_{user_id}`` group
  (the always-on ``/ws/notifications/`` socket) so the chat list, unread
  badges and browser notifications update even without an open chat.

All functions are best-effort: realtime must never break message persistence.
"""
import json
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger("messenger.realtime")


def message_payload(message) -> dict:
    """Serialize a message for the wire (shared by REST and consumers)."""
    sender = message.sender
    return {
        "id": str(message.id),
        "chat": str(message.chat_id),
        "sender": str(message.sender_id) if message.sender_id else None,
        "sender_name": sender.get_full_name() if sender else "",
        "sender_avatar": (sender.avatar or None) if sender else None,
        "content": message.content or "",
        "file_url": message.file_url or "",
        "file_name": message.file_name or "",
        "voice_url": message.voice_url or "",
        "voice_duration": message.voice_duration or 0,
        "reply_to": str(message.reply_to_id) if message.reply_to_id else None,
        "created_at": message.created_at.isoformat() if message.created_at else None,
    }


def _send(group: str, event_type: str, **payload) -> None:
    layer = get_channel_layer()
    if layer is None:
        return
    try:
        async_to_sync(layer.group_send)(group, {"type": event_type, **payload})
    except Exception:  # pragma: no cover - realtime must not break the flow
        logger.exception("group_send failed group=%s type=%s", group, event_type)


def broadcast_message(message) -> None:
    """Broadcast a persisted message to the chat and every other participant."""
    payload = message_payload(message)
    _send(f"chat_{message.chat_id}", "chat.message", message=payload)

    chat_name = message.chat.name or ""
    for participant in message.chat.participants.select_related("user"):
        user = participant.user
        if user is None or user.id == message.sender_id:
            continue
        body = json.dumps(
            {"event": "chat.message", "data": {**payload, "chat_name": chat_name}},
            ensure_ascii=False,
        )
        _send(f"notifications_{user.id}", "send.notification", message=body)


def broadcast_typing(chat_id, user_id, user_name: str, is_typing: bool) -> None:
    _send(
        f"chat_{chat_id}",
        "chat.typing",
        user_id=str(user_id),
        user_name=user_name,
        is_typing=bool(is_typing),
    )


def broadcast_read(chat_id, user_id, last_read_at) -> None:
    _send(
        f"chat_{chat_id}",
        "chat.read",
        user_id=str(user_id),
        last_read_at=last_read_at.isoformat() if last_read_at else None,
    )
