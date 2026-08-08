"""Caching helpers for the Business Analytics module.

Strategy:
- A global ``analytics:data_version`` counter is bumped by signals whenever
  underlying data changes (leads, invoices, clients, costs, ...). Every cache
  key embeds the version, so a single increment invalidates all analytics
  cache entries at once.
- Computed breakdowns are cached in the default cache (Redis in prod,
  LocMem in local/test) with a short TTL (``ANALYTICS.CACHE_TTL_SECONDS``).
- Daily additive KPIs are materialized in ``BusinessMetricsSnapshot`` by a
  periodic Celery task — those queries never hit live aggregates.
"""

import hashlib
import json

from django.core.cache import cache

from .constants import CACHE_TTL_SECONDS

_VERSION_KEY = "analytics:data_version"
_PREFIX = "analytics:metric"


def get_data_version():
    return cache.get(_VERSION_KEY, 0)


def bump_data_version():
    try:
        cache.incr(_VERSION_KEY)
    except ValueError:
        # Key missing or not an int (e.g. fresh LocMem) — set explicitly
        cache.set(_VERSION_KEY, get_data_version() + 1, timeout=None)
    return get_data_version()


def _stable_key(**parts):
    payload = json.dumps(parts, sort_keys=True, default=str)
    return hashlib.sha256(payload.encode()).hexdigest()[:24]


def analytics_cache_key(metric, scope_kind, user_id, period, **filters):
    stable = _stable_key(period=period, **filters)
    return f"{_PREFIX}:v{get_data_version()}:{scope_kind}:{user_id}:" f"{metric}:{stable}"


def get_cached_metric(key):
    return cache.get(key)


def set_cached_metric(key, value, ttl=None):
    cache.set(key, value, timeout=ttl or CACHE_TTL_SECONDS)
    return value


def cached_metric(metric, scope_kind, user_id, period, compute, **filters):
    """Get from cache or compute; compute result is cached for the TTL."""
    key = analytics_cache_key(metric, scope_kind, user_id, period, **filters)
    value = cache.get(key)
    if value is None:
        value = compute()
        cache.set(key, value, timeout=CACHE_TTL_SECONDS)
    return value
