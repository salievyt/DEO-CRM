from django.db import migrations

DEFAULT_STATUSES = [
    {"name": "К выполнению", "order": 0, "color": "#94a3b8"},
    {"name": "В работе", "order": 1, "color": "#3b82f6"},
    {"name": "На проверке", "order": 2, "color": "#f59e0b"},
    {"name": "Готово", "order": 3, "color": "#22c55e"},
    {"name": "Отложено", "order": 4, "color": "#8b5cf6"},
]

DEFAULT_PRIORITIES = [
    {"name": "Низкий", "level": 0, "color": "#94a3b8"},
    {"name": "Средний", "level": 1, "color": "#22c55e"},
    {"name": "Высокий", "level": 2, "color": "#f59e0b"},
    {"name": "Критический", "level": 3, "color": "#ef4444"},
]


def seed_task_defaults(apps, schema_editor):
    TaskStatus = apps.get_model("tasks", "TaskStatus")
    TaskPriority = apps.get_model("tasks", "TaskPriority")

    for item in DEFAULT_STATUSES:
        TaskStatus.objects.get_or_create(
            name=item["name"],
            defaults={"order": item["order"], "color": item["color"]},
        )

    for item in DEFAULT_PRIORITIES:
        TaskPriority.objects.get_or_create(
            name=item["name"],
            defaults={"level": item["level"], "color": item["color"]},
        )


class Migration(migrations.Migration):

    dependencies = [
        ("tasks", "0002_alter_task_project"),
    ]

    operations = [
        migrations.RunPython(seed_task_defaults, migrations.RunPython.noop),
    ]
