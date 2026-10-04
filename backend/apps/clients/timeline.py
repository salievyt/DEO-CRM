"""Additional Client 360 sources. Calls are read-only; no PBX behavior changes."""
from auditlog.models import LogEntry
from django.contrib.contenttypes.models import ContentType
from apps.calls.models import CallRecord
from apps.deals.models import Deal, DealPayment
from apps.messaging.models import Message
from apps.projects.models import ProjectHistory
from .models import Client


def extended_activity(client):
    def event(obj, kind, title, timestamp, description="", ref=None, meta=None):
        return dict(id=f"{kind}:{obj.pk}", entity_type=kind, title=title,
                    description=description, actor="", ref_id=str(ref or obj.pk),
                    ref_label=title, timestamp=timestamp, meta=meta or {})

    for msg in Message.objects.filter(contact=client).select_related("conversation"):
        yield event(msg, "message", f"{msg.get_channel_display()} · {msg.get_direction_display()}",
                    msg.created_at, msg.text, msg.conversation_id, {"channel": msg.channel})
    for deal in Deal.objects.filter(client=client):
        yield event(deal, "sale", f"Сделка {deal.number}: {deal.title}", deal.created_at,
                    deal.description, meta={"status": deal.status, "amount": str(deal.total)})
    for payment in DealPayment.objects.filter(deal__client=client).select_related("deal"):
        yield event(payment, "payment", f"Получено {payment.amount} · {payment.deal.number}",
                    payment.paid_at, payment.notes, payment.deal_id, {"amount": str(payment.amount)})
    for call in CallRecord.objects.filter(client=client):
        yield event(call, "call", f"{call.get_direction_display()} звонок", call.started_at or call.created_at,
                    f"{call.phone_number} · {call.duration_seconds} сек. · {call.get_status_display()}")
    for change in ProjectHistory.objects.filter(project__client=client).select_related("project"):
        yield event(change, "change", f"{change.project.name}: {change.field_changed}", change.created_at,
                    f"{change.old_value} → {change.new_value}", change.project_id)
    content_type = ContentType.objects.get_for_model(Client)
    for log in LogEntry.objects.filter(content_type=content_type, object_pk=str(client.pk)):
        yield event(log, "change", "Изменение карточки клиента", log.timestamp,
                    log.changes_str, client.pk)
