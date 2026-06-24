from django.core.management.base import BaseCommand

from apps.accounts.choices import RoleChoices
from apps.accounts.models import Role, User
from apps.finance.models import ExpenseCategory
from apps.leads.models import LeadStage
from apps.projects.models import ProjectStatus, ServiceType
from apps.tasks.models import TaskPriority, TaskStatus


class Command(BaseCommand):
    help = "Seed database with demo data"

    def handle(self, *args, **options):
        self.stdout.write("Seeding demo data...")

        self._seed_reference_data()
        self._seed_users()

        self.stdout.write(self.style.SUCCESS("\n✅ Демо-данные успешно загружены!"))
        self.stdout.write("\n📋 Учетные данные:")
        self.stdout.write("   SuperAdmin: admin@deostudio.com / admin123")
        self.stdout.write("   Owner:      owner@deostudio.com / owner123")
        self.stdout.write("   PM:         pm@deostudio.com / pm123")
        self.stdout.write("   Developer:  dev@deostudio.com / dev123")
        self.stdout.write("   Designer:   designer@deostudio.com / designer123")
        self.stdout.write("   Marketer:   marketer@deostudio.com / marketer123")
        self.stdout.write("   Client:     client@deostudio.com / client123")

    def _seed_reference_data(self):
        """Создание справочных данных."""
        self.stdout.write("\n  --- Справочники ---")

        # --- Этапы воронки (LeadStage) ---
        lead_stages = [
            {"name": "Новые заявки", "order": 0, "probability": 10, "color": "#94a3b8"},
            {"name": "Квалификация", "order": 1, "probability": 20, "color": "#60a5fa"},
            {"name": "Встреча/Звонок", "order": 2, "probability": 40, "color": "#818cf8"},
            {"name": "Коммерческое предложение", "order": 3, "probability": 60, "color": "#a78bfa"},
            {"name": "Переговоры", "order": 4, "probability": 80, "color": "#f59e0b"},
            {"name": "Успешно", "order": 5, "probability": 100, "color": "#22c55e"},
            {"name": "Закрыто (не успешно)", "order": 6, "probability": 0, "color": "#ef4444"},
        ]
        for data in lead_stages:
            obj, created = LeadStage.objects.update_or_create(
                name=data["name"], defaults=data
            )
            if created:
                self.stdout.write(f"  ✅ Этап воронки: {obj.name}")
            else:
                self.stdout.write(f"  🔄 Этап воронки: {obj.name} (обновлён)")

        # --- Статусы проектов (ProjectStatus) ---
        project_statuses = [
            {"name": "Переговоры", "order": 0, "color": "#f59e0b"},
            {"name": "В работе", "order": 1, "color": "#22c55e"},
            {"name": "На паузе", "order": 2, "color": "#94a3b8"},
            {"name": "Завершён", "order": 3, "color": "#3b82f6"},
            {"name": "Отменён", "order": 4, "color": "#ef4444"},
        ]
        for data in project_statuses:
            obj, created = ProjectStatus.objects.update_or_create(
                name=data["name"], defaults=data
            )
            if created:
                self.stdout.write(f"  ✅ Статус проекта: {obj.name}")
            else:
                self.stdout.write(f"  🔄 Статус проекта: {obj.name} (обновлён)")

        # --- Типы услуг (ServiceType) ---
        service_types = [
            {"name": "Веб-разработка", "description": "Разработка сайтов и веб-приложений"},
            {"name": "Мобильная разработка", "description": "Разработка iOS и Android приложений"},
            {"name": "Веб-дизайн", "description": "Дизайн сайтов и интерфейсов"},
            {"name": "Графический дизайн", "description": "Фирменный стиль, полиграфия"},
            {"name": "Маркетинг", "description": "SEO, контекстная реклама, SMM"},
            {"name": "CRM-системы", "description": "Внедрение и разработка CRM"},
            {"name": "Поддержка", "description": "Техническая поддержка и сопровождение"},
        ]
        for data in service_types:
            obj, created = ServiceType.objects.update_or_create(
                name=data["name"], defaults=data
            )
            if created:
                self.stdout.write(f"  ✅ Тип услуги: {obj.name}")
            else:
                self.stdout.write(f"  🔄 Тип услуги: {obj.name} (обновлён)")

        # --- Приоритеты задач (TaskPriority) ---
        task_priorities = [
            {"name": "Низкий", "level": 0, "color": "#94a3b8"},
            {"name": "Средний", "level": 1, "color": "#22c55e"},
            {"name": "Высокий", "level": 2, "color": "#f59e0b"},
            {"name": "Критический", "level": 3, "color": "#ef4444"},
        ]
        for data in task_priorities:
            obj, created = TaskPriority.objects.update_or_create(
                name=data["name"], defaults=data
            )
            if created:
                self.stdout.write(f"  ✅ Приоритет задачи: {obj.name}")
            else:
                self.stdout.write(f"  🔄 Приоритет задачи: {obj.name} (обновлён)")

        # --- Статусы задач (TaskStatus) ---
        task_statuses = [
            {"name": "К выполнению", "order": 0, "color": "#94a3b8"},
            {"name": "В работе", "order": 1, "color": "#3b82f6"},
            {"name": "На проверке", "order": 2, "color": "#f59e0b"},
            {"name": "Готово", "order": 3, "color": "#22c55e"},
            {"name": "Отложено", "order": 4, "color": "#8b5cf6"},
        ]
        for data in task_statuses:
            obj, created = TaskStatus.objects.update_or_create(
                name=data["name"], defaults=data
            )
            if created:
                self.stdout.write(f"  ✅ Статус задачи: {obj.name}")
            else:
                self.stdout.write(f"  🔄 Статус задачи: {obj.name} (обновлён)")

        # --- Категории расходов (ExpenseCategory) ---
        expense_categories = [
            {"name": "Аренда", "description": "Аренда офиса и рабочих мест"},
            {"name": "Зарплата", "description": "Заработная плата сотрудников"},
            {"name": "Налоги", "description": "Налоговые отчисления"},
            {"name": "Реклама и маркетинг", "description": "Продвижение и рекламные кампании"},
            {"name": "Инструменты и софт", "description": "Подписки на сервисы, лицензии"},
            {"name": "Оборудование", "description": "Покупка и обслуживание оборудования"},
            {"name": "Транспорт", "description": "Транспортные расходы и командировки"},
            {"name": "Связь", "description": "Интернет, телефония"},
            {"name": "Хостинг и серверы", "description": "Хостинг, домены, облачные услуги"},
            {"name": "Прочее", "description": "Прочие расходы"},
        ]
        for data in expense_categories:
            obj, created = ExpenseCategory.objects.update_or_create(
                name=data["name"], defaults=data
            )
            if created:
                self.stdout.write(f"  ✅ Категория расходов: {obj.name}")
            else:
                self.stdout.write(f"  🔄 Категория расходов: {obj.name} (обновлён)")

    def _seed_users(self):
        """Создание демо-пользователей."""
        self.stdout.write("\n  --- Пользователи ---")

        admin_role = Role.objects.get(name=RoleChoices.SUPERADMIN)
        owner_role = Role.objects.get(name=RoleChoices.OWNER)
        pm_role = Role.objects.get(name=RoleChoices.PROJECT_MANAGER)
        dev_role = Role.objects.get(name=RoleChoices.DEVELOPER)
        designer_role = Role.objects.get(name=RoleChoices.DESIGNER)
        marketer_role = Role.objects.get(name=RoleChoices.MARKETER)
        client_role = Role.objects.get(name=RoleChoices.CLIENT)

        users_data = [
            {
                "email": "admin@deostudio.com",
                "password": "admin123",
                "first_name": "Иван",
                "last_name": "Иванов",
                "role": admin_role,
                "is_superuser": True,
                "is_staff": True,
            },
            {
                "email": "owner@deostudio.com",
                "password": "owner123",
                "first_name": "Максим",
                "last_name": "Владельцев",
                "role": owner_role,
            },
            {
                "email": "pm@deostudio.com",
                "password": "pm123",
                "first_name": "Петр",
                "last_name": "Петров",
                "role": pm_role,
            },
            {
                "email": "dev@deostudio.com",
                "password": "dev123",
                "first_name": "Сергей",
                "last_name": "Сергеев",
                "role": dev_role,
            },
            {
                "email": "designer@deostudio.com",
                "password": "designer123",
                "first_name": "Анна",
                "last_name": "Антонова",
                "role": designer_role,
            },
            {
                "email": "marketer@deostudio.com",
                "password": "marketer123",
                "first_name": "Елена",
                "last_name": "Маркетова",
                "role": marketer_role,
            },
            {
                "email": "client@deostudio.com",
                "password": "client123",
                "first_name": "Алексей",
                "last_name": "Клиентов",
                "role": client_role,
            },
        ]

        for user_data in users_data:
            email = user_data.pop("email")
            password = user_data.pop("password")
            user, created = User.objects.update_or_create(
                email=email,
                defaults=user_data,
            )
            user.set_password(password)
            user.save()
            if created:
                self.stdout.write(f"  ✅ Создан пользователь {email}")
            else:
                self.stdout.write(f"  🔄 Обновлён пароль пользователя {email}")
