"""Tests for the deals module: conversion, totals calculation, inventory
effects on won/lost, payments and permissions."""

import pytest
from django.urls import reverse

from apps.catalog.models import InventoryMovement
from apps.deals.models import Deal, DealPayment
from apps.deals.services import DealError, change_deal_status, convert_lead_to_deal


def items_payload(*catalog_items, quantities=None):
    quantities = quantities or [1] * len(catalog_items)
    return [
        {"item": str(item.id), "quantity": str(qty)} for item, qty in zip(catalog_items, quantities)
    ]


class TestConversion:
    def test_convert_lead_to_deal(self, api_client, manager, make_lead, make_item):
        lead = make_lead()
        product = make_item(price=1000, cost=400)
        api_client.force_authenticate(manager)
        resp = api_client.post(
            reverse("deals-list"),
            {"lead": str(lead.id), "items": items_payload(product)},
            format="json",
        )
        assert resp.status_code == 201, resp.data
        deal = Deal.objects.get(pk=resp.data["id"])
        assert deal.lead_id == lead.id
        assert deal.client_id == lead.client_id
        assert deal.title == lead.contact_name
        assert deal.number.startswith("D-")
        assert deal.status == Deal.STATUS_OPEN

    def test_lead_can_be_converted_only_once(self, api_client, manager, make_lead, make_item):
        lead = make_lead()
        product = make_item()
        api_client.force_authenticate(manager)
        first = api_client.post(
            reverse("deals-list"),
            {"lead": str(lead.id), "items": items_payload(product)},
            format="json",
        )
        assert first.status_code == 201
        second = api_client.post(
            reverse("deals-list"),
            {"lead": str(lead.id), "items": items_payload(product)},
            format="json",
        )
        assert second.status_code == 400
        assert "уже конвертирован" in second.data["detail"]

    def test_convert_requires_items(self, api_client, manager, make_lead):
        lead = make_lead()
        api_client.force_authenticate(manager)
        resp = api_client.post(
            reverse("deals-list"),
            {"lead": str(lead.id), "items": []},
            format="json",
        )
        assert resp.status_code == 400

    def test_client_cannot_create_deal(self, api_client, client_user, make_lead, make_item):
        lead = make_lead()
        product = make_item()
        api_client.force_authenticate(client_user)
        resp = api_client.post(
            reverse("deals-list"),
            {"lead": str(lead.id), "items": items_payload(product)},
            format="json",
        )
        assert resp.status_code == 403

    def test_available_leads_excludes_converted(self, api_client, manager, make_lead, make_item):
        lead1, lead2 = make_lead(), make_lead()
        api_client.force_authenticate(manager)
        api_client.post(
            reverse("deals-list"),
            {"lead": str(lead1.id), "items": items_payload(make_item())},
            format="json",
        )
        resp = api_client.get(reverse("deals-leads-available"))
        ids = {r["id"] for r in resp.data}
        assert str(lead1.id) not in ids
        assert str(lead2.id) in ids


