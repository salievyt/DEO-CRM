from django.db import migrations

DEFAULT_STATUSES = [
    {"name": "Новый", "color": "#6366f1", "order": 1},
    {"name": "Активный", "color": "#22c55e", "order": 2},
    {"name": "VIP", "color": "#eab308", "order": 3},
    {"name": "Неактивный", "color": "#94a3b8", "order": 4},
    {"name": "В зоне риска", "color": "#f97316", "order": 5},
    {"name": "Потерянный", "color": "#ef4444", "order": 6},
]


def seed_statuses(apps, schema_editor):
    ClientStatus = apps.get_model("clients", "ClientStatus")
    for item in DEFAULT_STATUSES:
        ClientStatus.objects.get_or_create(
            name=item["name"],
            defaults={
                "color": item["color"],
                "order": item["order"],
                "is_system": True,
            },
        )


def remove_statuses(apps, schema_editor):
    ClientStatus = apps.get_model("clients", "ClientStatus")
    ClientStatus.objects.filter(
        name__in=[item["name"] for item in DEFAULT_STATUSES],
        is_system=True,
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("clients", "0004_clientstatus_client_status"),
    ]

    operations = [
        migrations.RunPython(seed_statuses, remove_statuses),
    ]
