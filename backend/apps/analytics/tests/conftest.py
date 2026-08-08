from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Role
from apps.analytics.funnel import clear_stage_classification_cache
from apps.clients.models import Client
from apps.finance.models import Invoice
from apps.leads.models import Lead, LeadHistory, LeadStage
from apps.projects.models import Project, ProjectStatus, ServiceType

User = get_user_model()


@pytest.fixture(autouse=True)
def _clear_classification(db):
    """Fresh funnel classification and analytics cache per test.

    The LocMem/Redis cache persists across tests even though the DB is
    rolled back — clear it so cached metrics never leak between tests.
    """
    from django.core.cache import cache

    clear_stage_classification_cache()
    cache.clear()
    yield
    clear_stage_classification_cache()
    cache.clear()


@pytest.fixture
def roles(db):
    def make(name):
        return Role.objects.get_or_create(name=name)[0]

    return {
        "superadmin": make("superadmin"),
        "owner": make("owner"),
        "project_manager": make("project_manager"),
        "marketer": make("marketer"),
        "client": make("client"),
    }


@pytest.fixture
def admin_user(db, roles):
    return User.objects.create_user(
        username="admin@deo.test",
        email="admin@deo.test",
        password="pass1234",
        first_name="Админ",
        last_name="Системы",
        role=roles["superadmin"],
    )


@pytest.fixture
def owner_user(db, roles):
    return User.objects.create_user(
        username="owner@deo.test",
        email="owner@deo.test",
        password="pass1234",
        first_name="Владелец",
        last_name="Компании",
        role=roles["owner"],
    )


@pytest.fixture
def manager(db, roles):
    return User.objects.create_user(
        username="manager@deo.test",
        email="manager@deo.test",
        password="pass1234",
        first_name="Менеджер",
        last_name="Иванов",
        role=roles["project_manager"],
    )


@pytest.fixture
def manager2(db, roles):
    return User.objects.create_user(
        username="manager2@deo.test",
        email="manager2@deo.test",
        password="pass1234",
        first_name="Менеджер",
        last_name="Петров",
        role=roles["project_manager"],
    )


@pytest.fixture
def client_user(db, roles):
    return User.objects.create_user(
        username="client@deo.test",
        email="client@deo.test",
        password="pass1234",
        first_name="Клиент",
        last_name="Петров",
        role=roles["client"],
    )


@pytest.fixture
def stages(db):
    """Realistic stage pipeline with configured probabilities."""
    return {
        "new": LeadStage.objects.create(
            name="Новые заявки", order=1, probability=10, color="#6366f1"
        ),
        "qualified": LeadStage.objects.create(
            name="Квалифицирован", order=2, probability=60, color="#8b5cf6"
        ),
        "deal": LeadStage.objects.create(
            name="Переговоры", order=3, probability=80, color="#f59e0b"
        ),
        "won": LeadStage.objects.create(name="Победа", order=4, probability=100, color="#22c55e"),
        "lost": LeadStage.objects.create(name="Проигрыш", order=5, probability=0, color="#ef4444"),
    }


@pytest.fixture
def client(db):
    return Client.objects.create(
        first_name="Иван",
        last_name="Петров",
        phone="+7 900 000-00-00",
        source="website",
    )


@pytest.fixture
def make_client(db):
    def _make(**kwargs):
        defaults = {
            "first_name": "Клиент",
            "last_name": "Тестов",
            "phone": "+7 911 111-11-11",
            "source": "website",
        }
        defaults.update(kwargs)
        return Client.objects.create(**defaults)

    return _make


@pytest.fixture
def make_lead(db, stages, manager):
    def _make(
        stage="new",
        source="website",
        budget=None,
        assigned=None,
        created_days_ago=0,
        client_obj=None,
    ):
        lead = Lead.objects.create(
            contact_name="Анна",
            company_name="ООО Тест",
            phone="+7 912 345-67-89",
            email="anna@test.ru",
            source=source,
            budget=budget,
            current_stage=stages[stage],
            assigned_to=assigned or manager,
            created_by=manager,
            client=client_obj,
        )
        if created_days_ago:
            # auto_now_add ignores passed values — backdate via queryset update
            Lead.objects.filter(pk=lead.pk).update(
                created_at=timezone.now() - timedelta(days=created_days_ago)
            )
            lead.refresh_from_db()
        return lead

    return _make


@pytest.fixture
def make_history(db):
    def _make(lead, to_stage, days_ago=0):
        history = LeadHistory.objects.create(
            lead=lead,
            from_stage=lead.current_stage,
            to_stage=to_stage,
            user=lead.assigned_to,
        )
        if days_ago:
            LeadHistory.objects.filter(pk=history.pk).update(
                created_at=timezone.now() - timedelta(days=days_ago)
            )
            history.refresh_from_db()
        return history

    return _make


@pytest.fixture
def make_invoice(db, make_client):
    def _make(amount=1000, client_obj=None, paid=True, paid_days_ago=0, project=None):
        client_obj = client_obj or make_client()
        number = f"INV-{Invoice.objects.count() + 1}-{timezone.now().microsecond}"
        inv = Invoice.objects.create(
            number=number,
            client=client_obj,
            project=project,
            amount=amount,
            status="paid" if paid else "cancelled",
            issued_date=timezone.localdate(),
            due_date=timezone.localdate() + timedelta(days=14),
            created_by=User.objects.first(),
        )
        if paid:
            inv.paid_at = timezone.now() - timedelta(days=paid_days_ago)
            inv.paid_amount = amount
        else:
            inv.paid_amount = amount  # was paid, then cancelled (refund case)
            inv.paid_at = timezone.now() - timedelta(days=paid_days_ago)
        inv.save()
        return inv

    return _make


@pytest.fixture
def make_project(db, make_client):
    def _make(budget=1000, cost=400, status_name="Завершен"):
        client_obj = make_client()
        status, _ = ProjectStatus.objects.get_or_create(name=status_name, defaults={"order": 1})
        service, _ = ServiceType.objects.get_or_create(name="Веб-разработка")
        return Project.objects.create(
            name="Проект",
            client=client_obj,
            service_type=service,
            budget=budget,
            cost=cost,
            status=status,
            created_by=User.objects.first(),
        )

    return _make


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def today_period():
    """The default 30-day period used by the API."""
    from apps.analytics.services import Period
    from apps.analytics.constants import resolve_period

    start, end = resolve_period(period_key="30d")
    return Period(start, end, label="30d")
