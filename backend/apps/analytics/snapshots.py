"""Daily materialized snapshots (BusinessMetricsSnapshot).

The snapshot stores additive company-level KPIs per day so the dashboard
never re-aggregates the whole history. Complex metrics (conversion, LTV,
churn, retention) are computed on demand and cached instead.
"""

from collections import defaultdict
from datetime import datetime, time, timedelta

from django.apps import apps
from django.db.models.functions import TruncDate
from django.utils import timezone

from .funnel import deal_stage_ids, get_lead_outcomes, get_qualified_lead_ids
from .services import Period, _effective_paid_at, _revenue_profit, _sum


def rebuild_snapshots(start_date, end_date):
    """Upsert BusinessMetricsSnapshot rows for every day in [start, end]."""
    BusinessMetricsSnapshot = apps.get_model("analytics", "BusinessMetricsSnapshot")
    Invoice = apps.get_model("finance", "Invoice")
    ClientInteraction = apps.get_model("clients", "ClientInteraction")
    Client = apps.get_model("clients", "Client")
    Lead = apps.get_model("leads", "Lead")

    won_at, lost_at = get_lead_outcomes()

    # ---- Batched activity maps: date -> {client_id} ---------------------
    invoices_by_day = defaultdict(set)
    for day, client_id in (
        Invoice.objects.filter(status="paid")
        .annotate(day=TruncDate(_effective_paid_at()))
        .values_list("day", "client_id")
    ):
        if day is not None:
            invoices_by_day[day].add(client_id)

    interactions_by_day = defaultdict(set)
    for day, client_id in (
        ClientInteraction.objects.all()
        .annotate(day=TruncDate("created_at"))
        .values_list("day", "client_id")
    ):
        if day is not None:
            interactions_by_day[day].add(client_id)

    start_dt = timezone.make_aware(datetime.combine(start_date, time.min))
    active_before = set(
        Client.objects.filter(invoices__status="paid", invoices__paid_at__lt=start_dt)
        .values_list("id", flat=True)
        .distinct()
    )

    rows = []
    cursor = start_date
    while cursor <= end_date:
        day_start = timezone.make_aware(datetime.combine(cursor, time.min))
        day_end = day_start + timedelta(days=1)
        period = Period(day_start, day_end)

        money = _revenue_profit(period)

        leads_qs = Lead.objects.filter(created_at__gte=day_start, created_at__lt=day_end)
        new_leads = leads_qs.count()
        qualified = len(get_qualified_lead_ids(leads_qs))
        deals = leads_qs.filter(current_stage_id__in=deal_stage_ids()).count()

        won_ids_day = {lid for lid, ts in won_at.items() if day_start <= ts < day_end}
        lost_ids_day = {lid for lid, ts in lost_at.items() if day_start <= ts < day_end}
        won_revenue = _sum(
            Lead.objects.filter(id__in=won_ids_day).exclude(budget__isnull=True), "budget"
        )

        new_clients = Client.objects.filter(
            created_at__gte=day_start, created_at__lt=day_end
        ).count()

        active_today = (invoices_by_day.get(cursor) or set()) | (
            interactions_by_day.get(cursor) or set()
        )
        churned = len(active_before - active_today)
        active_before |= active_today

        rows.append(
            BusinessMetricsSnapshot(
                date=cursor,
                revenue=money["revenue"],
                cogs=money["cogs"],
                gross_profit=money["gross_profit"],
                expenses=money["expenses"],
                salaries=money["salaries"],
                net_profit=money["net_profit"],
                new_clients=new_clients,
                new_leads=new_leads,
                qualified_leads=qualified,
                deals=deals,
                won_deals=len(won_ids_day),
                lost_deals=len(lost_ids_day),
                won_revenue=won_revenue,
                active_clients=len(active_today),
                churned_clients=churned,
            )
        )
        cursor += timedelta(days=1)

    for snap in rows:
        BusinessMetricsSnapshot.objects.update_or_create(
            date=snap.date,
            defaults={
                "revenue": snap.revenue,
                "cogs": snap.cogs,
                "gross_profit": snap.gross_profit,
                "expenses": snap.expenses,
                "salaries": snap.salaries,
                "net_profit": snap.net_profit,
                "new_clients": snap.new_clients,
                "new_leads": snap.new_leads,
                "qualified_leads": snap.qualified_leads,
                "deals": snap.deals,
                "won_deals": snap.won_deals,
                "lost_deals": snap.lost_deals,
                "won_revenue": snap.won_revenue,
                "active_clients": snap.active_clients,
                "churned_clients": snap.churned_clients,
            },
        )
    return len(rows)


def snapshot_range():
    """Default date range for the periodic refresh."""
    from .constants import SNAPSHOT_DAYS

    today = timezone.localdate()
    return today - timedelta(days=SNAPSHOT_DAYS - 1), today
