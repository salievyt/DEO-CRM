"""Service layer for the Business Analytics module.

Every public metric is a pure-ish function of (scope, period, filters) and is
computed with Django aggregation queries. Expensive breakdowns are cached in
``apps.analytics.caching``; daily additive KPIs are materialized in
``BusinessMetricsSnapshot`` by a periodic Celery task.
"""

import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal

from django.apps import apps
from django.db.models import (
    Case,
    Count,
    DateTimeField,
    DecimalField,
    F,
    Max as MaxDate,
    Min as MinDate,
    Q,
    Sum,
    When,
)
from django.db.models.functions import TruncDate
from django.utils import timezone

from .caching import cached_metric
from .constants import DEAL_MIN_PROBABILITY, previous_period
from .funnel import (
    deal_stage_ids,
    get_lead_outcomes,
    get_qualified_lead_ids,
    get_stage_classification,
    won_stage_ids,
)

ZERO = 0

# --------------------------------------------------------------------------
# Scope & period
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class AnalyticsScope:
    """Who is allowed to see what.

    kind="company" → whole company (admins only).
    kind="manager" → only data attributed to ``user_id``.
    """

    kind: str = "company"
    user_id: uuid.UUID | None = None


@dataclass(frozen=True)
class Period:
    start: datetime
    end: datetime
    label: str = ""

    @property
    def days(self):
        return max((self.end - self.start).days, 1)


def _effective_paid_at():
    """Effective payment timestamp: paid_at → updated_at → created_at."""
    return Case(
        When(paid_at__isnull=False, then=F("paid_at")),
        When(updated_at__isnull=False, then=F("updated_at")),
        default=F("created_at"),
        output_field=DateTimeField(),
    )


# --------------------------------------------------------------------------
# Query helpers
# --------------------------------------------------------------------------


def _paid_invoices(period, scope=None):
    """Paid (non-cancelled) invoices with effective payment date in period."""
    Invoice = apps.get_model("finance", "Invoice")
    qs = Invoice.objects.filter(status="paid").annotate(eff_paid=_effective_paid_at())
    if scope is not None and scope.kind == "manager":
        qs = qs.filter(client_id__in=_scope_client_ids(scope))
    return qs.filter(eff_paid__gte=period.start, eff_paid__lt=period.end)


def _refund_invoices(period, scope=None):
    """Cancelled invoices that were previously paid — treated as refunds."""
    Invoice = apps.get_model("finance", "Invoice")
    qs = Invoice.objects.filter(status="cancelled", paid_amount__gt=0).annotate(
        eff_paid=_effective_paid_at()
    )
    if scope is not None and scope.kind == "manager":
        qs = qs.filter(client_id__in=_scope_client_ids(scope))
    return qs.filter(eff_paid__gte=period.start, eff_paid__lt=period.end)


def _scope_lead_qs(scope):
    """Base Lead queryset restricted to the scope."""
    Lead = apps.get_model("leads", "Lead")
    qs = Lead.objects.all()
    if scope is not None and scope.kind == "manager":
        qs = qs.filter(assigned_to_id=scope.user_id)
    return qs


def _won_lead_by_client():
    """Map ``client_id`` → latest won lead (id, manager_id, budget, won_at)."""
    Lead = apps.get_model("leads", "Lead")
    won_at, _ = get_lead_outcomes()
    if not won_at:
        return {}
    rows = Lead.objects.filter(id__in=set(won_at)).values(
        "id", "client_id", "assigned_to_id", "budget"
    )
    best = {}
    for row in rows:
        ts = won_at.get(row["id"])
        current = best.get(row["client_id"])
        if current is None or (ts and (current[3] is None or ts > current[3])):
            best[row["client_id"]] = (
                row["id"],
                row["assigned_to_id"],
                row["budget"],
                ts,
            )
    return best


def _scope_client_ids(scope):
    """Clients attributed to a manager scope (won deal assigned to them)."""
    if scope is None or scope.kind != "manager":
        return None
    Client = apps.get_model("clients", "Client")
    return set(
        Client.objects.filter(
            leads__current_stage_id__in=won_stage_ids(),
            leads__assigned_to_id=scope.user_id,
        )
        .values_list("id", flat=True)
        .distinct()
    )


