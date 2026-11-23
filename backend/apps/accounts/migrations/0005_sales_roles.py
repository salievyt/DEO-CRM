"""Add the sales department roles: sales head and sales manager.

Same pattern as ``0004_hr_role``: the choice change is schema-only and the
data step creates the Role rows so the roles are assignable right after
deploy. The reverse step keeps a row while any user still has that role.
"""

from django.db import migrations, models

SALES_ROLES = {
    "sales_head": "Руководитель отдела продаж: команда, лиды, сделки, D2C",
    "sales_manager": "Отдел продаж: обзвон D2C, лиды и сделки",
}


def create_sales_roles(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    for name, description in SALES_ROLES.items():
        Role.objects.get_or_create(name=name, defaults={"description": description})


def remove_sales_roles(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    User = apps.get_model("accounts", "User")
    for name in SALES_ROLES:
        if not User.objects.filter(role__name=name).exists():
            Role.objects.filter(name=name).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_hr_role"),
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
                    ("sales_head", "Управляющий менеджер"),
                    ("sales_manager", "Менеджер по продажам"),
                    ("client", "Клиент"),
                ],
                max_length=50,
                unique=True,
                verbose_name="Название",
            ),
        ),
        migrations.RunPython(create_sales_roles, remove_sales_roles),
    ]
