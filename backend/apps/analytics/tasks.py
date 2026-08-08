"""Periodic Celery tasks for the Business Analytics module."""

import logging

from celery import shared_task

from .constants import PeriodKeys, resolve_period
from .services import (
    AnalyticsScope,
    Period,
    get_funnel,
    get_managers,
    get_revenue_breakdown,
    get_sources,
    get_summary,
)

logger = logging.getLogger(__name__)


@shared_task
def refresh_business_analytics_snapshot():
    """Recompute daily BusinessMetricsSnapshot rows for the default window."""
    from .snapshots import rebuild_snapshots, snapshot_range

    start, end = snapshot_range()
    count = rebuild_snapshots(start, end)
    logger.info("Business analytics snapshot refreshed: %s days (%s → %s)", count, start, end)
    return f"Snapshot refreshed: {count} days"


@shared_task
def prewarm_business_analytics_cache():
    """Pre-warm cached breakdowns for the standard periods (company scope)."""
    scope = AnalyticsScope(kind="company", user_id=None)
    results = {}
    for key in (
        PeriodKeys.TODAY,
        PeriodKeys.YESTERDAY,
        PeriodKeys.DAYS_7,
        PeriodKeys.DAYS_30,
        PeriodKeys.DAYS_90,
        PeriodKeys.YEAR,
    ):
        start_dt, end_dt = resolve_period(period_key=key)
        period = Period(start_dt, end_dt, label=key)
        get_summary(scope, period)
        get_revenue_breakdown(scope, period)
        get_funnel(scope, period)
        get_managers(scope, period)
        get_sources(scope, period)
        results[key] = "ok"
    logger.info("Business analytics cache pre-warmed for %s periods", len(results))
    return results
