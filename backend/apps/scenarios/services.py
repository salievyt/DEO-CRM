"""Scenario engine: keyword matching + automated replies.

``maybe_auto_respond`` is the single entry point called by the messaging
webhooks right after an inbound message is stored. It is fully defensive —
any failure inside is logged and swallowed so automation never breaks the
webhook pipeline.
"""

import logging

from django.db.models import Q
from django.utils import timezone

from apps.messaging.logging import log_event
from apps.messaging.models.enums import Direction
from apps.messaging.services.conversations import (
    message_serialized,
    record_outgoing_message,
)
from apps.messaging.services.realtime import notify

from .models import Channel, MatchMode, Scenario, ScenarioTrigger, TriggerStatus

logger = logging.getLogger("scenarios")


def match_keywords(text: str, keywords: list[str], match_mode: str = MatchMode.ANY) -> str | None:
    """Return the first matched keyword, or None when nothing matches.

    ``ANY``  — at least one keyword must be a substring of ``text``.
    ``ALL``  — every keyword must be present (returns the first one).
    """
    lowered = (text or "").lower()
    cleaned = [kw.strip().lower() for kw in keywords if kw and kw.strip()]
    if not cleaned:
        return None

    if match_mode == MatchMode.ALL:
        return cleaned[0] if all(kw in lowered for kw in cleaned) else None
    for kw in cleaned:
        if kw in lowered:
            return kw
    return None


def _channel_matches(conversation_channel: str, scenario_channel: str) -> bool:
    if scenario_channel == Channel.ALL:
        return True
    return scenario_channel == conversation_channel


def maybe_auto_respond(message) -> ScenarioTrigger | None:
    """Run matching active scenarios for a freshly stored inbound message.

    Returns the created :class:`ScenarioTrigger` (responded/failed) or None
    when nothing matched or the reply was skipped. Never raises.
    """
    if message.direction != Direction.INCOMING:
        return None
    if not (message.text or "").strip():
        return None

    conversation = message.conversation
    scenarios = (
        Scenario.objects.filter(is_active=True)
        .filter(Q(channel=conversation.channel) | Q(channel=Channel.ALL))
        .order_by("priority", "created_at")
    )

    for scenario in scenarios:
        matched = match_keywords(message.text, scenario.keywords, scenario.match_mode)
        if not matched:
            continue
        try:
            return _respond(scenario, conversation, message, matched)
        except Exception:  # noqa: BLE001 - never break the webhook pipeline
            logger.exception("scenarios.respond.error scenario=%s", scenario.id)
            return None
    return None


def _respond(scenario: Scenario, conversation, message, matched: str) -> ScenarioTrigger:
    """Send the scenario reply and record a trigger row."""
    if scenario.cooldown_minutes > 0:
        window_start = timezone.now() - timezone.timedelta(minutes=scenario.cooldown_minutes)
        cooldown_hit = ScenarioTrigger.objects.filter(
            scenario=scenario,
            conversation=conversation,
            status=TriggerStatus.RESPONDED,
            created_at__gte=window_start,
        ).exists()
        if cooldown_hit:
            return ScenarioTrigger.objects.create(
                scenario=scenario,
                conversation=conversation,
                message=message,
                client=conversation.contact,
                matched_keyword=matched,
                status=TriggerStatus.SKIPPED,
            )

    reply = _send_reply(conversation, scenario.reply_text)
    trigger = ScenarioTrigger.objects.create(
        scenario=scenario,
        conversation=conversation,
        message=message,
        reply_message=reply,
        client=conversation.contact,
        matched_keyword=matched,
        status=TriggerStatus.RESPONDED if reply else TriggerStatus.FAILED,
    )
    if reply is None:
        trigger.error_message = "Не удалось отправить ответ клиенту"
        trigger.save(update_fields=["status", "error_message"])

    Scenario.objects.filter(pk=scenario.pk).update(
        trigger_count=scenario.trigger_count + 1,
        last_triggered_at=timezone.now(),
        updated_at=timezone.now(),
    )
    return trigger


def _send_reply(conversation, reply_text: str):
    """Send ``reply_text`` back through the conversation's channel.

    Returns the created outgoing :class:`messaging.Message` or None on failure.
    """
    try:
        if conversation.channel == "whatsapp":
            reply = _send_whatsapp(conversation, reply_text)
        elif conversation.channel == "telegram":
            reply = _send_telegram(conversation, reply_text)
        else:
            log_event(
                "scenarios.channel_unsupported", level=logging.WARNING, channel=conversation.channel
            )
            return None
    except Exception:  # noqa: BLE001
        logger.exception("scenarios.send_error conversation=%s", conversation.id)
        return None

    if reply is None:
        return None
    record_outgoing_message(reply, reply.text)
    notify(conversation, "message.created", message_serialized(reply))
    notify(conversation, "conversation.updated", {"conversation_id": str(conversation.id)})
    return reply


def _create_outgoing_message(conversation, text: str, external_message_id: str = ""):
    from apps.messaging.models import Message
    from apps.messaging.models.enums import MessageStatus, MessageType

    return Message.objects.create(
        conversation=conversation,
        contact=conversation.contact,
        channel=conversation.channel,
        direction=Direction.OUTGOING,
        type=MessageType.TEXT,
        text=(text or "").strip(),
        external_message_id=external_message_id,
        status=MessageStatus.SENT,
        sender=None,
        metadata={"source": "scenario"},
    )


def _send_whatsapp(conversation, reply_text: str):
    from apps.messaging.models import WhatsAppAccount
    from apps.messaging.services.whatsapp import WhatsAppService

    account = conversation.whatsapp_account or WhatsAppAccount.get_default()
    if account is None:
        log_event(
            "scenarios.no_whatsapp_account",
            level=logging.WARNING,
            conversation_id=str(conversation.id),
        )
        return None
    result = WhatsAppService(account).send_text_message(conversation.contact.phone, reply_text)
    return _create_outgoing_message(conversation, reply_text, result.get("external_message_id", ""))


def _send_telegram(conversation, reply_text: str):
    from apps.messaging.models import TelegramAccount
    from apps.messaging.services.telegram import TelegramService

    account = conversation.telegram_account or TelegramAccount.get_default()
    if account is None:
        log_event(
            "scenarios.no_telegram_account",
            level=logging.WARNING,
            conversation_id=str(conversation.id),
        )
        return None
    chat_id = conversation.telegram_chat_id or conversation.contact.telegram_chat_id
    if not chat_id:
        log_event(
            "scenarios.no_telegram_chat",
            level=logging.WARNING,
            conversation_id=str(conversation.id),
        )
        return None
    result = TelegramService(account).send_text_message(chat_id, reply_text)
    return _create_outgoing_message(conversation, reply_text, result.get("external_message_id", ""))
