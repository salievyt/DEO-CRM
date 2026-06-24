from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.choices import RoleChoices
from apps.accounts.models import Role, User


class Command(BaseCommand):
    help = "Seed database with demo data"

    def handle(self, *args, **options):
        self.stdout.write("Seeding demo data...")

        # Create demo users
        admin_role = Role.objects.get(name=RoleChoices.SUPERADMIN)
        pm_role = Role.objects.get(name=RoleChoices.PROJECT_MANAGER)
        dev_role = Role.objects.get(name=RoleChoices.DEVELOPER)
        designer_role = Role.objects.get(name=RoleChoices.DESIGNER)

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
        ]

        for user_data in users_data:
            email = user_data.pop("email")
            password = user_data.pop("password")
            user, created = User.objects.update_or_create(
                email=email,
                defaults=user_data,
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(f"  ✅ Создан пользователь {email}")
            else:
                self.stdout.write(f"  ℹ️  Пользователь {email} уже существует")

        self.stdout.write(self.style.SUCCESS("\n✅ Демо-данные успешно загружены!"))
        self.stdout.write("\n📋 Учетные данные:")
        self.stdout.write("   Админ: admin@deostudio.com / admin123")
        self.stdout.write("   PM:    pm@deostudio.com / pm123")
        self.stdout.write("   Dev:   dev@deostudio.com / dev123")