def _decimal(value):
    return Decimal(value) if value is not None else Decimal("0")


def _sum(qs, field):
    return _decimal(qs.aggregate(total=Sum(field))["total"])


def _safe_rate(part, whole):
    return round(float(part) / float(whole) * 100, 1) if whole else 0.0


# --------------------------------------------------------------------------
# Revenue / profit
# --------------------------------------------------------------------------


def _revenue_profit(period, scope=None):
    """Core money numbers for a period: revenue, refunds, cogs, expenses..."""
    Project = apps.get_model("projects", "Project")
    Expense = apps.get_model("finance", "Expense")
    Salary = apps.get_model("finance", "Salary")

    revenue_qs = _paid_invoices(period, scope)
    revenue = _sum(revenue_qs, "amount")
    # Informational: money returned for invoices that were paid and later
    # cancelled. Cancelled invoices are already excluded from revenue, so this
    # is not subtracted again (avoiding double counting).
    refunds = _sum(_refund_invoices(period, scope), "paid_amount")

    # COGS = себестоимость of projects that produced revenue in the period
    project_ids = set(
        revenue_qs.exclude(project_id__isnull=True).values_list("project_id", flat=True)
    )
    cogs = _sum(Project.objects.filter(id__in=project_ids), "cost") if project_ids else ZERO

    start_date, end_date = period.start.date(), period.end.date()
    expenses = _sum(
        Expense.objects.filter(expense_date__gte=start_date, expense_date__lt=end_date), "amount"
    )
    salaries = _sum(Salary.objects.filter(paid_at__gte=start_date, paid_at__lt=end_date), "amount")

    gross_profit = revenue - cogs
    net_profit = gross_profit - expenses - salaries
    return {
        "revenue": revenue,
        "refunds": refunds,
        "revenue_net": revenue,
        "cogs": cogs,
        "gross_profit": gross_profit,
        "expenses": expenses,
        "salaries": salaries,
        "net_profit": net_profit,
    }


# --------------------------------------------------------------------------
# Funnel / leads
# --------------------------------------------------------------------------


def _funnel_counts(period, scope=None):
    """Counts for Lead → Qualified → Deal → Won plus won/lost by outcome."""
    Lead = apps.get_model("leads", "Lead")
    leads_qs = _scope_lead_qs(scope).filter(created_at__gte=period.start, created_at__lt=period.end)

    total_leads = leads_qs.count()
    qualified_ids = get_qualified_lead_ids(leads_qs)
    qualified = len(qualified_ids)

    deal_ids = set(
        leads_qs.filter(current_stage_id__in=deal_stage_ids()).values_list("id", flat=True)
    )
    deals = len(deal_ids)

    won_at, lost_at = get_lead_outcomes()
    won_ids = {lid for lid, ts in won_at.items() if period.start <= ts < period.end}
    lost_ids = {lid for lid, ts in lost_at.items() if period.start <= ts < period.end}

    # Won/lost restricted to scope
    if scope is not None and scope.kind == "manager":
        scope_lead_ids = set(_scope_lead_qs(scope).values_list("id", flat=True).distinct())
        won_ids &= scope_lead_ids
        lost_ids &= scope_lead_ids

    won_revenue = _sum(Lead.objects.filter(id__in=won_ids).exclude(budget__isnull=True), "budget")
    lost_revenue = _sum(Lead.objects.filter(id__in=lost_ids).exclude(budget__isnull=True), "budget")

    return {
        "total_leads": total_leads,
        "qualified_leads": qualified,
        "deals": deals,
        "won_deals": len(won_ids),
        "lost_deals": len(lost_ids),
        "won_revenue": won_revenue,
        "lost_revenue": lost_revenue,
    }


def _sales_cycle(period, scope=None):
    """Average days from lead creation to win for deals won in the period."""
    Lead = apps.get_model("leads", "Lead")
    won_at, _ = get_lead_outcomes()
    won_ids = {lid for lid, ts in won_at.items() if period.start <= ts < period.end}
    if not won_ids:
        return 0.0

    leads_qs = Lead.objects.filter(id__in=won_ids).values("id", "created_at")
    if scope is not None and scope.kind == "manager":
        leads_qs = leads_qs.filter(assigned_to_id=scope.user_id)

    durations = []
    for row in leads_qs:
        ts = won_at.get(row["id"])
        if ts:
            durations.append((ts - row["created_at"]).total_seconds() / 86400)
    return round(sum(durations) / len(durations), 1) if durations else 0.0


