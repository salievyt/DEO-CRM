"""Realtime event emission over the existing Django Channels + Redis layer.

Events are sent to per-user groups ``inbox_{user_id}``. Managers connected to
``/ws/inbox/`` receive them as JSON: ``{"event": ..., "data": {...}}``.
"""
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger("messaging.realtime")


def _all_inbox_user_ids() -> list[str]:
    from apps.accounts.models import Role, User

    from ..permissions import INBOX_ROLES

    role_ids = Role.objects.filter(name__in=INBOX_ROLES).values_list("id", flat=True)
    return list(
        User.objects.filter(role_id__in=role_ids, is_active=True)
        .values_list("id", flat=True)
    )


def recipients_for(conversation) -> list[str]:
    """Assigned manager if any, otherwise everyone with inbox access."""
    if conversation.assigned_user_id:
        return [str(conversation.assigned_user_id)]
    return [str(uid) for uid in _all_inbox_user_ids()]


def send_realtime(user_id, event: str, data: dict) -> None:
    """Send one event to a single user's inbox group (best-effort)."""
    layer = get_channel_layer()
    if layer is None:
        return
    try:
        async_to_sync(layer.group_send)(
            f"inbox_{user_id}",
            {"type": "inbox.event", "event": event, "data": data},
        )
    except Exception:  # pragma: no cover - realtime must never break the flow
        logger.exception("send_realtime failed event=%s user=%s", event, user_id)


def notify(conversation, event: str, data: dict) -> None:
    """Deliver an event to everyone interested in the conversation."""
    for user_id in recipients_for(conversation):
        send_realtime(user_id, event, data)
