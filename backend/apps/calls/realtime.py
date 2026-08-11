"""Realtime missed-call notifications over Django Channels.

A missed call creates a persistent ``Notification`` per recipient and
broadcasts a ``missed_call`` event to the ``notifications_{user_id}``
channel groups (the ``/ws/notifications/`` consumer), which the frontend
turns into a toast and a bell-badge update.

All functions are best-effort: realtime must never break CDR ingestion.
"""
import json
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger("calls.realtime")

# Roles that can see the calls page — they receive missed-call alerts.
CALL_ROLES = ("superadmin", "owner", "project_manager")


def _recipient_users(record):
    from apps.accounts.models import Role, User

    role_ids = Role.objects.filter(name__in=CALL_ROLES).values_list("id", flat=True)
    qs = User.objects.filter(role_id__in=role_ids, is_active=True)
    if record.employee_id:
        qs = qs | User.objects.filter(pk=record.employee_id, is_active=True)
    return qs.distinct()


def _payload(record) -> dict:
    # ``started_at`` may still be the raw ISO string right after create()
    # (Django doesn't re-parse the in-memory attribute until a refresh).
    started_at = record.started_at or ""
    if hasattr(started_at, "isoformat"):
        started_at = started_at.isoformat()
    return {
        "event": "missed_call",
        "data": {
            "call_id": str(record.id),
            "phone_number": record.phone_number or "",
            "direction": record.direction,
            "started_at": started_at or None,
        },
    }


def notify_missed_call(record) -> None:
    """Create DB notifications + broadcast WS events for a missed call.

    Recipients: everyone with call access (superadmin/owner/PM) plus the
    linked employee. Per-user quiet hours / disabled channels are honored.
    """
    try:
        from apps.notifications.models import Notification, NotificationPreference

        payload = _payload(record)
        message = json.dumps(payload, ensure_ascii=False)
        title = "Пропущенный звонок"
        text = f"С номера {record.phone_number or '—'}"
        urgency = Notification.Urgency.IMPORTANT

        layer = get_channel_layer()

        for user in _recipient_users(record):
            prefs = NotificationPreference.objects.filter(user=user).first()
            if prefs and prefs.should_suppress(
                Notification.Types.MISSED_CALL, urgency
            ):
                continue

            Notification.objects.create(
                user=user,
                type=Notification.Types.MISSED_CALL,
                urgency=urgency,
                title=title,
                message=text,
            )

            if layer is None:
                continue
            try:
                async_to_sync(layer.group_send)(
                    f"notifications_{user.id}",
                    {"type": "send.notification", "message": message},
                )
            except Exception:  # pragma: no cover - realtime must not break the flow
                logger.exception("missed-call ws send failed user=%s", user.id)
    except Exception:  # pragma: no cover
        logger.exception("notify_missed_call failed")
