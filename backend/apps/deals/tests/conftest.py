import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Role
from apps.catalog.models import CatalogItem
from apps.clients.models import Client
from apps.leads.models import Lead, LeadStage

User = get_user_model()


@pytest.fixture
def roles(db):
    def make(name):
        return Role.objects.get_or_create(name=name)[0]

    return {
        "superadmin": make("superadmin"),
        "owner": make("owner"),
        "project_manager": make("project_manager"),
        "marketer": make("marketer"),
        "developer": make("developer"),
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
def marketer(db, roles):
    return User.objects.create_user(
        username="marketer@deo.test",
        email="marketer@deo.test",
        password="pass1234",
        first_name="Маркетолог",
        last_name="Петрова",
        role=roles["marketer"],
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
def api_client():
    return APIClient()


@pytest.fixture
def stages(db):
    return {
        "new": LeadStage.objects.create(name="Новый", order=1, probability=10),
        "won": LeadStage.objects.create(name="Победа", order=2, probability=100),
    }


@pytest.fixture
def make_client(db):
    def _make(**kwargs):
        defaults = {
            "first_name": "Иван",
            "last_name": "Клиентов",
            "phone": "+7 900 000-00-00",
            "source": "website",
        }
        defaults.update(kwargs)
        return Client.objects.create(**defaults)

    return _make


@pytest.fixture
def make_lead(db, stages, make_client, manager):
    def _make(with_client=True):
        return Lead.objects.create(
            contact_name="Анна Смирнова",
            company_name="ООО Ромашка",
            phone="+7 911 222-33-44",
            email="anna@test.ru",
            source="website",
            budget=50000,
            current_stage=stages["new"],
            assigned_to=manager,
            created_by=manager,
            client=make_client() if with_client else None,
        )

    return _make


@pytest.fixture
def make_item(db):
    def _make(type_="product", price=100, cost=40, stock=10, name=None):
        return CatalogItem.objects.create(
            name=name or f"Позиция-{uuid.uuid4().hex[:6]}",
            type=type_,
            sku=f"SKU-{uuid.uuid4().hex[:6].upper()}" if type_ == "product" else None,
            price=price,
            cost_price=cost,
            stock=stock,
            low_stock_threshold=5,
            unit="шт.",
        )

    return _make


@pytest.fixture
def make_deal(db, make_lead):
    """Create a deal directly through services (like the API does)."""
    from apps.deals.services import convert_lead_to_deal

    def _make(items, discount=0, tax=0, lead=None, user=None):
        lead = lead or make_lead()
        user = user or User.objects.first()
        return convert_lead_to_deal(
            user=user,
            lead=lead,
            items=items,
            discount=discount,
            tax=tax,
        )

    return _make
