from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Role
from apps.clients.models import Client, ClientInteraction
from apps.finance.models import Invoice
from apps.leads.models import Lead, LeadHistory, LeadStage
from apps.projects.models import Project, ProjectStatus
from apps.tasks.models import Task, TaskStatus

from .models import (
    Reminder,
    ReminderLog,
    ReminderRule,
    ReminderRuleType,
    ReminderStatus,
)
from .services import seed_default_rules, sync_reminders

User = get_user_model()


class ReminderBaseTestCase(TestCase):
    def setUp(self):
        self.manager_role = Role.objects.create(name="project_manager")
        self.admin_role = Role.objects.create(name="superadmin")
        self.manager = User.objects.create_user(
            username="manager@test.local",
            email="manager@test.local",
            password="pass1234",
            first_name="Менеджер",
            last_name="Иванов",
            role=self.manager_role,
        )
        self.admin = User.objects.create_user(
            username="admin@test.local",
            email="admin@test.local",
            password="pass1234",
            first_name="Админ",
            last_name="Тестов",
            role=self.admin_role,
        )
        self.client_entity = Client.objects.create(
            first_name="Иван",
            last_name="Петров",
            phone="+79123456789",
            source="other",
            created_by=self.manager,
        )
        self.api = APIClient()

    def make_rule(self, rule_type, conditions, priority="medium", roles=None):
        return ReminderRule.objects.create(
            name=rule_type,
            type=rule_type,
            conditions=conditions,
            priority=priority,
            target_roles=roles if roles is not None else ["project_manager"],
        )

    def make_old_interaction(self, days_ago):
        interaction = ClientInteraction.objects.create(
            client=self.client_entity, user=self.manager, type="call"
        )
        ClientInteraction.objects.filter(pk=interaction.pk).update(
            created_at=timezone.now() - timedelta(days=days_ago)
        )
        return interaction


class SeedRulesTests(ReminderBaseTestCase):
    def test_seed_default_rules_creates_all_types(self):
        created = seed_default_rules()
        self.assertEqual(len(created), len(ReminderRuleType.choices))
        self.assertEqual(ReminderRule.objects.count(), len(ReminderRuleType.choices))

    def test_seed_default_rules_is_idempotent(self):
        seed_default_rules()
        seed_default_rules()
        self.assertEqual(ReminderRule.objects.count(), len(ReminderRuleType.choices))


class ClientNoResponseTests(ReminderBaseTestCase):
    def test_creates_reminder_when_client_is_silent(self):
        self.make_old_interaction(days_ago=5)
        self.make_rule(ReminderRuleType.CLIENT_NO_RESPONSE, {"days": 3})

        result = sync_reminders()

        self.assertEqual(result["created"], 1)
        reminder = Reminder.objects.get()
        self.assertEqual(reminder.user, self.manager)
        self.assertEqual(reminder.client, self.client_entity)
        self.assertIn("не отвечал 5 дн.", reminder.description)

    def test_no_reminder_when_client_recent(self):
        self.make_old_interaction(days_ago=1)
        self.make_rule(ReminderRuleType.CLIENT_NO_RESPONSE, {"days": 3})

        sync_reminders()

        self.assertEqual(Reminder.objects.count(), 0)

    def test_sync_is_idempotent(self):
        self.make_old_interaction(days_ago=5)
        self.make_rule(ReminderRuleType.CLIENT_NO_RESPONSE, {"days": 3})

        sync_reminders()
        sync_reminders()

        self.assertEqual(Reminder.objects.count(), 1)

    def test_reminder_expires_when_condition_clears(self):
        self.make_old_interaction(days_ago=5)
        self.make_rule(ReminderRuleType.CLIENT_NO_RESPONSE, {"days": 3})
        sync_reminders()
        self.assertEqual(Reminder.objects.count(), 1)

        # Client got in touch — the condition no longer holds.
        ClientInteraction.objects.create(
            client=self.client_entity, user=self.manager, type="call"
        )
        sync_reminders()

        reminder = Reminder.objects.get()
        self.assertEqual(reminder.status, ReminderStatus.EXPIRED)
        self.assertIsNotNone(reminder.dismissed_at)

    def test_roles_filter_targets_managers_only(self):
        self.make_old_interaction(days_ago=5)
        self.make_rule(
            ReminderRuleType.CLIENT_NO_RESPONSE,
            {"days": 3},
            roles=["superadmin"],
        )

        sync_reminders()

        self.assertEqual(Reminder.objects.count(), 0)


