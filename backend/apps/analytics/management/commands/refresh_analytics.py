from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.analytics.constants import SNAPSHOT_DAYS


class Command(BaseCommand):
    help = (
        "Rebuild BusinessMetricsSnapshot rows and pre-warm the analytics cache.\n"
        "Usage: python manage.py refresh_analytics "
        "[--days 400] [--from YYYY-MM-DD] [--to YYYY-MM-DD]"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=SNAPSHOT_DAYS,
            help="How many days back to (re)build",
        )
        parser.add_argument(
            "--from",
            dest="start_date",
            help="Start date (YYYY-MM-DD), overrides --days",
        )
        parser.add_argument(
            "--to",
            dest="end_date",
            help="End date (YYYY-MM-DD), defaults to today",
        )

    def handle(self, *args, **options):
        from apps.analytics.caching import bump_data_version
        from apps.analytics.snapshots import rebuild_snapshots

        today = timezone.localdate()
        if options.get("start_date"):
            from datetime import date as date_cls

            start = date_cls.fromisoformat(options["start_date"])
        else:
            start = today - timedelta(days=options["days"] - 1)
        if options.get("end_date"):
            end = date_cls.fromisoformat(options["end_date"])
        else:
            end = today

        count = rebuild_snapshots(start, end)
        bump_data_version()
        self.stdout.write(
            self.style.SUCCESS(f"✅ Snapshot refreshed: {count} days ({start} → {end})")
        )

        # Pre-warm standard periods
        from apps.analytics.services import (
            AnalyticsScope,
            Period,
            get_funnel,
            get_managers,
            get_revenue_breakdown,
            get_sources,
            get_summary,
        )
        from apps.analytics.constants import PeriodKeys, resolve_period

        scope = AnalyticsScope(kind="company", user_id=None)
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
        self.stdout.write(self.style.SUCCESS("✅ Analytics cache pre-warmed for standard periods"))
