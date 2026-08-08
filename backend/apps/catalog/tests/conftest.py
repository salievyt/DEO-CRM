import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Role
from apps.catalog.models import CatalogCategory, CatalogItem

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
def developer(db, roles):
    return User.objects.create_user(
        username="dev@deo.test",
        email="dev@deo.test",
        password="pass1234",
        first_name="Разработчик",
        last_name="Код",
        role=roles["developer"],
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
def make_category(db):
    def _make(name=None):
        return CatalogCategory.objects.create(name=name or f"Категория-{uuid.uuid4().hex[:6]}")

    return _make


@pytest.fixture
def make_item(db, make_category):
    def _make(type_="product", name=None, price=100, cost=40, stock=10, **kwargs):
        defaults = {
            "name": name or f"Позиция-{uuid.uuid4().hex[:6]}",
            "type": type_,
            "price": price,
            "cost_price": cost,
            "stock": stock,
            "low_stock_threshold": 5,
            "unit": "шт.",
            "status": CatalogItem.STATUS_ACTIVE,
            "category": make_category(),
        }
        if type_ == CatalogItem.TYPE_PRODUCT and "sku" not in kwargs:
            defaults["sku"] = f"SKU-{uuid.uuid4().hex[:6].upper()}"
        defaults.update(kwargs)
        return CatalogItem.objects.create(**defaults)

    return _make
