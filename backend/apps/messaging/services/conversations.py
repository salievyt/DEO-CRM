"""Domain helpers: resolve/create clients & conversations, bump counters.

Used by both the webhook processor and the REST views so the rules live in
one place.
"""
from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone

from common.phone import normalize_phone

from ..models import Conversation, Message
from ..models.enums import Channel, ConversationStatus, Direction
from ..services.realtime import notify


def _split_name(name: str | None) -> tuple[str, str]:
    if not name:
        return "", ""
    parts = name.strip().split(maxsplit=1)
    first = parts[0] if parts else ""
    last = parts[1] if len(parts) > 1 else ""
    return first, last


def get_or_create_client(phone: str, name: str | None = None):
    """Find a client by normalized phone or create one (webhook path)."""
    from apps.clients.models import Client

    e164 = normalize_phone(phone)
    client = None
    if e164:
        client = Client.objects.filter(phone=e164).order_by("-created_at").first()
    if client is None and e164:
        # Fallback for rows where the phone is stored in a display format.
        pattern = rf"\D*" + r"\D*".join(e164[-10:]) + r"\D*"
        client = Client.objects.filter(phone__iregex=pattern).order_by("-created_at").first()
    if client:
        # Sync a nicer display name if the profile name arrived and the
        # client was auto-created earlier without a name.
        if name and client.first_name in ("", "WhatsApp") and client.last_name in ("", "Клиент"):
            first, last = _split_name(name)
            if first:
                client.first_name, client.last_name = first, last or "—"
                client.save(update_fields=["first_name", "last_name"])
        return client

    first, last = _split_name(name)
    return Client.objects.create(
        first_name=first or "WhatsApp",
        last_name=last or "Клиент",
        phone=phone or "",
        source="whatsapp",
        notes="Создан автоматически из WhatsApp",
    )


def get_or_create_client_for_lead(lead):
    """Resolve the Client for a lead, creating/linking one when missing.

    - Uses ``lead.client`` when already linked.
    - Otherwise looks the client up by normalized phone (same rules as the
      webhook path).
    - Otherwise creates a Client from the lead's contact data.
    - Links ``lead.client`` so the lead and the chat stay connected.
    """
    from apps.clients.models import Client

    if lead.client_id:
        return lead.client

    e164 = normalize_phone(lead.phone)
    client = None
    if e164:
        client = Client.objects.filter(phone=e164).order_by("-created_at").first()
    if client is None and e164:
        # Fallback for rows where the phone is stored in a display format.
        pattern = rf"\D*" + r"\D*".join(e164[-10:]) + r"\D*"
        client = Client.objects.filter(phone__iregex=pattern).order_by("-created_at").first()

    if client is None:
        first, last = _split_name(lead.contact_name)
        client = Client.objects.create(
            first_name=first or lead.contact_name or "WhatsApp",
            last_name=last or "Клиент",
            company_name=lead.company_name or "",
            phone=lead.phone or "",
            email=lead.email or "",
            telegram=lead.telegram or "",
            source=lead.source or "other",
            notes="Создан автоматически из лида",
        )
    else:
        # Enrich an existing client with lead details when fields are empty.
        changed = False
        if lead.company_name and not client.company_name:
            client.company_name = lead.company_name
            changed = True
        if lead.email and not client.email:
            client.email = lead.email
            changed = True
        if changed:
            client.save(update_fields=["company_name", "email"])

    lead.client = client
    lead.save(update_fields=["client", "updated_at"])
    return client


def get_or_create_conversation(account, client, channel: str = Channel.WHATSAPP) -> Conversation:
    """Get the (client, channel[, account]) conversation or create a fresh one.

    Manager-initiated: ``last_customer_message_at`` stays empty so the WhatsApp
    24h window heuristic reports the window as closed (template required).
    """
    qs = Conversation.objects.filter(contact=client, channel=channel)
    if channel == Channel.WHATSAPP:
        qs = qs.filter(whatsapp_account=account)
    else:
        qs = qs.filter(whatsapp_account__isnull=True)

    existing = qs.first()
    if existing:
        return existing

    return Conversation.objects.create(
        contact=client,
        channel=channel,
        whatsapp_account=account if channel == Channel.WHATSAPP else None,
        status=ConversationStatus.OPEN,
    )


def find_or_create_conversation(account, client, channel: str = Channel.WHATSAPP) -> Conversation:
    """Get the conversation for (client, channel[, account]) or create one."""
    qs = Conversation.objects.filter(contact=client, channel=channel)
    if channel == Channel.WHATSAPP:
        qs = qs.filter(whatsapp_account=account)
    else:
        qs = qs.filter(whatsapp_account__isnull=True)

    conversation = qs.first()
    if conversation:
        return conversation

    # Only link a persisted account (env fallback instances have no pk yet).
    saved_account = account if (account and account.pk) else None
    created = False
    try:
        with transaction.atomic():
            conversation = Conversation.objects.create(
                contact=client,
                channel=channel,
                whatsapp_account=saved_account if channel == Channel.WHATSAPP else None,
                status=ConversationStatus.OPEN,
                last_customer_message_at=timezone.now(),
                last_message_at=timezone.now(),
            )
            created = True
    except IntegrityError:
        conversation = qs.first()
        if conversation:
            return conversation
        raise

    if created:
        notify(conversation, "conversation.created", {"conversation_id": str(conversation.id)})
    return conversation


def record_incoming_message(message: Message, preview: str = "") -> None:
    """Bump conversation state after a new inbound message (unread +1).

    Uses ``F()`` so concurrent webhook deliveries never lose increments.
    """
    conversation = message.conversation
    conversation.unread_count = F("unread_count") + 1
    conversation.last_message_at = timezone.now()
    conversation.last_customer_message_at = timezone.now()
    conversation.last_message_preview = preview[:255]
    conversation.save(update_fields=[
        "unread_count", "last_message_at", "last_customer_message_at",
        "last_message_preview", "updated_at",
    ])
    conversation.refresh_from_db(fields=["unread_count"])


def record_outgoing_message(message: Message, preview: str = "") -> None:
    """Update conversation state after an outbound message was sent."""
    conversation = message.conversation
    conversation.last_message_at = timezone.now()
    conversation.last_message_preview = preview[:255]
    if conversation.status == ConversationStatus.CLOSED:
        conversation.status = ConversationStatus.OPEN
    conversation.save(update_fields=[
        "last_message_at", "last_message_preview", "status", "updated_at",
    ])


def mark_conversation_read(conversation: Conversation) -> int:
    """Reset unread counter atomically; returns the previous count."""
    prev = conversation.unread_count
    if prev:
        Conversation.objects.filter(pk=conversation.pk).update(
            unread_count=0, updated_at=timezone.now()
        )
        conversation.unread_count = 0
    return prev


def conversation_serialized(conversation: Conversation) -> dict:
    """Compact conversation payload for realtime events."""
    return {
        "conversation_id": str(conversation.id),
        "contact_id": str(conversation.contact_id),
        "channel": conversation.channel,
        "status": conversation.status,
        "unread_count": conversation.unread_count,
        "last_message_at": conversation.last_message_at.isoformat()
        if conversation.last_message_at else None,
        "last_message_preview": conversation.last_message_preview,
    }


def message_serialized(message: Message) -> dict:
    """Compact message payload for realtime events."""
    return {
        "id": str(message.id),
        "conversation_id": str(message.conversation_id),
        "channel": message.channel,
        "direction": message.direction,
        "type": message.type,
        "text": message.text,
        "status": message.status,
        "created_at": message.created_at.isoformat(),
        "external_message_id": message.external_message_id,
    }
