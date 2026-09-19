from django.db import migrations


PROJECT_STATUSES = [
    {"name": "Новый", "order": 0, "color": "#64748b"},
    {"name": "Переговоры", "order": 1, "color": "#f59e0b"},
    {"name": "Брифинг", "order": 2, "color": "#8b5cf6"},
    {"name": "Оценка", "order": 3, "color": "#a855f7"},
    {"name": "Согласование", "order": 4, "color": "#d946ef"},
    {"name": "Планирование", "order": 5, "color": "#0ea5e9"},
    {"name": "В работе", "order": 6, "color": "#22c55e"},
    {"name": "На проверке", "order": 7, "color": "#06b6d4"},
    {"name": "Правки", "order": 8, "color": "#f97316"},
    {"name": "Готов к запуску", "order": 9, "color": "#14b8a6"},
    {"name": "Запущен", "order": 10, "color": "#10b981"},
    {"name": "На паузе", "order": 11, "color": "#94a3b8"},
    {"name": "Поддержка", "order": 12, "color": "#6366f1"},
    {"name": "Завершён", "order": 13, "color": "#3b82f6"},
    {"name": "Отменён", "order": 14, "color": "#ef4444"},
]


def expand_project_statuses(apps, schema_editor):
    ProjectStatus = apps.get_model("projects", "ProjectStatus")
    for item in PROJECT_STATUSES:
        ProjectStatus.objects.update_or_create(
            name=item["name"],
            defaults={"order": item["order"], "color": item["color"]},
        )


class Migration(migrations.Migration):
    dependencies = [("projects", "0002_seed_project_defaults")]

    operations = [
        migrations.RunPython(expand_project_statuses, migrations.RunPython.noop),
    ]