class DealStageTimeoutTests(ReminderBaseTestCase):
    def test_deal_stuck_on_stage(self):
        stage = LeadStage.objects.create(name="Переговоры", order=0)
        deal = Lead.objects.create(
            contact_name="Корпоративный заказ",
            phone="+79990001122",
            current_stage=stage,
            assigned_to=self.manager,
            is_active=True,
        )
        history = LeadHistory.objects.create(lead=deal, to_stage=stage, user=self.manager)
        LeadHistory.objects.filter(pk=history.pk).update(
            created_at=timezone.now() - timedelta(days=9)
        )
        self.make_rule(ReminderRuleType.DEAL_STAGE_TIMEOUT, {"days": 8})

        result = sync_reminders()

        self.assertEqual(result["created"], 1)
        reminder = Reminder.objects.get()
        self.assertEqual(reminder.deal, deal)
        self.assertIn("Переговоры", reminder.description)
        self.assertIn("9", reminder.description)


class TaskRulesTests(ReminderBaseTestCase):
    def setUp(self):
        super().setUp()
        self.project_status = ProjectStatus.objects.create(name="Активный", order=0)
        self.project = Project.objects.create(
            name="Проект клиента",
            client=self.client_entity,
            status=self.project_status,
        )
        self.task_status = TaskStatus.objects.create(name="В работе", order=0)
        self.done_status = TaskStatus.objects.create(name="Выполнена", order=1)

    def test_task_overdue(self):
        task = Task.objects.create(
            title="Позвонить Ивану",
            project=self.project,
            assignee=self.manager,
            status=self.task_status,
            deadline=timezone.localdate() - timedelta(days=2),
        )
        self.make_rule(ReminderRuleType.TASK_OVERDUE, {"days": 1})

        sync_reminders()

        reminder = Reminder.objects.get()
        self.assertEqual(reminder.task, task)
        self.assertIn("просрочена на 2 дн.", reminder.description)

    def test_done_task_has_no_overdue_reminder(self):
        Task.objects.create(
            title="Сделано",
            project=self.project,
            assignee=self.manager,
            status=self.done_status,
            deadline=timezone.localdate() - timedelta(days=5),
        )
        self.make_rule(ReminderRuleType.TASK_OVERDUE, {"days": 1})

        sync_reminders()

        self.assertEqual(Reminder.objects.count(), 0)

    def test_task_deadline_soon(self):
        Task.objects.create(
            title="Сдать отчёт",
            project=self.project,
            assignee=self.manager,
            status=self.task_status,
            deadline=timezone.localdate(),
        )
        self.make_rule(ReminderRuleType.TASK_DEADLINE_SOON, {"within_hours": 24})

        sync_reminders()

        reminder = Reminder.objects.get()
        self.assertIn("осталось ", reminder.description)
        self.assertEqual(reminder.task.title, "Сдать отчёт")
        self.assertGreater(reminder.due_at, timezone.now())


class DealNextActionTests(ReminderBaseTestCase):
    def setUp(self):
        super().setUp()
        self.stage = LeadStage.objects.create(name="Переговоры", order=0)

    def test_no_next_action_creates_reminder(self):
        deal = Lead.objects.create(
            contact_name="Корпоративный заказ",
            phone="+79990001122",
            current_stage=self.stage,
            assigned_to=self.manager,
            is_active=True,
        )
        self.make_rule(ReminderRuleType.DEAL_NO_NEXT_ACTION, {})

        sync_reminders()

        reminder = Reminder.objects.get()
        self.assertEqual(reminder.deal, deal)
        self.assertIn("отсутствует следующее действие", reminder.description)

    def test_next_action_set_in_future_no_reminder(self):
        Lead.objects.create(
            contact_name="Корпоративный заказ",
            phone="+79990001122",
            current_stage=self.stage,
            assigned_to=self.manager,
            next_action="Позвонить",
            next_action_at=timezone.now() + timedelta(days=1),
            is_active=True,
        )
        self.make_rule(ReminderRuleType.DEAL_NO_NEXT_ACTION, {})

        sync_reminders()

        self.assertEqual(Reminder.objects.count(), 0)


class LeadUnprocessedTests(ReminderBaseTestCase):
    def test_new_lead_waits_for_processing(self):
        stage = LeadStage.objects.create(name="Новые", order=0)
        lead = Lead.objects.create(
            contact_name="Новый клиент",
            phone="+79990001122",
            current_stage=stage,
            assigned_to=self.manager,
            is_active=True,
        )
        Lead.objects.filter(pk=lead.pk).update(
            created_at=timezone.now() - timedelta(hours=5)
        )
        self.make_rule(ReminderRuleType.LEAD_UNPROCESSED, {"hours": 2})

        sync_reminders()

        reminder = Reminder.objects.get()
        self.assertIn("ожидает обработки", reminder.description)


