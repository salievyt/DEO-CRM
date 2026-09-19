"""Tests for the event-driven scenario engine (lead → task, invoice → reminder, deal won → project)."""

import pytest

from apps.accounts.models import Role
from apps.cabinet.models import ProjectShareLink
from apps.deals.models import Deal
from apps.finance.models import Invoice
from apps.leads.models import Lead, LeadStage
from apps.projects.models import Project, ProjectStatus
from apps.reminders.models import Reminder
from apps.scenarios.events import process_unpaid_invoices, run_action
from apps.scenarios.models import (
    ActionType,
    EventType,
    Scenario,
    ScenarioTrigger,
    TriggerStatus,
)
from apps.tasks.models import Task, TaskStatus

pytestmark = pytest.mark.django_db


@pytest.fixture
def owner_user(db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.create_user(
        username="owner@deo.test", email="owner@deo.test", password="pass1234",
        first_name="Владелец", last_name="Главный",
        role=Role.objects.get_or_create(name="owner")[0],
    )


@pytest.fixture
def lead_stage(db):
    return LeadStage.objects.create(name="Новый лид", order=1)


@pytest.fixture
def task_status(db):
    return TaskStatus.objects.create(name="Новая")


@pytest.fixture
def project_status(db):
    return ProjectStatus.objects.create(name="В работе")


@pytest.fixture
def lead(db, owner_user, client, lead_stage):
    return Lead.objects.create(
        contact_name="Иван Петров",
        phone="+7 900 000-00-00",
        current_stage=lead_stage,
        created_by=owner_user,
    )


@pytest.fixture
def invoice(db, owner_user, client):
    from datetime import timedelta

    from django.utils import timezone

    today = timezone.now().date()
    return Invoice.objects.create(
        number="INV-001",
        client=client,
        amount=5000,
        status="sent",
        paid_amount=0,
        issued_date=today - timedelta(days=5),
        due_date=today - timedelta(days=4),
        created_by=owner_user,
    )


@pytest.fixture
def deal(db, owner_user, client, lead_stage):
    lead = Lead.objects.create(
        contact_name="Лидия Соколова",
        phone="+7 900 111-22-33",
        current_stage=lead_stage,
        created_by=owner_user,
    )
    return Deal.objects.create(
        lead=lead,
        title="Сайт-визитка",
        client=client,
        total=90000,
        total_cost=30000,
        created_by=owner_user,
    )


def make_scenario(**overrides):
    params = dict(name="Автосценарий", priority=1, is_active=True)
    params.update(overrides)
    return Scenario.objects.create(**params)


def make_trigger(scenario, entity_type, entity_id, label):
    return ScenarioTrigger.objects.create(
        scenario=scenario,
        event_type=scenario.event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_label=label,
    )


class TestCreateTask:
    def test_lead_created_creates_task(self, lead, owner_user, task_status):
        scenario = make_scenario(
            name="Лид → задача",
            event_type=EventType.LEAD_CREATED,
            action_type=ActionType.CREATE_TASK,
            action_config={
                "title": "Обработать лид: {name}",
                "description": "Клиент: {name}",
            },
        )
        run_action(scenario, entity=lead, entity_type="lead", actor=owner_user)

        task = Task.objects.get()
        assert task.title == "Обработать лид: Иван Петров"
        assert task.project is None
        assert task.assignee == owner_user

        trigger = ScenarioTrigger.objects.get(scenario=scenario)
        assert trigger.entity_type == "lead"
        assert trigger.entity_id == lead.id
        assert trigger.status == TriggerStatus.RESPONDED

    def test_dedup_same_entity(self, lead, owner_user, task_status):
        scenario = make_scenario(
            event_type=EventType.LEAD_CREATED,
            action_type=ActionType.CREATE_TASK,
            action_config={"title": "Задача {name}"},
        )
        first = run_action(scenario, entity=lead, entity_type="lead", actor=owner_user)
        second = run_action(scenario, entity=lead, entity_type="lead", actor=owner_user)
        assert first is not None
        assert second is None
        assert Task.objects.count() == 1

    def test_inactive_scenario_not_fired(self, lead, owner_user, task_status):
        scenario = make_scenario(
            event_type=EventType.LEAD_CREATED,
            action_type=ActionType.CREATE_TASK,
            action_config={"title": "x"},
            is_active=False,
        )
        run_action(scenario, entity=lead, entity_type="lead", actor=owner_user)
        assert Task.objects.count() == 0


class TestCreateReminder:
    def test_invoice_unpaid_creates_reminder(
        self, invoice, owner_user
    ):
        scenario = make_scenario(
            name="Счёт → напоминание",
            event_type=EventType.INVOICE_UNPAID,
            action_type=ActionType.CREATE_REMINDER,
            action_config={
                "title": "Счёт {number} не оплачен",
                "description": "Напоминаем",
                "priority": "high",
            },
        )
        run_action(scenario, entity=invoice, entity_type="invoice", actor=owner_user)

        reminder = Reminder.objects.get(invoice=invoice)
        assert reminder.user == owner_user
        assert reminder.priority == "high"
        assert reminder.title == "Счёт INV-001 не оплачен"
        assert reminder.dedup_key == f"scenario:{scenario.id}:invoice:{invoice.id}"

    def test_reminder_not_duplicated(self, invoice, owner_user):
        scenario = make_scenario(
            event_type=EventType.INVOICE_UNPAID,
            action_type=ActionType.CREATE_REMINDER,
            action_config={"title": "Оплатите {number}"},
        )
        run_action(scenario, entity=invoice, entity_type="invoice", actor=owner_user)
        run_action(scenario, entity=invoice, entity_type="invoice", actor=owner_user)
        assert Reminder.objects.filter(invoice=invoice).count() == 1


class TestCreateProjectDemo:
    def test_deal_won_creates_project_and_demo(
        self, deal, owner_user, project_status
    ):
        scenario = make_scenario(
            name="Сделка → проект + демо",
            event_type=EventType.DEAL_WON,
            action_type=ActionType.CREATE_PROJECT_DEMO,
            action_config={
                "name": "{title}",
                "description": "Автоматический проект",
                "create_milestone": True,
                "milestone_name": "Демо-доступ",
            },
        )
        run_action(scenario, entity=deal, entity_type="deal", actor=owner_user)

        project = Project.objects.get()
        assert project.name == "Сайт-визитка"
        assert project.client == deal.client
        assert project.created_by == owner_user
        assert project.budget == 90000
        assert project.tracked_hours == 0
        assert project.team.filter(user_id=owner_user.id).exists()
        assert ProjectShareLink.objects.filter(project=project).exists()
        assert project.milestones.filter(name="Демо-доступ").exists()

    def test_deal_without_client_skipped_as_failed(
        self, deal, owner_user, project_status
    ):
        deal.client = None
        deal.save()
        scenario = make_scenario(
            event_type=EventType.DEAL_WON,
            action_type=ActionType.CREATE_PROJECT_DEMO,
            action_config={},
        )
        run_action(scenario, entity=deal, entity_type="deal", actor=owner_user)
        assert Project.objects.count() == 0
        trigger = ScenarioTrigger.objects.get(scenario=scenario)
        assert trigger.status == TriggerStatus.FAILED


class TestProcessUnpaidInvoices:
    def test_overdue_only(self, owner_user, client, project_status):
        from datetime import timedelta

        from django.utils import timezone

        today = timezone.now().date()
        scenario = make_scenario(
            event_type=EventType.INVOICE_UNPAID,
            action_type=ActionType.CREATE_REMINDER,
            action_config={"days": 3, "title": "Оплатите {number}"},
        )
        overdue = Invoice.objects.create(
            number="INV-OVER", amount=1000, status="sent",
            client=client,
            issued_date=today - timedelta(days=5),
            due_date=today - timedelta(days=4), created_by=owner_user,
        )
        fresh = Invoice.objects.create(
            number="INV-FRESH", amount=1000, status="sent",
            client=client,
            issued_date=today - timedelta(days=1),
            due_date=today, created_by=owner_user,
        )
        paid = Invoice.objects.create(
            number="INV-PAID", amount=1000, status="sent",
            client=client,
            issued_date=today - timedelta(days=10),
            due_date=today - timedelta(days=9),
            paid_amount=1000, created_by=owner_user,
        )

        report = process_unpaid_invoices()

        assert report["processed"] == 1
        assert Reminder.objects.filter(invoice=overdue).exists()
        assert not Reminder.objects.filter(invoice=fresh).exists()
        assert not Reminder.objects.filter(invoice=paid).exists()
        assert scenario.triggers.filter(
            entity_id=overdue.id, status=TriggerStatus.RESPONDED
        ).count() == 1