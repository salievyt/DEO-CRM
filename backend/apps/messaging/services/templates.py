"""WhatsApp template catalog: normalized view over the WABA template list.

Fetched from the Graph API and cached briefly (Redis cache in prod, locmem
locally) to avoid hammering Meta on every inbox render.
"""
import re

from django.conf import settings
from django.core.cache import cache

from .whatsapp import WhatsAppService

_PARAM_RE = re.compile(r"{{\d+}}")


def _normalize_template(item: dict) -> dict:
    body_text = ""
    header = None
    buttons = []
    for component in item.get("components", []) or []:
        ctype = component.get("type")
        text = component.get("text", "")
        if ctype == "body":
            body_text = text
        elif ctype == "header" and text:
            header = {"type": "text", "text": text}
        elif ctype == "header" and component.get("format"):
            header = {"type": component.get("format", "text")}
        elif ctype == "button":
            buttons.append({
                "type": component.get("sub_type", "quick_reply"),
                "text": (component.get("text") or "")[:60],
            })

    return {
        "name": item.get("name", ""),
        "language": (item.get("language") or {}).get("code", ""),
        "category": item.get("category", ""),
        "status": item.get("status", ""),
        "body_text": body_text,
        "parameter_count": len(_PARAM_RE.findall(body_text)),
        "header": header,
        "buttons": buttons,
        "updated_at": item.get("updated_time", ""),
    }


def get_cached_templates(account) -> list[dict]:
    """Approved + pending templates for an account (cached)."""
    cache_key = f"whatsapp_templates_{account.id}"
    data = cache.get(cache_key)
    if data is not None:
        return data

    service = WhatsAppService(account)
    raw = service.get_templates()
    data = [_normalize_template(t) for t in raw]
    data.sort(key=lambda t: (t["status"] != "APPROVED", t["name"].lower()))
    cache.set(
        cache_key, data, timeout=getattr(settings, "WHATSAPP_TEMPLATES_CACHE_TTL", 300)
    )
    return data
