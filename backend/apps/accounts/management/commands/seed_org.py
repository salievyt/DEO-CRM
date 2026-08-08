from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import User
from apps.mentorship.models import (
    Checklist,
    ChecklistItem,
    MenteeChecklistItemProgress,
    MenteeChecklistProgress,
    MenteeTask,
    MentorshipPair,
)
from apps.structure.models import Team, TeamMembership


class Command(BaseCommand):
    help = "Seed demo data for org structure and mentorship"

    def handle(self, *args, **options):
        self.stdout.write("Seeding org structure and mentorship...")

        users = {u.email: u for u in User.objects.all()}
        pm = users.get("pm@deostudio.com")
        dev = users.get("dev@deostudio.com")
        designer = users.get("designer@deostudio.com")
        marketer = users.get("marketer@deostudio.com")

        # --- Structure ---
        dev_dept, _ = Team.objects.update_or_create(
            name="Отдел разработки",
            defaults={
                "description": "Разработка веб- и мобильных продуктов",
                "team_type": "department",
                "head": pm,
                "color": "#0066cc",
                "order": 1,
            },
        )
        web_team, _ = Team.objects.update_or_create(
            name="Веб-команда",
            defaults={
                "description": "Сайты и веб-приложения",
                "team_type": "team",
                "parent": dev_dept,
                "head": dev,
                "color": "#0a84ff",
                "order": 1,
            },
        )
        mobile_team, _ = Team.objects.update_or_create(
            name="Мобильная команда",
            defaults={
                "description": "iOS и Android приложения",
                "team_type": "team",
                "parent": dev_dept,
                "color": "#64d2ff",
                "order": 2,
            },
        )
        design_dept, _ = Team.objects.update_or_create(
            name="Отдел дизайна",
            defaults={
                "description": "Веб-дизайн и графический дизайн",
                "team_type": "department",
                "head": designer,
                "color": "#bf5af2",
                "order": 2,
            },
        )
        marketing_dept, _ = Team.objects.update_or_create(
            name="Отдел маркетинга",
            defaults={
                "description": "SEO, контекстная реклама, SMM",
                "team_type": "department",
                "head": marketer,
                "color": "#ff453a",
                "order": 3,
            },
        )

        def add_member(team, user, role="member", position=""):
            TeamMembership.objects.update_or_create(
                team=team, user=user,
                defaults={
                    "role": role,
                    "position": position,
                    "joined_at": date.today() - timedelta(days=180),
                    "is_active": True,
                },
            )

        add_member(dev_dept, pm, "head", "Руководитель отдела разработки")
        add_member(web_team, dev, "head", "Team Lead")
        add_member(mobile_team, dev, "member", "Senior разработчик")
        add_member(design_dept, designer, "head", "Руководитель отдела дизайна")
        add_member(marketing_dept, marketer, "head", "Руководитель отдела маркетинга")

        # --- Mentorship ---
        pair, _ = MentorshipPair.objects.update_or_create(
            mentor=pm, mentee=dev,
            defaults={
                "status": "active",
                "started_at": date.today() - timedelta(days=30),
                "notes": "Адаптация и ввод в стек студии",
            },
        )

        checklist_dev, _ = Checklist.objects.update_or_create(
            title="Онбординг разработчика",
            defaults={
                "description": "Базовые шаги адаптации нового разработчика",
                "is_default": True,
            },
        )
        checklist_mentor, _ = Checklist.objects.update_or_create(
            title="Правила менторства",
            defaults={
                "description": "Чек-лист для наставника",
                "is_default": False,
            },
        )

        dev_items = [
            ("Знакомство с командой", "Познакомиться со всеми участниками команды", 1, True),
            ("Доступы к репозиториям", "Настроить доступы к Git-репозиториям", 2, True),
            ("Ознакомление с кодом", "Изучить структуру основного проекта", 3, True),
            ("Первый merge request", "Создать и смержить первый MR", 4, False),
        ]
        mentor_items = [
            ("План адаптации", "Составить план адаптации на первый месяц", 1, True),
            ("Еженедельный созвон", "Проводить еженедельные встречи", 2, True),
        ]

        for i, (title, desc, order, required) in enumerate(dev_items):
            ChecklistItem.objects.update_or_create(
                checklist=checklist_dev, title=title,
                defaults={"description": desc, "order": order, "is_required": required},
            )
        for i, (title, desc, order, required) in enumerate(mentor_items):
            ChecklistItem.objects.update_or_create(
                checklist=checklist_mentor, title=title,
                defaults={"description": desc, "order": order, "is_required": required},
            )

        tasks = [
            ("Ознакомиться с архитектурой", "Изучить документацию по архитектуре", "in_progress", 1),
            ("Подготовить рабочее окружение", "Настроить локальное окружение", "done", 2),
            ("Выполнить пробную задачу", "Реализовать первую учебную задачу", "pending", 3),
        ]
        for i, (title, desc, status, order) in enumerate(tasks):
            MenteeTask.objects.update_or_create(
                pair=pair, title=title,
                defaults={
                    "description": desc,
                    "status": status,
                    "order": order,
                    "deadline": date.today() + timedelta(days=10 - i * 3),
                    "completed_at": timezone.now() if status == "done" else None,
                },
            )

        progress, created = MenteeChecklistProgress.objects.get_or_create(
            pair=pair, checklist=checklist_dev
        )
        if created:
            for item in checklist_dev.items.all():
                MenteeChecklistItemProgress.objects.create(progress=progress, item=item)
        first_item = progress.items.order_by("item__order").first()
        if first_item and not first_item.completed:
            first_item.completed = True
            first_item.completed_at = timezone.now()
            first_item.save()

        self.stdout.write(self.style.SUCCESS("✅ Структура и наставничество засеяны"))
