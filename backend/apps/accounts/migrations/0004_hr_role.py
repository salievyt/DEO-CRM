"""Add the HR manager role.

The choice change is schema-only (no DDL on PostgreSQL). The data step creates
the ``hr`` Role row so the role is assignable right after deploy, without
running ``create_roles`` manually. Both directions are idempotent; the reverse
step keeps the row if any user still has the role, so rolling back never
silently strips a role from a user.
"""

from django.db import migrations, models

HR_ROLE = "hr"
HR_DESCRIPTION = "Опросы сотрудников: создание, результаты, экспорт"


def create_hr_role(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    Role.objects.get_or_create(name=HR_ROLE, defaults={"description": HR_DESCRIPTION})


def remove_hr_role(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    User = apps.get_model("accounts", "User")
    if User.objects.filter(role__name=HR_ROLE).exists():
        return
    Role.objects.filter(name=HR_ROLE).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_recoverycode"),
    ]

    operations = [
        migrations.AlterField(
            model_name="role",
            name="name",
            field=models.CharField(
                choices=[
                    ("superadmin", "Super Admin"),
                    ("owner", "Владелец компании"),
                    ("project_manager", "Менеджер проекта"),
                    ("developer", "Разработчик"),
                    ("designer", "Дизайнер"),
                    ("marketer", "Маркетолог"),
                    ("hr", "HR-менеджер"),
                    ("client", "Клиент"),
                ],
                max_length=50,
                unique=True,
                verbose_name="Название",
            ),
        ),
        migrations.RunPython(create_hr_role, remove_hr_role),
    ]
