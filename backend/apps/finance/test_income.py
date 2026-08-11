"""Tests for manual income records in the finance module."""

import datetime

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Role
from apps.clients.models import Client
from apps.finance.models import Income

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def owner_user(db):
    role, _ = Role.objects.get_or_create(name="owner")
    return User.objects.create_user(
        username="owner@deo.test",
        email="owner@deo.test",
        password="pass1234",
        first_name="Владелец",
        role=role,
    )


@pytest.fixture
def manager_user(db):
    role, _ = Role.objects.get_or_create(name="project_manager")
    return User.objects.create_user(
        username="pm@deo.test",
        email="pm@deo.test",
        password="pass1234",
        role=role,
    )


@pytest.fixture
def client(db):
    return Client.objects.create(
        first_name="Иван",
        last_name="Петров",
        phone="+7 (912) 345-67-89",
        source="other",
    )


@pytest.fixture
def api_client():
    return APIClient()


def create_income(**overrides):
    defaults = {
        "amount": 15000,
        "description": "Разовый проект",
        "method": "bank_transfer",
        "income_date": datetime.date.today(),
    }
    defaults.update(overrides)
    return Income.objects.create(**defaults)


class TestIncomeAPI:
    def test_requires_auth(self, api_client):
        assert api_client.get("/api/v1/finance/incomes/").status_code == 401

    def test_owner_can_create(self, api_client, owner_user, client):
        api_client.force_authenticate(owner_user)
        resp = api_client.post(
            "/api/v1/finance/incomes/",
            {
                "client": str(client.id),
                "amount": "25000.00",
                "description": "Наличные за услугу",
                "method": "cash",
                "income_date": "2026-08-01",
            },
            format="json",
        )
        assert resp.status_code == 201, resp.data
        assert resp.data["amount"] == "25000.00"
        assert resp.data["client_name"] == client.full_name
        assert resp.data["method_display"] == "Наличные"
        assert Income.objects.count() == 1
        assert Income.objects.first().created_by == owner_user

    def test_manager_forbidden(self, api_client, manager_user):
        api_client.force_authenticate(manager_user)
        assert api_client.post(
            "/api/v1/finance/incomes/", {}, format="json"
        ).status_code == 403

    def test_list_and_filter(self, api_client, owner_user):
        create_income(description="Первый", method="cash")
        create_income(description="Второй", method="card")
        api_client.force_authenticate(owner_user)
        resp = api_client.get("/api/v1/finance/incomes/")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 2

        resp = api_client.get("/api/v1/finance/incomes/", {"method": "cash"})
        assert [r["description"] for r in resp.data["results"]] == ["Первый"]

    def test_negative_amount_rejected(self, api_client, owner_user):
        api_client.force_authenticate(owner_user)
        resp = api_client.post(
            "/api/v1/finance/incomes/",
            {
                "amount": "-5",
                "description": "Плохой доход",
                "income_date": "2026-08-01",
            },
            format="json",
        )
        assert resp.status_code == 400


class TestFinancialSummary:
    def test_summary_includes_manual_income(self, api_client, owner_user):
        today = datetime.date.today()
        create_income(amount=10000, income_date=today)
        create_income(amount=5000, income_date=today)
        api_client.force_authenticate(owner_user)
        resp = api_client.get("/api/v1/finance/reports/summary/")
        assert resp.status_code == 200
        assert resp.data["income"] == 15000
        assert resp.data["total_income"] == resp.data["revenue"] + 15000
        assert resp.data["profit"] == resp.data["total_income"] - resp.data["expenses"]
