"""Constants for the Business Analytics module.

All thresholds are overridable via ``settings.ANALYTICS``.
"""

from datetime import datetime, time, timedelta

from django.conf import settings
from django.utils import timezone


def _cfg(key, default):
    return settings.ANALYTICS.get(key, default) if hasattr(settings, "ANALYTICS") else default


# Funnel thresholds (percent)
WON_PROBABILITY = _cfg("WON_PROBABILITY", 100)
LOST_PROBABILITY = _cfg("LOST_PROBABILITY", 0)
QUALIFIED_MIN_PROBABILITY = _cfg("QUALIFIED_MIN_PROBABILITY", 50)
DEAL_MIN_PROBABILITY = _cfg("DEAL_MIN_PROBABILITY", 50)

# Cache TTL for computed breakdowns (seconds)
CACHE_TTL_SECONDS = _cfg("CACHE_TTL_SECONDS", 900)

# How many days of snapshots the periodic task refreshes
SNAPSHOT_DAYS = _cfg("SNAPSHOT_DAYS", 400)

# Lead source choices (mirrors clients.Client.SOURCE_CHOICES)
SOURCE_CHOICES = [
    "website",
    "referral",
    "instagram",
    "facebook",
    "telegram",
    "call",
    "other",
]

# Fallback stage-name keyword mapping used when stages are not configured
# with probabilities (e.g. all stages default to probability=0).
WON_STAGE_KEYWORDS = ("won", "побед", "успех", "выигр", "закрыт", "оплачен")
LOST_STAGE_KEYWORDS = ("lost", "проигр", "отказ", "потер", "не интересн", "неактуальн")


class StageKind:
    LEAD = "lead"
    DEAL = "deal"
    WON = "won"
    LOST = "lost"


def classify_stage_probability(probability, name=""):
    """Classify a stage by its configured win probability (authoritative)."""
    if probability >= WON_PROBABILITY:
        return StageKind.WON
    if probability <= LOST_PROBABILITY:
        return StageKind.LOST
    if probability >= DEAL_MIN_PROBABILITY:
        return StageKind.DEAL
    return StageKind.LEAD


def classify_stage_keyword(name):
    """Keyword fallback used when probabilities are not configured."""
    name = (name or "").lower()
    if any(k in name for k in WON_STAGE_KEYWORDS):
        return StageKind.WON
    if any(k in name for k in LOST_STAGE_KEYWORDS):
        return StageKind.LOST
    return None


class PeriodKeys:
    TODAY = "today"
    YESTERDAY = "yesterday"
    DAYS_7 = "7d"
    DAYS_30 = "30d"
    DAYS_90 = "90d"
    YEAR = "year"
    CUSTOM = "custom"


PERIOD_PRESETS = {
    PeriodKeys.TODAY: 0,
    PeriodKeys.YESTERDAY: 1,
    PeriodKeys.DAYS_7: 7,
    PeriodKeys.DAYS_30: 30,
    PeriodKeys.DAYS_90: 90,
    PeriodKeys.YEAR: 365,
}


def resolve_period(period_key=None, start_date=None, end_date=None, now=None):
    """Resolve a date range into (start_dt, end_dt) aware datetimes.

    ``end_dt`` is exclusive. Supports presets (today/yesterday/7d/30d/90d/year)
    and a custom range via ``start_date``/``end_date`` (inclusive dates).
    """
    now = now or timezone.localtime()
    today = now.date()

    if start_date and end_date:
        start_dt = timezone.make_aware(datetime.combine(start_date, time.min))
        end_dt = timezone.make_aware(datetime.combine(end_date, time.max))
        end_dt += timedelta(microseconds=1)
        return start_dt, end_dt

    key = period_key or PeriodKeys.DAYS_30

    if key == PeriodKeys.TODAY:
        start = today
        end = today + timedelta(days=1)
    elif key == PeriodKeys.YESTERDAY:
        start = today - timedelta(days=1)
        end = today
    elif key == PeriodKeys.YEAR:
        start = today.replace(month=1, day=1)
        end = today + timedelta(days=1)
    else:
        days = PERIOD_PRESETS.get(key, 30)
        start = today - timedelta(days=days - 1)
        end = today + timedelta(days=1)

    start_dt = timezone.make_aware(datetime.combine(start, time.min))
    end_dt = timezone.make_aware(datetime.combine(end, time.min))
    return start_dt, end_dt


def period_granularity(start_dt, end_dt):
    """Pick chart granularity for the revenue dynamics series."""
    days = (end_dt - start_dt).days
    if days <= 45:
        return "day"
    if days <= 180:
        return "week"
    return "month"


def previous_period(start_dt, end_dt):
    """Return the period of equal length immediately before ``start_dt``."""
    length = end_dt - start_dt
    return start_dt - length, start_dt