def _avg_deal_size(period, scope=None):
    Lead = apps.get_model("leads", "Lead")
    won_at, _ = get_lead_outcomes()
    won_ids = {lid for lid, ts in won_at.items() if period.start <= ts < period.end}
    if scope is not None and scope.kind == "manager":
        won_ids &= set(_scope_lead_qs(scope).values_list("id", flat=True).distinct())
    won_qs = Lead.objects.filter(id__in=won_ids).exclude(budget__isnull=True)
    total = _sum(won_qs, "budget")
    count = won_qs.count()
    return round(float(total) / count, 2) if count else 0.0


# --------------------------------------------------------------------------
# LTV / churn / retention
# --------------------------------------------------------------------------


def _paying_clients(scope=None):
    """Per-client purchase history for paying clients (all-time)."""
    Invoice = apps.get_model("finance", "Invoice")
    qs = (
        Invoice.objects.filter(status="paid")
        .values("client_id")
        .annotate(
            total_rev=Sum("amount", output_field=DecimalField(max_digits=15, decimal_places=2)),
            order_count=Count("id"),
            first_paid=MinDate("paid_at"),
            last_paid=MaxDate("paid_at"),
        )
    )
    if scope is not None and scope.kind == "manager":
        qs = qs.filter(client_id__in=_scope_client_ids(scope))
    return qs


def compute_ltv(scope=None):
    rows = list(_paying_clients(scope))
    paying = len(rows)
    total_rev = sum(_decimal(r["total_rev"]) for r in rows)
    ltv = float(total_rev / paying) if paying else 0.0
    repeat = sum(1 for r in rows if r["order_count"] >= 2)
    avg_orders = round(sum(r["order_count"] for r in rows) / paying, 2) if paying else 0.0

    # Cohort LTV: by month of first purchase
    by_cohort = defaultdict(list)
    for r in rows:
        first = r["first_paid"]
        if first:
            by_cohort[f"{first:%Y-%m}"].append(_decimal(r["total_rev"]))
    ltv_by_cohort = {
        cohort: round(float(sum(vals) / len(vals)), 2) for cohort, vals in sorted(by_cohort.items())
    }
    return {
        "paying_clients": paying,
        "total_revenue": float(total_rev),
        "ltv": ltv,
        "avg_orders_per_client": avg_orders,
        "repeat_purchase_rate": _safe_rate(repeat, paying),
        "ltv_by_cohort": ltv_by_cohort,
    }


def compute_churn(period, scope=None):
    """Churn: clients active before the period with no activity during it."""
    Client = apps.get_model("clients", "Client")
    client_ids = _scope_client_ids(scope)

    active_base_qs = Client.objects.filter(
        invoices__status="paid", invoices__paid_at__lt=period.start
    )
    if client_ids is not None:
        active_base_qs = active_base_qs.filter(id__in=client_ids)
    active_base = set(active_base_qs.values_list("id", flat=True).distinct())

    if not active_base:
        return {"active_base": 0, "churned": 0, "churn_rate": 0.0, "retained": 0}

    active_now = set(
        Client.objects.filter(
            Q(invoices__status="paid", invoices__paid_at__gte=period.start)
            | Q(interactions__created_at__gte=period.start),
            id__in=active_base,
        )
        .values_list("id", flat=True)
        .distinct()
    )
    churned = active_base - active_now
    return {
        "active_base": len(active_base),
        "retained": len(active_now),
        "churned": len(churned),
        "churn_rate": _safe_rate(len(churned), len(active_base)),
    }


