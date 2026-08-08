"""Business services for clients (Customer Health evaluation).

Health is computed with transparent, rule-based logic (no AI/ML).
"""

from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone

HEALTH_HEALTHY = "healthy"
HEALTH_AT_RISK = "at_risk"
HEALTH_CRITICAL = "critical"

HEALTH_LEVELS = (HEALTH_CRITICAL, HEALTH_AT_RISK, HEALTH_HEALTHY)

CONTACT_AT_RISK_DAYS = 30
CONTACT_CRITICAL_DAYS = 60
NO_CONTACT_GRACE_DAYS = 7


def client_last_contact_at(client):
    """Latest timestamp of any interaction or chat message with the client.

    Sources: ClientInteraction and messenger Chat/Message (via ChatParticipant).
    Returns None when the client has no contacts yet.
    """
    timestamps = []
    interaction = client.interactions.order_by("-created_at").values("created_at").first()
    if interaction:
        timestamps.append(interaction["created_at"])

    from apps.messenger.models import Message

    message = (
        Message.objects
        .filter(chat__participants__client=client)
        .order_by("-created_at")
        .values("created_at")
        .first()
    )
    if message:
        timestamps.append(message["created_at"])

    return max(timestamps) if timestamps else None


def compute_client_health(client, now=None):
    """Evaluate client health from domain rules.

    Returns: {"level": "healthy"|"at_risk"|"critical", "reasons": {...}}
    where reasons holds human-readable explanations grouped by level.
    """
    from apps.finance.models import Invoice
    from apps.leads.models import Lead

    now = now or timezone.now()
    reasons = {HEALTH_CRITICAL: [], HEALTH_AT_RISK: [], HEALTH_HEALTHY: []}

    if not client.is_active:
        reasons[HEALTH_CRITICAL].append("Клиент неактивен")

    overdue_count = Invoice.objects.filter(
        client=client,
        status__in=("draft", "sent", "overdue"),
        due_date__lt=now.date(),
    ).count()
    if overdue_count:
        reasons[HEALTH_CRITICAL].append(
            f"Просроченных счетов: {overdue_count}"
        )

    last_contact = client_last_contact_at(client)
    if last_contact is None:
        if client.created_at <= now - timedelta(days=NO_CONTACT_GRACE_DAYS):
            reasons[HEALTH_AT_RISK].append("Нет контактов с клиентом")
    else:
        days_since = (now - last_contact).days
        if days_since > CONTACT_CRITICAL_DAYS:
            reasons[HEALTH_AT_RISK].append(
                f"Нет контактов {days_since} дней"
            )
        elif days_since > CONTACT_AT_RISK_DAYS:
            reasons[HEALTH_AT_RISK].append(
                f"Нет контактов {days_since} дней"
            )

    if not Lead.objects.filter(client=client, is_active=True).exists():
        reasons[HEALTH_AT_RISK].append("Нет активных сделок")

    if client.projects.exists():
        paid_total = Invoice.objects.filter(
            client=client, status="paid"
        ).aggregate(total=Sum("amount"))["total"] or 0
        if paid_total == 0:
            reasons[HEALTH_AT_RISK].append(
                "Есть проекты, но нет оплаченных счетов"
            )

    if not reasons[HEALTH_CRITICAL] and not reasons[HEALTH_AT_RISK]:
        reasons[HEALTH_HEALTHY].append(
            "Есть активные сделки и своевременные оплаты"
        )

    level = (
        HEALTH_CRITICAL
        if reasons[HEALTH_CRITICAL]
        else HEALTH_AT_RISK
        if reasons[HEALTH_AT_RISK]
        else HEALTH_HEALTHY
    )

    return {"level": level, "reasons": reasons}
