"""Funnel stage classification and lead outcome resolution.

DEO CRM models deals as leads moving through configurable stages
(``LeadStage``). A stage is classified as *won* / *lost* / *deal* / *lead*.

Classification rules (documented in docs/business-analytics.md):

1. If **any** stage has a non-zero ``probability``, probabilities are
   considered configured and are authoritative:

   * ``probability >= 100`` → won
   * ``probability <= 0``   → lost
   * ``probability >= 50``  → deal (working opportunity)
   * otherwise              → lead

2. If **all** stages have ``probability == 0`` (common misconfiguration),
   stage names are matched against won/lost keywords as a fallback so real
   deployments still produce meaningful analytics.
"""

from django.apps import apps

from .constants import StageKind, classify_stage_keyword, classify_stage_probability


def _classification_cache():
    key = "_analytics_stage_classification"
    cached = getattr(get_stage_classification, key, None)
    if cached is not None:
        return cached
    classification = _compute_classification()
    setattr(get_stage_classification, key, classification)
    return classification


def _compute_classification():
    LeadStage = apps.get_model("leads", "LeadStage")
    stages = list(LeadStage.objects.all().only("id", "probability", "name"))
    configured = any(s.probability != 0 for s in stages)

    classification = {}
    for stage in stages:
        if configured:
            kind = classify_stage_probability(stage.probability, stage.name)
        else:
            kind = classify_stage_keyword(stage.name) or StageKind.LEAD
        classification[stage.id] = kind
    return classification


def get_stage_classification():
    """Return ``{stage_id: StageKind}`` for every funnel stage (cached)."""
    return _classification_cache()


def clear_stage_classification_cache():
    key = "_analytics_stage_classification"
    if hasattr(get_stage_classification, key):
        delattr(get_stage_classification, key)


def stage_ids_of_kind(kind):
    return {sid for sid, k in get_stage_classification().items() if k == kind}


def won_stage_ids():
    return stage_ids_of_kind(StageKind.WON)


def lost_stage_ids():
    return stage_ids_of_kind(StageKind.LOST)


def deal_stage_ids():
    return stage_ids_of_kind(StageKind.DEAL)


def get_lead_outcomes():
    """Return ``(won_at, lost_at)`` timestamps per lead id.

    The timestamp is the first time the lead entered a won/lost stage
    (from ``LeadHistory``). Leads currently sitting in a won/lost stage
    without history use ``created_at`` as a fallback.
    """
    Lead = apps.get_model("leads", "Lead")
    LeadHistory = apps.get_model("leads", "LeadHistory")

    won_ids = won_stage_ids()
    lost_ids = lost_stage_ids()

    won_at = {}
    lost_at = {}

    history_qs = (
        LeadHistory.objects.filter(to_stage_id__in=won_ids | lost_ids)
        .order_by("created_at", "id")
        .values_list("lead_id", "to_stage_id", "created_at")
    )
    for lead_id, stage_id, created_at in history_qs:
        if stage_id in won_ids and lead_id not in won_at:
            won_at[lead_id] = created_at
        if stage_id in lost_ids and lead_id not in lost_at:
            lost_at[lead_id] = created_at

    # Fallback for leads already in an outcome stage without history
    fallback = (
        Lead.objects.filter(current_stage_id__in=won_ids | lost_ids)
        .exclude(id__in=set(won_at) | set(lost_at))
        .values_list("id", "current_stage_id", "created_at")
    )
    for lead_id, stage_id, created_at in fallback:
        if stage_id in won_ids:
            won_at[lead_id] = created_at
        elif stage_id in lost_ids:
            lost_at[lead_id] = created_at

    return won_at, lost_at


def get_qualified_lead_ids(leads_qs):
    """Leads that were worked (have stage history) or reached a deal stage."""
    LeadHistory = apps.get_model("leads", "LeadHistory")
    lead_ids = set(leads_qs.values_list("id", flat=True))
    if not lead_ids:
        return set()

    history_lead_ids = set(
        LeadHistory.objects.filter(lead_id__in=lead_ids)
        .values_list("lead_id", flat=True)
        .distinct()
    )
    in_deal_stage = set(
        leads_qs.filter(current_stage_id__in=deal_stage_ids()).values_list("id", flat=True)
    )
    return history_lead_ids | in_deal_stage
