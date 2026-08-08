"""Cache invalidation for the Business Analytics module.

Whenever analytics-relevant data changes (leads, stages, invoices, payments,
expenses, salaries, clients, interactions, acquisition costs) the global
analytics data-version counter is bumped. Every analytics cache key embeds
that version, so a single increment invalidates all cached breakdowns at once.
"""

import logging

from django.db.models.signals import post_delete, post_save

logger = logging.getLogger(__name__)


def _bump(sender, instance, **kwargs):
    from .caching import bump_data_version

    try:
        bump_data_version()
    except Exception:  # pragma: no cover — never break writes because of cache
        logger.exception("Failed to bump analytics data version")


def _bump_and_clear_stages(sender, instance, **kwargs):
    from .funnel import clear_stage_classification_cache

    clear_stage_classification_cache()
    _bump(sender, instance)


def connect_signals():
    """Connect signals once apps are loaded (called from AppConfig.ready)."""
    from django.apps import apps as django_apps

    from apps.analytics.models import SourceAcquisitionCost

    models = [
        django_apps.get_model("leads", "Lead"),
        django_apps.get_model("finance", "Invoice"),
        django_apps.get_model("finance", "Payment"),
        django_apps.get_model("finance", "Expense"),
        django_apps.get_model("finance", "Salary"),
        django_apps.get_model("clients", "Client"),
        django_apps.get_model("clients", "ClientInteraction"),
        SourceAcquisitionCost,
    ]
    for model in models:
        post_save.connect(
            _bump,
            sender=model,
            weak=False,
            dispatch_uid=f"analytics-bump-{model._meta.label_lower}",
        )
        post_delete.connect(
            _bump,
            sender=model,
            weak=False,
            dispatch_uid=f"analytics-bump-del-{model._meta.label_lower}",
        )

    # Stage probability changes alter the funnel classification itself
    LeadStage = django_apps.get_model("leads", "LeadStage")
    post_save.connect(
        _bump_and_clear_stages, sender=LeadStage, weak=False, dispatch_uid="analytics-bump-stage"
    )
    post_delete.connect(
        _bump_and_clear_stages,
        sender=LeadStage,
        weak=False,
        dispatch_uid="analytics-bump-stage-del",
    )