def compute_retention(scope=None, max_cohorts=12):
    """Cohort retention: % of each first-purchase cohort active per month."""
    rows = list(_paying_clients(scope))
    cohorts = defaultdict(set)  # cohort -> {client_id}
    client_months = defaultdict(set)

    for r in rows:
        first = r["first_paid"]
        last = r["last_paid"]
        if not first:
            continue
        cohort = _month_key(first)
        cohorts[cohort].add(r["client_id"])
        # All months between first and last purchase count as active months
        cursor = cohort
        end = _month_key(last or first)
        while cursor <= end:
            client_months[cursor].add(r["client_id"])
            cursor = _add_month(cursor)

    result = []
    for cohort in sorted(cohorts)[-max_cohorts:]:
        size = len(cohorts[cohort])
        row = {"cohort": f"{cohort:%Y-%m}", "size": size, "retention": []}
        cursor = cohort
        for offset in range(max_cohorts):
            active = len(client_months.get(cursor, set()) & cohorts[cohort])
            row["retention"].append(_safe_rate(active, size))
            cursor = _add_month(cursor)
        result.append(row)
    return result


def _add_month(dt):
    month = dt.month + 1
    year = dt.year
    if month > 12:
        month, year = 1, year + 1
    return dt.replace(year=year, month=month)


def _month_key(dt):
    """Normalize any datetime to its month bucket (first day, midnight UTC)."""
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


# --------------------------------------------------------------------------
# Breakdowns
# --------------------------------------------------------------------------


def _revenue_by_manager(period, scope=None):
    """Paid-invoice revenue attributed to managers via the client's latest won deal."""
    invoices = _paid_invoices(period).values("client_id", "amount")
    won_by_client = _won_lead_by_client()

    buckets = defaultdict(lambda: Decimal(0))
    for inv in invoices:
        manager = won_by_client.get(inv["client_id"])
        manager_id = manager[1] if manager else None
        buckets[f"u:{manager_id}" if manager_id else "u:"] += _decimal(inv["amount"])

    if scope is not None and scope.kind == "manager":
        key = f"u:{scope.user_id}"
        return {key: buckets.get(key, Decimal(0))}

    rows = []
    User = apps.get_model("accounts", "User")
    user_ids = [k[2:] for k in buckets if k.startswith("u:") and k[2:]]
    users = {str(u.id): u for u in User.objects.filter(id__in=user_ids)}
    for key, value in buckets.items():
        user_id = key[2:]
        user = users.get(user_id)
        rows.append(
            {
                "user_id": user_id or None,
                "user_name": user.get_full_name() or user.email if user else "Без менеджера",
                "revenue": float(value),
            }
        )
    return rows


def compute_sources(period, scope=None):
    """Efficiency per lead source: leads → won, revenue, CAC, ROI."""
    Client = apps.get_model("clients", "Client")
    SourceAcquisitionCost = apps.get_model("analytics", "SourceAcquisitionCost")

    won_at, lost_at = get_lead_outcomes()
    won_ids = {lid for lid, ts in won_at.items() if period.start <= ts < period.end}
    if scope is not None and scope.kind == "manager":
        won_ids &= set(_scope_lead_qs(scope).values_list("id", flat=True).distinct())

    # Costs within the period (by year/month)
    period_months = _months_in_range(period)
    costs = defaultdict(Decimal)
    for cost in SourceAcquisitionCost.objects.all().values("source", "year", "month", "amount"):
        if (cost["year"], cost["month"]) in period_months:
            costs[cost["source"]] += _decimal(cost["amount"])

    # New clients per source (in period)
    new_clients = defaultdict(int)
    for source, count in (
        Client.objects.filter(created_at__gte=period.start, created_at__lt=period.end)
        .values_list("source")
        .annotate(count=Count("id"))
    ):
        new_clients[source or "other"] = count

    # Revenue per source (paid invoices by client source)
    revenue_by_source = defaultdict(Decimal)
    for source, amount in (
        _paid_invoices(period).values_list("client__source").annotate(total=Sum("amount"))
    ):
        revenue_by_source[source or "other"] += _decimal(amount)

    from .constants import SOURCE_CHOICES

    rows = []
    for source in SOURCE_CHOICES:
        leads_qs = _scope_lead_qs(scope).filter(
            source=source, created_at__gte=period.start, created_at__lt=period.end
        )
        total_leads = leads_qs.count()
        qualified = len(get_qualified_lead_ids(leads_qs))
        deals = leads_qs.filter(current_stage_id__in=deal_stage_ids()).count()
        won = len({lid for lid in won_ids if lid in set(leads_qs.values_list("id", flat=True))})

        revenue = float(revenue_by_source.get(source, Decimal(0)))
        cost = float(costs.get(source, Decimal(0)))
        clients = new_clients.get(source, 0)
        cac = round(cost / clients, 2) if clients else 0.0
        roi = round((revenue - cost) / cost * 100, 1) if cost else 0.0
        rows.append(
            {
                "source": source,
                "leads": total_leads,
                "qualified": qualified,
                "deals": deals,
                "won": won,
                "conversion": _safe_rate(won, total_leads),
                "revenue": revenue,
                "cost": cost,
                "new_clients": clients,
                "cac": cac,
                "roi": roi,
            }
        )
    return rows