class TestTotals:
    def test_single_item_totals(self, make_deal, make_item, manager):
        product = make_item(price=1000, cost=400)
        deal = make_deal([{"item": product, "quantity": 2}], user=manager)
        deal.refresh_from_db()
        assert deal.subtotal == 2000
        assert deal.discount == 0
        assert deal.tax == 0
        assert deal.total == 2000
        assert deal.total_cost == 800
        assert deal.profit == 1200
        assert deal.margin == 60

    def test_multi_item_with_discount_tax(self, make_deal, make_item, make_lead, manager):
        lead = make_lead()
        p1 = make_item(price=1000, cost=400)
        p2 = make_item(price=500, cost=100)
        deal = convert_lead_to_deal(
            user=manager,
            lead=lead,
            items=[
                {"item": p1, "quantity": 2, "discount": 100, "tax": 50},
                {"item": p2, "quantity": 1},
            ],
            discount=200,
            tax=100,
        )
        deal.refresh_from_db()
        # subtotal = 2000 + 500 = 2500
        assert deal.subtotal == 2500
        # discounts: line 100 + order 200 = 300
        # taxes: line 50 + order 100 = 150
        # total = 2500 - 300 + 150 = 2350
        assert deal.discount == 200
        assert deal.tax == 100
        assert deal.total == 2350
        assert deal.total_cost == 900
        assert deal.profit == 1450

    def test_update_replaces_items_and_recalculates(
        self, api_client, manager, make_deal, make_item, make_lead
    ):
        lead = make_lead()
        p1 = make_item(price=1000, cost=400)
        p2 = make_item(price=300, cost=100)
        deal = convert_lead_to_deal(user=manager, lead=lead, items=[{"item": p1, "quantity": 1}])
        api_client.force_authenticate(manager)
        resp = api_client.patch(
            reverse("deal-detail", args=[deal.id]),
            {"items": [{"item": str(p2.id), "quantity": "2", "discount": "50"}]},
            format="json",
        )
        assert resp.status_code == 200
        deal.refresh_from_db()
        assert deal.subtotal == 600
        assert deal.total == 550  # 600 - 50
        assert deal.items.count() == 1

    def test_item_snapshot_keeps_values(self, make_deal, make_item, manager):
        product = make_item(price=1000, cost=400)
        deal = make_deal([{"item": product, "quantity": 1}], user=manager)
        product.price = 5000
        product.save()
        deal.refresh_from_db()
        item = deal.items.get()
        assert item.unit_price == 1000
        assert item.cost_price == 400
        assert deal.total == 1000


class TestStockEffects:
    def test_won_decreases_stock(self, make_deal, make_item, manager, make_lead):
        product = make_item(price=100, cost=40, stock=10)
        deal = convert_lead_to_deal(
            user=manager,
            lead=make_lead(),
            items=[{"item": product, "quantity": 3}],
        )
        change_deal_status(manager, deal, Deal.STATUS_WON)
        product.refresh_from_db()
        assert product.stock == 7
        movement = InventoryMovement.objects.get(
            item=product, movement_type=InventoryMovement.TYPE_SALE
        )
        assert movement.quantity == -3
        assert movement.balance_after == 7
        deal.refresh_from_db()
        assert deal.status == Deal.STATUS_WON
        assert deal.won_at is not None

    def test_won_blocks_insufficient_stock(self, make_deal, make_item, manager, make_lead):
        product = make_item(price=100, cost=40, stock=2)
        deal = convert_lead_to_deal(
            user=manager,
            lead=make_lead(),
            items=[{"item": product, "quantity": 5}],
        )
        with pytest.raises(DealError) as exc:
            change_deal_status(manager, deal, Deal.STATUS_WON)
        assert exc.value.shortages
        product.refresh_from_db()
        assert product.stock == 2  # unchanged
        deal.refresh_from_db()
        assert deal.status == Deal.STATUS_OPEN

    def test_won_blocks_fractional_product_quantity(self, make_deal, make_item, manager, make_lead):
        product = make_item(price=100, cost=40, stock=10)
        deal = convert_lead_to_deal(
            user=manager,
            lead=make_lead(),
            items=[{"item": product, "quantity": 1.5}],
        )
        with pytest.raises(DealError):
            change_deal_status(manager, deal, Deal.STATUS_WON)

    def test_reversal_restores_stock(self, make_deal, make_item, manager, make_lead):
        product = make_item(price=100, cost=40, stock=10)
        deal = convert_lead_to_deal(
            user=manager,
            lead=make_lead(),
            items=[{"item": product, "quantity": 4}],
        )
        change_deal_status(manager, deal, Deal.STATUS_WON)
        change_deal_status(manager, deal, Deal.STATUS_CANCELLED)
        product.refresh_from_db()
        assert product.stock == 10
        refund = InventoryMovement.objects.filter(
            item=product, movement_type=InventoryMovement.TYPE_REFUND
        )
        assert refund.count() == 1

    def test_edit_items_of_won_deal_rejected(self, api_client, manager, make_item, make_lead):
        p1 = make_item(price=100, cost=40, stock=10)
        p2 = make_item(price=200, cost=50, stock=5)
        deal = convert_lead_to_deal(
            user=manager,
            lead=make_lead(),
            items=[{"item": p1, "quantity": 1}],
        )
        change_deal_status(manager, deal, Deal.STATUS_WON)
        api_client.force_authenticate(manager)
        resp = api_client.patch(
            reverse("deal-detail", args=[deal.id]),
            {"items": [{"item": str(p2.id), "quantity": "1"}]},
            format="json",
        )
        assert resp.status_code == 400
        assert "позиции выигранной сделки" in str(resp.data["detail"][0])
        # stock untouched by the rejected edit
        p2.refresh_from_db()
        assert p2.stock == 5

    def test_delete_won_deal_returns_stock(self, api_client, manager, make_item, make_lead):
        product = make_item(price=100, cost=40, stock=10)
        deal = convert_lead_to_deal(
            user=manager,
            lead=make_lead(),
            items=[{"item": product, "quantity": 3}],
        )
        change_deal_status(manager, deal, Deal.STATUS_WON)
        product.refresh_from_db()
        assert product.stock == 7
        api_client.force_authenticate(manager)
        resp = api_client.delete(reverse("deal-detail", args=[deal.id]))
        assert resp.status_code == 204
        product.refresh_from_db()
        assert product.stock == 10

    def test_service_items_do_not_touch_stock(self, make_deal, make_item, manager, make_lead):
        service = make_item(type_="service", price=5000, cost=1000)
        deal = convert_lead_to_deal(
            user=manager,
            lead=make_lead(),
            items=[{"item": service, "quantity": 1}],
        )
        change_deal_status(manager, deal, Deal.STATUS_WON)
        assert InventoryMovement.objects.count() == 0

    def test_status_via_api(self, api_client, manager, make_deal, make_item, make_lead):
        product = make_item(price=100, cost=40, stock=10)
        deal = convert_lead_to_deal(
            user=manager,
            lead=make_lead(),
            items=[{"item": product, "quantity": 1}],
        )
        api_client.force_authenticate(manager)
        resp = api_client.post(
            reverse("deal-status", args=[deal.id]),
            {"status": "won"},
            format="json",
        )
        assert resp.status_code == 200
        product.refresh_from_db()
        assert product.stock == 9


