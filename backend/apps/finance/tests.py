from datetime import date

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.choices import RoleChoices
from apps.accounts.models import Role, User
from apps.clients.models import Client

from .models import Invoice, Product


def make_user(role_name):
    role = None
    if role_name is not None:
        role, _ = Role.objects.get_or_create(name=role_name)
    return User.objects.create_user(
        username=f"finance-{role_name}", email=f"finance-{role_name}@example.com", role=role
    )


def make_invoice(number, customer):
    today = date.today()
    return Invoice.objects.create(
        number=number, client=customer, amount=100, issued_date=today, due_date=today
    )


@pytest.mark.django_db
@pytest.mark.parametrize("role_name", [RoleChoices.CLIENT, RoleChoices.DEVELOPER, None])
def test_internal_finance_endpoints_require_finance_role(role_name):
    api = APIClient()
    api.force_authenticate(make_user(role_name))
    invoice = make_invoice("FIN-1", Client.objects.create(first_name="Other client"))

    product = Product.objects.create(name="Service")

    endpoints = [
        (reverse("invoice-list"), ("get", "post")),
        (reverse("invoice-detail", args=[invoice.pk]), ("get", "patch", "delete")),
        (reverse("product-list"), ("get", "post")),
        (reverse("product-detail", args=[product.pk]), ("get", "patch", "delete")),
        (reverse("expense-categories"), ("get", "post")),
    ]
    for url, methods in endpoints:
        for method in methods:
            response = getattr(api, method)(url)
            assert response.status_code == 403, (method, url, response.status_code)

    assert Invoice.objects.filter(pk=invoice.pk).exists()


@pytest.mark.django_db
@pytest.mark.parametrize(
    "role_name", [RoleChoices.SUPERADMIN, RoleChoices.OWNER, RoleChoices.PROJECT_MANAGER]
)
def test_finance_roles_can_view_and_update_invoice(role_name):
    api = APIClient()
    api.force_authenticate(make_user(role_name))
    invoice = make_invoice("FIN-1", Client.objects.create(first_name="Customer"))
    url = reverse("invoice-detail", args=[invoice.pk])

    assert api.get(reverse("invoice-list")).status_code == 200
    assert api.get(url).status_code == 200
    assert api.patch(url, {"description": "Updated"}, format="json").status_code == 200
    invoice.refresh_from_db()
    assert invoice.description == "Updated"


@pytest.mark.django_db
def test_client_cabinet_lists_only_own_invoices():
    user = make_user(RoleChoices.CLIENT)
    customer = Client.objects.create(user=user, first_name="Customer")
    invoice = make_invoice("FIN-1", customer)
    make_invoice("FIN-2", Client.objects.create(first_name="Other client"))
    api = APIClient()
    api.force_authenticate(user)

    response = api.get(reverse("cabinet-invoices"))
    assert response.status_code == 200
    assert [item["id"] for item in response.data] == [str(invoice.pk)]