def _months_in_range(period):
    months = set()
    cursor = period.start.replace(day=1)
    end = period.end.replace(day=1)
    while cursor <= end:
        months.add((cursor.year, cursor.month))
        cursor = _add_month(cursor)
    return months


def compute_managers(period, scope=None):
    """Efficiency per sales manager."""
    Lead = apps.get_model("leads", "Lead")
    LeadHistory = apps.get_model("leads", "LeadHistory")
    User = apps.get_model("accounts", "User")

    won_at, lost_at = get_lead_outcomes()

    # All leads (any time) per manager for outcomes; period filter applies to won_at
    leads = list(
        Lead.objects.select_related("assigned_to")
        .filter(assigned_to_id__isnull=False)
        .values("id", "assigned_to_id", "current_stage_id", "created_at", "budget")
    )
    manager_ids = {lead["assigned_to_id"] for lead in leads}
    users = {u.id: u for u in User.objects.filter(id__in=manager_ids, is_active=True)}

    contacted_ids = set(
        LeadHistory.objects.filter(lead__assigned_to_id__isnull=False)
        .values_list("lead_id", flat=True)
        .distinct()
    )
    revenue_by_manager = {
        r["user_id"]: r["revenue"] for r in _revenue_by_manager(period) if r["user_id"]
    }

    per_manager = {}
    for lead in leads:
        mgr = lead["assigned_to_id"]
        if mgr not in per_manager:
            per_manager[mgr] = {
                "leads": 0,
                "contacted": 0,
                "deals": 0,
                "won": 0,
                "lost": 0,
                "won_budget": Decimal(0),
                "cycles": [],
            }
        info = per_manager[mgr]
        created_in_period = period.start <= lead["created_at"] < period.end
        if created_in_period:
            info["leads"] += 1
            if lead["id"] in contacted_ids:
                info["contacted"] += 1
            if lead["current_stage_id"] in deal_stage_ids():
                info["deals"] += 1
        won_ts = won_at.get(lead["id"])
        if won_ts and period.start <= won_ts < period.end:
            info["won"] += 1
            if lead["budget"] is not None:
                info["won_budget"] += _decimal(lead["budget"])
            info["cycles"].append((won_ts - lead["created_at"]).total_seconds() / 86400)
        lost_ts = lost_at.get(lead["id"])
        if lost_ts and period.start <= lost_ts < period.end:
            info["lost"] += 1

    if scope is not None and scope.kind == "manager":
        per_manager = {k: v for k, v in per_manager.items() if k == scope.user_id}

    rows = []
    for mgr_id, info in per_manager.items():
        user = users.get(mgr_id)
        if not user:
            continue
        won_budget = float(info["won_budget"])
        rows.append(
            {
                "user_id": str(mgr_id),
                "user_name": user.get_full_name() or user.email,
                "leads": info["leads"],
                "contacted": info["contacted"],
                "deals": info["deals"],
                "won": info["won"],
                "lost": info["lost"],
                "conversion": _safe_rate(info["won"], info["leads"]),
                "revenue": revenue_by_manager.get(str(mgr_id), 0.0),
                "avg_deal_size": round(won_budget / info["won"], 2) if info["won"] else 0.0,
                "sales_cycle": (
                    round(sum(info["cycles"]) / len(info["cycles"]), 1) if info["cycles"] else 0.0
                ),
            }
        )
    rows.sort(key=lambda r: r["revenue"], reverse=True)
    return rows


