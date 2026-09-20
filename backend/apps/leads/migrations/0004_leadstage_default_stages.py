"""Seed the default lead pipeline stages when the funnel is empty."""

from django.db import migrations

DEFAULT_LEAD_STAGES = [
    {"name": "Новая заявка", "order": 1, "probability": 10, "color": "#6366f1"},
    {"name": "Квалификация", "order": 2, "probability": 30, "color": "#f59e0b"},
    {"name": "Предложение", "order": 3, "probability": 50, "color": "#8b5cf6"},
    {"name": "Переговоры", "order": 4, "probability": 70, "color": "#0ea5e9"},
    {"name": "Сделка заключена", "order": 5, "probability": 100, "color": "#10b981"},
]


def create_default_stages(apps, schema_editor):
    LeadStage = apps.get_model("leads", "LeadStage")
    if LeadStage.objects.exists():
        return
    for item in DEFAULT_LEAD_STAGES:
        LeadStage.objects.create(**item)


class Migration(migrations.Migration):

    dependencies = [
        ("leads", "0003_lead_leads_lead_created_302c6d_idx_and_more"),
    ]

    operations = [
        migrations.RunPython(create_default_stages, migrations.RunPython.noop),
    ]
