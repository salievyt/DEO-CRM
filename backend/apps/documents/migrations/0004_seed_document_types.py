from django.db import migrations

DOCUMENT_TYPES = [
    ("contract", "Договор"),
    ("invoice", "Счёт"),
    ("act", "Акт"),
    ("proposal", "Коммерческое предложение"),
    ("specification", "Техническое задание"),
    ("brief", "Бриф"),
    ("presentation", "Презентация"),
    ("report", "Отчёт"),
    ("design", "Макет"),
    ("other", "Прочее"),
]


def seed_types(apps, schema_editor):
    Document = apps.get_model("documents", "Document")
    DocumentType = apps.get_model("documents", "DocumentType")
    Document.objects.filter(status="final").update(status="approved")
    for code, name in DOCUMENT_TYPES:
        DocumentType.objects.update_or_create(code=code, defaults={"name": name})


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0003_document_allowed_roles_document_approval_assignee_and_more")
    ]
    operations = [migrations.RunPython(seed_types, migrations.RunPython.noop)]
