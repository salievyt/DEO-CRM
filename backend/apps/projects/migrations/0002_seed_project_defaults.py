from django.db import migrations


PROJECT_STATUSES = [
    {"name": "Переговоры", "order": 0, "color": "#f59e0b"},
    {"name": "В работе", "order": 1, "color": "#22c55e"},
    {"name": "На паузе", "order": 2, "color": "#94a3b8"},
    {"name": "Завершён", "order": 3, "color": "#3b82f6"},
    {"name": "Отменён", "order": 4, "color": "#ef4444"},
]

SERVICE_TYPES = [
    {"name": "Веб-разработка", "description": "Разработка сайтов и веб-приложений"},
    {"name": "Мобильная разработка", "description": "Разработка iOS и Android приложений"},
    {"name": "Веб-дизайн", "description": "Дизайн сайтов и интерфейсов"},
    {"name": "Графический дизайн", "description": "Фирменный стиль и полиграфия"},
    {"name": "Маркетинг", "description": "SEO, контекстная реклама и SMM"},
    {"name": "CRM-системы", "description": "Внедрение и разработка CRM"},
    {"name": "Поддержка", "description": "Техническая поддержка и сопровождение"},
]


def seed_project_defaults(apps, schema_editor):
    ProjectStatus = apps.get_model("projects", "ProjectStatus")
    ServiceType = apps.get_model("projects", "ServiceType")

    for item in PROJECT_STATUSES:
        ProjectStatus.objects.update_or_create(
            name=item["name"],
            defaults={"order": item["order"], "color": item["color"]},
        )

    for item in SERVICE_TYPES:
        ServiceType.objects.update_or_create(
            name=item["name"],
            defaults={"description": item["description"]},
        )


class Migration(migrations.Migration):
    dependencies = [("projects", "0001_initial")]

    operations = [
        migrations.RunPython(seed_project_defaults, migrations.RunPython.noop),
    ]
