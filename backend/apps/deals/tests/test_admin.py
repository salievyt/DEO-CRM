"""Regression coverage for calculated fields on empty admin inline forms."""

from decimal import Decimal

import pytest
from django.urls import reverse

from apps.deals.models import DealItem


@pytest.mark.parametrize("values", [
    {},
    {"quantity": None, "unit_price": None, "cost_price": None, "discount": None, "tax": None},
    {"quantity": Decimal("2"), "unit_price": None},
])
def test_empty_item_totals(values):
    item = DealItem(**values)
    assert item.line_subtotal == 0
    assert item.line_total == 0
    assert item.total_cost == 0


def test_item_totals_keep_decimal_precision():
    item = DealItem(quantity=Decimal("1.50"), unit_price=Decimal("10.25"),
                    cost_price=Decimal("3.20"), discount=Decimal("1.00"), tax=Decimal("0.50"))
    assert item.line_subtotal == Decimal("15.3750")
    assert item.line_total == Decimal("14.8750")
    assert item.total_cost == Decimal("4.8000")


def test_admin_add_deal_renders_empty_inline(client, admin_user):
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.save(update_fields=["is_staff", "is_superuser"])
    client.force_login(admin_user)
    response = client.get(reverse("admin:deals_deal_add"))
    assert response.status_code == 200