def revenue_dynamics(period, scope=None):
    """Revenue/expenses/profit series bucketed by day/week/month."""
    Expense = apps.get_model("finance", "Expense")
    Salary = apps.get_model("finance", "Salary")

    from .constants import period_granularity

    granularity = period_granularity(period.start, period.end)
    trunc = {"day": "%Y-%m-%d", "week": "%Y-W%W", "month": "%Y-%m"}

    rev_series = defaultdict(Decimal)
    for key, total in (
        _paid_invoices(period)
        .annotate(bucket=TruncDate("eff_paid"))
        .values_list("bucket")
        .annotate(total=Sum("amount"))
    ):
        if key:
            rev_series[key] += _decimal(total)

    exp_series = defaultdict(Decimal)
    for date, total in (
        Expense.objects.filter(
            expense_date__gte=period.start.date(), expense_date__lt=period.end.date()
        )
        .values_list("expense_date")
        .annotate(total=Sum("amount"))
    ):
        if date:
            exp_series[date] += _decimal(total)
    for date, total in (
        Salary.objects.filter(paid_at__gte=period.start.date(), paid_at__lt=period.end.date())
        .values_list("paid_at")
        .annotate(total=Sum("amount"))
    ):
        if date:
            exp_series[date] += _decimal(total)

    fmt = trunc.get(granularity, trunc["day"])
    points = {}
    for date in _date_range(period):
        key = date.strftime(fmt)
        rev = rev_series.get(date, Decimal(0))
        exp = exp_series.get(date, Decimal(0))
        points[key] = {
            "revenue": rev + points.get(key, {}).get("revenue", Decimal(0)),
            "expenses": exp + points.get(key, {}).get("expenses", Decimal(0)),
        }

    result = []
    for key in sorted(points):
        rev = points[key]["revenue"]
        exp = points[key]["expenses"]
        result.append(
            {
                "date": key,
                "revenue": float(rev),
                "expenses": float(exp),
                "profit": float(rev - exp),
            }
        )
    return {"granularity": granularity, "series": result}


def _date_range(period):
    start = period.start.date()
    end = min(period.end.date(), timezone.localdate())
    cursor = start
    while cursor <= end:
        yield cursor
        cursor += timedelta(days=1)


def compute_revenue_breakdown(period, scope=None):
    """Total revenue + dynamics + by manager / product / source."""
    money = _revenue_profit(period, scope)

    # By product (project service type)
    product_rows = []
    by_product = defaultdict(Decimal)
    for product, total in (
        _paid_invoices(period)
        .values_list("project__service_type__name")
        .annotate(total=Sum("amount"))
    ):
        by_product[product or "Без продукта"] += _decimal(total)
    for name, value in sorted(by_product.items(), key=lambda x: -x[1]):
        product_rows.append({"product": name, "revenue": float(value)})

    # By source (client source)
    by_source = defaultdict(Decimal)
    for source, total in (
        _paid_invoices(period).values_list("client__source").annotate(total=Sum("amount"))
    ):
        by_source[source or "other"] += _decimal(total)
    source_rows = [
        {"source": s, "revenue": float(v)}
        for s, v in sorted(by_source.items(), key=lambda x: -x[1])
    ]

    # Trend vs previous equal-length period
    prev_start, prev_end = previous_period(period.start, period.end)
    prev = _revenue_profit(Period(prev_start, prev_end), scope)

    return {
        "period": {
            "start": period.start.date().isoformat(),
            "end": (period.end - timedelta(microseconds=1)).date().isoformat(),
            "label": period.label,
        },
        "money": {k: float(v) for k, v in money.items()},
        "previous_period": {
            "revenue": float(prev["revenue"]),
            "net_profit": float(prev["net_profit"]),
        },
        "revenue_delta_pct": _safe_rate(money["revenue"] - prev["revenue"], prev["revenue"]),
        "dynamics": revenue_dynamics(period, scope),
        "by_manager": _revenue_by_manager(period, scope),
        "by_product": product_rows,
        "by_source": source_rows,
    }


# --------------------------------------------------------------------------
# Public cached entry points
# --------------------------------------------------------------------------


