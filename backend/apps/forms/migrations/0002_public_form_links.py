import uuid

from django.db import migrations, models


def populate_public_tokens(apps, schema_editor):
    FormTemplate = apps.get_model("forms", "FormTemplate")
    for form in FormTemplate.objects.filter(public_token__isnull=True).iterator():
        form.public_token = uuid.uuid4()
        form.save(update_fields=["public_token"])


class Migration(migrations.Migration):
    dependencies = [("forms", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="formtemplate",
            name="public_link_expires_at",
            field=models.DateTimeField(
                blank=True, null=True, verbose_name="Публичная ссылка действует до"
            ),
        ),
        migrations.AddField(
            model_name="formtemplate",
            name="public_token",
            field=models.UUIDField(null=True, editable=False, verbose_name="Публичный токен"),
        ),
        migrations.RunPython(populate_public_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="formtemplate",
            name="public_token",
            field=models.UUIDField(
                default=uuid.uuid4,
                editable=False,
                unique=True,
                verbose_name="Публичный токен",
            ),
        ),
    ]