class TestPayments:
    def test_payment_updates_paid_amount(
        self, api_client, manager, make_deal, make_item, make_lead
    ):
        product = make_item(price=1000, cost=400)
        deal = convert_lead_to_deal(
            user=manager,
            lead=make_lead(),
            items=[{"item": product, "quantity": 1}],
        )
        api_client.force_authenticate(manager)
        resp = api_client.post(
            reverse("deal-payments", args=[deal.id]),
            {"amount": "400", "method": "card"},
            format="json",
        )
        assert resp.status_code == 201
        deal.refresh_from_db()
        assert deal.paid_amount == 400
        assert DealPayment.objects.filter(deal=deal).count() == 1

    def test_overpayment_rejected(self, api_client, manager, make_item, make_lead):
        product = make_item(price=500, cost=200)
        deal = convert_lead_to_deal(
            user=manager,
            lead=make_lead(),
            items=[{"item": product, "quantity": 1}],
        )
        api_client.force_authenticate(manager)
        resp = api_client.post(
            reverse("deal-payments", args=[deal.id]),
            {"amount": "600", "method": "card"},
            format="json",
        )
        assert resp.status_code == 400
        deal.refresh_from_db()
        assert deal.paid_amount == 0


class TestPermissions:
    def test_client_cannot_view_deals(
        self, api_client, client_user, make_deal, make_item, manager, make_lead
    ):
        convert_lead_to_deal(
            user=manager,
            lead=make_lead(),
            items=[{"item": make_item(), "quantity": 1}],
        )
        api_client.force_authenticate(client_user)
        resp = api_client.get(reverse("deals-list"))
        assert resp.status_code == 403

    def test_manager_can_view_and_update(
        self, api_client, manager, make_deal, make_item, make_lead
    ):
        product = make_item(price=1000, cost=400)
        deal = convert_lead_to_deal(
            user=manager,
            lead=make_lead(),
            items=[{"item": product, "quantity": 1}],
        )
        api_client.force_authenticate(manager)
        resp = api_client.get(reverse("deals-list"))
        assert resp.status_code == 200
        assert resp.data["results"][0]["number"] == deal.number

        resp = api_client.patch(
            reverse("deal-detail", args=[deal.id]),
            {"title": "Новое название"},
            format="json",
        )
        assert resp.status_code == 200
        deal.refresh_from_db()
        assert deal.title == "Новое название"