class FinanceDeadlineTests(ReminderBaseTestCase):
    def test_invoice_deadline_soon(self):
        invoice = Invoice.objects.create(
            number="INV-001",
            client=self.client_entity,
            amount=100000,
            issued_date=timezone.localdate(),
            due_date=timezone.localdate() + timedelta(days=1),
            status="sent",
            created_by=self.manager,
        )
        self.make_rule(ReminderRuleType.FINANCE_DEADLINE_SOON, {"within_days": 3})

        sync_reminders()

        reminder = Reminder.objects.get()
        self.assertEqual(reminder.invoice, invoice)
        self.assertIn("приближается к дедлайну", reminder.description)


class AuditLogTests(ReminderBaseTestCase):
    def test_lifecycle_events_are_logged(self):
        self.make_old_interaction(days_ago=5)
        self.make_rule(ReminderRuleType.CLIENT_NO_RESPONSE, {"days": 3})
        sync_reminders()
        reminder = Reminder.objects.get()

        self.api.force_authenticate(user=self.manager)
        self.api.post(f"/api/v1/reminders/{reminder.id}/view/")
        self.api.post(f"/api/v1/reminders/{reminder.id}/complete/")

        actions = set(ReminderLog.objects.values_list("action", flat=True))
        self.assertIn(ReminderLog.Actions.CREATED, actions)
        self.assertIn(ReminderLog.Actions.VIEWED, actions)
        self.assertIn(ReminderLog.Actions.COMPLETED, actions)
        self.assertEqual(ReminderLog.objects.filter(reminder_id=reminder.id).count(), 3)


class ApiTests(ReminderBaseTestCase):
    def setUp(self):
        super().setUp()
        self.make_old_interaction(days_ago=5)
        self.make_rule(ReminderRuleType.CLIENT_NO_RESPONSE, {"days": 3})
        sync_reminders()
        self.reminder = Reminder.objects.get()

    def test_list_reminders_with_cta(self):
        self.api.force_authenticate(user=self.manager)
        response = self.api.get("/api/v1/reminders/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        cta = response.data["results"][0]["cta"]
        self.assertEqual(cta["open_client"], str(self.client_entity.id))
        self.assertEqual(cta["call"], "+79123456789")
        self.assertEqual(cta["whatsapp"], "+79123456789")

    def test_summary(self):
        self.api.force_authenticate(user=self.manager)
        response = self.api.get("/api/v1/reminders/summary/")

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data["today"]["total"], 1)

    def test_snooze(self):
        self.api.force_authenticate(user=self.manager)
        response = self.api.post(
            f"/api/v1/reminders/{self.reminder.id}/snooze/",
            {"period": "1h"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.reminder.refresh_from_db()
        self.assertIsNotNone(self.reminder.snoozed_until)

    def test_dismiss(self):
        self.api.force_authenticate(user=self.manager)
        response = self.api.post(f"/api/v1/reminders/{self.reminder.id}/dismiss/")

        self.assertEqual(response.status_code, 200)
        self.reminder.refresh_from_db()
        self.assertEqual(self.reminder.status, ReminderStatus.DISMISSED)

    def test_other_user_cannot_act_on_reminder(self):
        other = User.objects.create_user(
            username="other@test.local",
            email="other@test.local",
            password="pass1234",
            role=self.manager_role,
        )
        self.api.force_authenticate(user=other)
        response = self.api.post(f"/api/v1/reminders/{self.reminder.id}/complete/")

        self.assertEqual(response.status_code, 404)


class RulesApiTests(ReminderBaseTestCase):
    def test_manager_cannot_create_rule(self):
        self.api.force_authenticate(user=self.manager)
        response = self.api.post(
            "/api/v1/reminders/rules/",
            {
                "name": "Кастом",
                "type": ReminderRuleType.CLIENT_NO_RESPONSE,
                "conditions": {"days": 2},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_admin_can_create_rule(self):
        self.api.force_authenticate(user=self.admin)
        response = self.api.post(
            "/api/v1/reminders/rules/",
            {
                "name": "Кастом",
                "type": ReminderRuleType.CLIENT_NO_RESPONSE,
                "conditions": {"days": 2},
                "priority": "high",
                "target_roles": ["superadmin"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(ReminderRule.objects.filter(name="Кастом").count(), 1)

    def test_list_rules_requires_auth(self):
        response = self.api.get("/api/v1/reminders/rules/")
        self.assertEqual(response.status_code, 401)

        self.api.force_authenticate(user=self.manager)
        response = self.api.get("/api/v1/reminders/rules/")
        self.assertEqual(response.status_code, 200)