def get_summary(scope, period):
    def _compute():
        funnel = _funnel_counts(period, scope)
        money = _revenue_profit(period, scope)
        cycle = _sales_cycle(period, scope)
        deal_size = _avg_deal_size(period, scope)
        ltv = compute_ltv(scope)
        churn = compute_churn(period, scope)
        return {
            **{k: float(v) for k, v in money.items()},
            **funnel,
            "conversion_rate": _safe_rate(funnel["won_deals"], funnel["total_leads"]),
            "lead_to_qualified": _safe_rate(funnel["qualified_leads"], funnel["total_leads"]),
            "qualified_to_deal": _safe_rate(funnel["deals"], funnel["qualified_leads"]),
            "deal_to_won": _safe_rate(funnel["won_deals"], funnel["deals"]),
            "avg_deal_size": deal_size,
            "sales_cycle_days": cycle,
            "ltv": ltv["ltv"],
            "ltv_paying_clients": ltv["paying_clients"],
            "repeat_purchase_rate": ltv["repeat_purchase_rate"],
            "cac": _compute_cac(period, scope),
            "churn": churn,
            "profit_margin": _safe_rate(money["net_profit"], money["revenue"]),
        }

    return cached_metric("summary", scope.kind, scope.user_id, period, _compute)


def _compute_cac(period, scope=None):
    Client = apps.get_model("clients", "Client")
    SourceAcquisitionCost = apps.get_model("analytics", "SourceAcquisitionCost")
    period_months = _months_in_range(period)
    total_cost = sum(
        _decimal(c["amount"])
        for c in SourceAcquisitionCost.objects.all().values("year", "month", "amount")
        if (c["year"], c["month"]) in period_months
    )
    client_ids = _scope_client_ids(scope)
    new_clients_qs = Client.objects.filter(created_at__gte=period.start, created_at__lt=period.end)
    if client_ids is not None:
        new_clients_qs = new_clients_qs.filter(id__in=client_ids)
    new_clients = new_clients_qs.count()
    return round(float(total_cost) / new_clients, 2) if new_clients else 0.0


def get_funnel(scope, period):
    def _compute():
        funnel = _funnel_counts(period, scope)
        classification = get_stage_classification()
        stages = []
        from apps.leads.models import LeadStage

        for stage in LeadStage.objects.all().order_by("order"):
            stages.append(
                {
                    "stage_id": str(stage.id),
                    "name": stage.name,
                    "kind": classification.get(stage.id, "lead"),
                    "probability": stage.probability,
                }
            )
        return {
            **funnel,
            "conversion_rate": _safe_rate(funnel["won_deals"], funnel["total_leads"]),
            "lead_to_qualified": _safe_rate(funnel["qualified_leads"], funnel["total_leads"]),
            "qualified_to_deal": _safe_rate(funnel["deals"], funnel["qualified_leads"]),
            "deal_to_won": _safe_rate(funnel["won_deals"], funnel["deals"]),
            "stages": stages,
        }

    return cached_metric("funnel", scope.kind, scope.user_id, period, _compute)


def get_managers(scope, period):
    def _compute():
        return compute_managers(period, scope)

    return cached_metric("managers", scope.kind, scope.user_id, period, _compute)


def get_sources(scope, period):
    def _compute():
        return compute_sources(period, scope)

    return cached_metric("sources", scope.kind, scope.user_id, period, _compute)


def get_revenue_breakdown(scope, period):
    def _compute():
        return compute_revenue_breakdown(period, scope)

    return cached_metric("revenue", scope.kind, scope.user_id, period, _compute)


def get_ltv(scope):
    def _compute():
        return compute_ltv(scope)

    return cached_metric(
        "ltv", scope.kind, scope.user_id, Period(datetime.min, datetime.max), _compute
    )


def get_churn(scope, period):
    def _compute():
        return compute_churn(period, scope)

    return cached_metric("churn", scope.kind, scope.user_id, period, _compute)


def get_retention(scope):
    def _compute():
        return compute_retention(scope)

    return cached_metric(
        "retention", scope.kind, scope.user_id, Period(datetime.min, datetime.max), _compute
    )


def get_stage_config():
    """Expose the funnel mapping so admins can verify stage configuration."""
    classification = get_stage_classification()
    from apps.leads.models import LeadStage

    stages = []
    for stage in LeadStage.objects.all().order_by("order"):
        stages.append(
            {
                "stage_id": str(stage.id),
                "name": stage.name,
                "probability": stage.probability,
                "kind": classification.get(stage.id, "lead"),
            }
        )
    return {
        "won_probability": 100,
        "lost_probability": 0,
        "deal_min_probability": DEAL_MIN_PROBABILITY,
        "stages": stages,
    }
