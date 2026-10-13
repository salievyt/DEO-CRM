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

class TestRegression:
    def test_repeat_won_reversal_returns_only_current_sale(self, make_deal, make_item, manager):
        product = make_item(stock=10)
        deal = make_deal([{"item": product, "quantity": 3}], user=manager)
        for _ in range(2):
            deal = change_deal_status(manager, deal, "won")
            deal = change_deal_status(manager, deal, "open")
            product.refresh_from_db()
            assert product.stock == 10

    def test_duplicate_product_rows_check_combined_stock(self, make_deal, make_item, manager):
        product = make_item(stock=5)
        deal = make_deal([{"item": product, "quantity": 3}] * 2, user=manager)
        with pytest.raises(DealError):
            change_deal_status(manager, deal, "won")
        product.refresh_from_db()
        assert product.stock == 5

    def test_patch_status_applies_stock_effects(self, api_client, manager, make_deal, make_item):
        product = make_item(stock=10)
        deal = make_deal([{"item": product, "quantity": 2}], user=manager)
        api_client.force_authenticate(manager)
        for new_status, stock in [("won", 8), ("open", 10)]:
            response = api_client.patch(reverse("deal-detail", args=[deal.pk]),
                                        {"status": new_status}, format="json")
            assert response.status_code == 200, response.data
            product.refresh_from_db()
            assert product.stock == stock

    def test_zero_payment_rejected(self, api_client, manager, make_deal, make_item):
        deal = make_deal([{"item": make_item(), "quantity": 1}], user=manager)
        api_client.force_authenticate(manager)
        response = api_client.post(reverse("deal-payments", args=[deal.pk]),
                                   {"amount": "0", "method": "card"}, format="json")
        assert response.status_code == 400
        assert not deal.payments.exists()

    def test_paid_referral_deal_cannot_be_deleted(self, api_client, manager, make_deal, make_item):
        from apps.partners.models import Partner, Referral
        from apps.partners.services import partner_totals

        deal = make_deal([{"item": make_item(price=1000), "quantity": 1}], user=manager)
        partner = Partner.objects.create(name="Партнёр", commission_rate=10)
        Referral.objects.create(partner=partner, lead=deal.lead, commission_rate=10)
        api_client.force_authenticate(manager)
        response = api_client.post(reverse("deal-payments", args=[deal.pk]),
                                   {"amount": "400", "method": "card"}, format="json")
        assert response.status_code == 201
        assert partner_totals(partner)["payable"] == 40
        response = api_client.delete(reverse("deal-detail", args=[deal.pk]))
        assert response.status_code == 400
        assert partner_totals(partner)["payable"] == 40

    def test_referral_link_marks_source_and_freezes_rate(self, api_client, admin_user, make_lead):
        from apps.partners.models import Partner, Referral

        lead = make_lead()
        partner = Partner.objects.create(name="Партнёр", commission_rate=15)
        api_client.force_authenticate(admin_user)
        response = api_client.post(f"/api/v1/partners/{partner.pk}/referrals/",
                                   {"lead": str(lead.pk)}, format="json")
        assert response.status_code == 201, response.data
        lead.refresh_from_db()
        assert lead.source == "referral"
        partner.commission_rate = 20
        partner.save()
        assert Referral.objects.get(lead=lead).commission_rate == 15

    def test_public_referral_retry_creates_one_lead(self, api_client, db):
        import uuid
        from apps.partners.models import Partner, Referral
        from apps.leads.models import Lead

        partner = Partner.objects.create(name="Партнёр", commission_rate=12)
        payload = {"request_id": str(uuid.uuid4()), "contact_name": "Анна",
                   "phone": "+996555123456", "email": "", "business_need": "Сайт",
                   "consent": True}
        url = f"/api/v1/partners/ref/{partner.code}/"
        first = api_client.post(url, payload, format="json")
        assert first.status_code == 201, first.data
        second = api_client.post(url, payload, format="json")
        assert second.status_code == 200, second.data
        assert Referral.objects.filter(partner=partner).count() == 1
        assert Lead.objects.filter(source="referral", contact_name="Анна").count() == 1

    def test_payout_limits_and_retry(self, api_client, admin_user, make_deal, make_item):
        from apps.partners.models import Partner, Referral, PartnerPayout

        deal = make_deal([{"item": make_item(price=1000), "quantity": 1}], user=admin_user)
        partner = Partner.objects.create(name="Партнёр", commission_rate=10)
        Referral.objects.create(partner=partner, lead=deal.lead, commission_rate=10)
        DealPayment.objects.create(deal=deal, amount=400, method="card", created_by=admin_user)
        api_client.force_authenticate(admin_user)
        url = f"/api/v1/partners/{partner.pk}/payouts/"
        assert api_client.post(url, {"amount": "41", "reference": "over"}, format="json").status_code == 400
        payload = {"amount": "40", "reference": "transfer-1"}
        assert api_client.post(url, payload, format="json").status_code == 201
        assert api_client.post(url, payload, format="json").status_code == 200
        assert PartnerPayout.objects.filter(partner=partner).count() == 1

    def test_line_discount_does_not_reduce_other_lines(self, make_deal, make_item, manager):
        deal = make_deal([
            {"item": make_item(price=100), "quantity": 1, "discount": 200},
            {"item": make_item(price=300), "quantity": 1},
        ], user=manager)
        assert deal.total == 300
