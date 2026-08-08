"""Structured logging for the messaging module.

Never log access tokens, webhook verify tokens or Authorization headers —
see ``_sanitize``.
"""
import logging

logger = logging.getLogger("messaging.whatsapp")

_SENSITIVE_KEYS = ("token", "secret", "authorization", "password", "credential")

EVENT_LOGGER = logging.getLogger("messaging.whatsapp")


def get_logger(name: str = "messaging") -> logging.Logger:
    return logging.getLogger(f"messaging.{name}")


def _sanitize(fields: dict) -> dict:
    return {
        k: v
        for k, v in fields.items()
        if not any(s in k.lower() for s in _SENSITIVE_KEYS)
    }


def log_event(event: str, level: int = logging.INFO, **fields) -> None:
    """Log a structured `whatsapp.*` event with sanitized fields."""
    safe = _sanitize(fields)
    parts = " ".join(f"{k}={v}" for k, v in safe.items())
    EVENT_LOGGER.log(level, "event=%s %s", event, parts)


def audit_log(user, action: str, entity_type: str, entity_id=None, details: dict | None = None) -> None:
    """Write an audit trail entry (UserActivityLog) without breaking the flow."""
    if not user or not getattr(user, "is_authenticated", False):
        return
    try:
        from apps.accounts.models import UserActivityLog

        UserActivityLog.objects.create(
            user=user,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details or {},
        )
    except Exception:  # pragma: no cover - audit must never break the flow
        logger.exception("audit_log failed action=%s", action)
