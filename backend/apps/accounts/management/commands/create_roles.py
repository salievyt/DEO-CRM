from django.core.management.base import BaseCommand

from apps.accounts.choices import RoleChoices
from apps.accounts.models import Permission, Role


class Command(BaseCommand):
    help = "Create default roles and permissions"

    def handle(self, *args, **options):
        self.stdout.write("Creating roles...")

        roles_data = {
            RoleChoices.SUPERADMIN: "Полный доступ ко всем функциям системы",
            RoleChoices.OWNER: "Доступ к аналитике, финансам, проектам и сотрудникам",
            RoleChoices.PROJECT_MANAGER: "Управление клиентами, проектами и задачами",
            RoleChoices.DEVELOPER: "Доступ к назначенным задачам и проектам",
            RoleChoices.DESIGNER: "Работа с дизайн-задачами и макетами",
            RoleChoices.MARKETER: "Маркетинговые проекты и аналитика",
            RoleChoices.CLIENT: "Доступ к своим проектам, документам и счетам",
        }

        for role_name, description in roles_data.items():
            Role.objects.update_or_create(
                name=role_name,
                defaults={"description": description},
            )
            self.stdout.write(f"  ✅ {role_name}")

        self.stdout.write("\nCreating permissions...")

        permissions = [
            ("view_client", "Просмотр клиентов"),
            ("create_client", "Создание клиентов"),
            ("edit_client", "Редактирование клиентов"),
            ("delete_client", "Удаление клиентов"),
            ("view_lead", "Просмотр лидов"),
            ("create_lead", "Создание лидов"),
            ("move_lead", "Перемещение лидов по воронке"),
            ("view_project", "Просмотр проектов"),
            ("create_project", "Создание проектов"),
            ("edit_project", "Редактирование проектов"),
            ("view_task", "Просмотр задач"),
            ("create_task", "Создание задач"),
            ("assign_task", "Назначение задач"),
            ("view_finance", "Просмотр финансов"),
            ("view_report", "Просмотр отчетов"),
            ("view_analytics", "Просмотр аналитики"),
            ("use_ai", "Использование AI ассистента"),
            ("manage_users", "Управление пользователями"),
            ("manage_roles", "Управление ролями"),
            ("manage_settings", "Управление настройками"),
        ]

        for codename, name in permissions:
            Permission.objects.update_or_create(
                codename=codename,
                defaults={"name": name},
            )
            self.stdout.write(f"  ✅ {codename}")

        self.stdout.write(self.style.SUCCESS("\n✅ Роли и разрешения успешно созданы!"))
