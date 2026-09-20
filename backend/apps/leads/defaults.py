"""Default lead pipeline stages (sales funnel).

Used to seed a brand-new funnel via a data migration and as a runtime
fallback when a funnel has no stages at all (e.g. a form submission or a
public lead form arrives before any stage has been configured).
"""

DEFAULT_LEAD_STAGES = [
    {"name": "Новая заявка", "order": 1, "probability": 10, "color": "#6366f1"},
    {"name": "Квалификация", "order": 2, "probability": 30, "color": "#f59e0b"},
    {"name": "Предложение", "order": 3, "probability": 50, "color": "#8b5cf6"},
    {"name": "Переговоры", "order": 4, "probability": 70, "color": "#0ea5e9"},
    {"name": "Сделка заключена", "order": 5, "probability": 100, "color": "#10b981"},
]


def ensure_default_stages():
    """Create the default stages if the funnel is empty.

    Returns the list of created stages, or an empty list when a funnel
    already exists.
    """
    from .models import LeadStage

    if LeadStage.objects.exists():
        return []
    stages = [LeadStage.objects.create(**item) for item in DEFAULT_LEAD_STAGES]
    return stages
