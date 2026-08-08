"""Tests for the catalog module: CRUD, permissions, search/filter, price
history, packages, inventory, bulk ops and CSV import/export."""

import io

from django.urls import reverse

from apps.catalog.models import (
    CatalogItem,
    InventoryMovement,
    PackageItem,
    PriceHistory,
)


class TestPermissions:
    def test_client_cannot_view_catalog(self, api_client, client_user, make_item):
        make_item()
        api_client.force_authenticate(client_user)
        resp = api_client.get(reverse("catalog-items"))
        assert resp.status_code == 403

    def test_marketer_can_view_and_create(self, api_client, marketer, make_category):
        api_client.force_authenticate(marketer)
        resp = api_client.get(reverse("catalog-items"))
        assert resp.status_code == 200

        create = api_client.post(
            reverse("catalog-items"),
            {
                "name": "Курс по маркетингу",
                "type": "service",
                "category": str(make_category().id),
                "price": "15000",
                "cost_price": "5000",
                "duration_minutes": 120,
            },
            format="json",
        )
        assert create.status_code == 201

    def test_developer_view_only(self, api_client, developer, make_category):
        api_client.force_authenticate(developer)
        create = api_client.post(
            reverse("catalog-items"),
            {
                "name": "Товар",
                "type": "product",
                "sku": "DEV-NO",
                "category": str(make_category().id),
                "price": "10",
            },
            format="json",
        )
        assert create.status_code == 403

    def test_manager_can_restock_and_edit_price(self, api_client, manager, make_item):
        item = make_item(stock=3)
        api_client.force_authenticate(manager)
        restock = api_client.post(
            reverse("catalog-item-restock", args=[item.id]),
            {"quantity": 10, "note": "Приход"},
            format="json",
        )
        assert restock.status_code == 200
        item.refresh_from_db()
        assert item.stock == 13

        update = api_client.patch(
            reverse("catalog-item-detail", args=[item.id]),
            {"price": "250"},
            format="json",
        )
        assert update.status_code == 200
        item.refresh_from_db()
        assert item.price == 250


class TestSearchFilterOrder:
    def test_search_by_name_and_sku(self, api_client, manager, make_item):
        a = make_item(name="Ноутбук Pro", sku="LAP-001", price=1000)
        make_item(name="Мышь", sku="MOU-001", price=50)
        api_client.force_authenticate(manager)

        resp = api_client.get(reverse("catalog-items"), {"search": "ноутбук"})
        ids = [r["id"] for r in resp.data["results"]]
        assert str(a.id) in ids
        assert len(ids) == 1

        resp = api_client.get(reverse("catalog-items"), {"search": "MOU-001"})
        assert len(resp.data["results"]) == 1

    def test_filter_by_type_status_category(self, api_client, manager, make_item, make_category):
        cat = make_category("Услуги")
        make_item(type_="product", name="Товар")
        make_item(type_="service", name="Услуга", category=cat)
        archived = make_item(type_="service", name="Архивная", category=cat, status="archived")
        api_client.force_authenticate(manager)

        resp = api_client.get(reverse("catalog-items"), {"type": "service"})
        names = {r["name"] for r in resp.data["results"]}
        assert names == {"Услуга", "Архивная"}

        resp = api_client.get(reverse("catalog-items"), {"category": str(cat.id)})
        assert len(resp.data["results"]) == 2

        resp = api_client.get(reverse("catalog-items"), {"status": "archived"})
        assert [r["id"] for r in resp.data["results"]] == [str(archived.id)]

    def test_ordering_and_pagination(self, api_client, manager, make_item):
        for i in range(5):
            make_item(name=f"Товар {i}", price=100 + i)
        api_client.force_authenticate(manager)
        resp = api_client.get(reverse("catalog-items"), {"ordering": "price", "page_size": 2})
        assert len(resp.data["results"]) == 2
        prices = [r["price"] for r in resp.data["results"]]
        assert prices == sorted(prices)

    def test_filter_stock_status(self, api_client, manager, make_item):
        make_item(name="В наличии", stock=20)
        make_item(name="Мало", stock=2)
        make_item(name="Нет", stock=0)
        api_client.force_authenticate(manager)

        out = api_client.get(reverse("catalog-items"), {"stock_status": "out"})
        assert [r["name"] for r in out.data["results"]] == ["Нет"]

        low = api_client.get(reverse("catalog-items"), {"stock_status": "low"})
        assert [r["name"] for r in low.data["results"]] == ["Мало"]


class TestPriceHistory:
    def test_price_change_recorded(self, api_client, manager, make_item):
        item = make_item(price=100, cost=40)
        api_client.force_authenticate(manager)
        api_client.patch(
            reverse("catalog-item-detail", args=[item.id]),
            {"price": "150", "cost_price": "60", "reason": "Инфляция"},
            format="json",
        )
        history = PriceHistory.objects.filter(item=item).order_by("created_at")
        assert history.count() == 1  # update (item was factory-created)
        last = history.last()
        assert last.old_price == 100
        assert last.new_price == 150
        assert last.old_cost == 40
        assert last.new_cost == 60
        assert last.changed_by == manager
        assert last.reason == "Инфляция"

    def test_no_history_without_change(self, api_client, manager, make_item):
        item = make_item(price=100)
        api_client.force_authenticate(manager)
        api_client.patch(
            reverse("catalog-item-detail", args=[item.id]),
            {"name": "Новое имя"},
            format="json",
        )
        assert PriceHistory.objects.filter(item=item).count() == 0

    def test_price_change_requires_manage_prices(self, api_client, marketer, make_item):
        item = make_item(price=100)
        api_client.force_authenticate(marketer)
        resp = api_client.patch(
            reverse("catalog-item-detail", args=[item.id]),
            {"price": "999"},
            format="json",
        )
        assert resp.status_code == 403


class TestPackages:
    def test_package_price_auto_computed(self, api_client, manager, make_item):
        p1 = make_item(name="Консультация", price=2000, cost=500)
        p2 = make_item(name="Дизайн", price=5000, cost=2000)
        api_client.force_authenticate(manager)
        resp = api_client.post(
            reverse("catalog-items"),
            {
                "name": "Пакет Старт",
                "type": "package",
                "price": "0",
                "package_items": [
                    {"item": str(p1.id), "quantity": "1"},
                    {"item": str(p2.id), "quantity": "2"},
                ],
            },
            format="json",
        )
        assert resp.status_code == 201, resp.data
        package = CatalogItem.objects.get(pk=resp.data["id"])
        # 2000*1 + 5000*2 = 12000
        assert package.price == 12000
        assert PackageItem.objects.filter(package=package).count() == 2


class TestInventory:
    def test_restock_records_movement(self, api_client, manager, make_item):
        item = make_item(stock=5)
        api_client.force_authenticate(manager)
        api_client.post(
            reverse("catalog-item-restock", args=[item.id]),
            {"quantity": 7, "note": "Новая партия"},
            format="json",
        )
        item.refresh_from_db()
        assert item.stock == 12
        movement = InventoryMovement.objects.get(item=item)
        assert movement.movement_type == InventoryMovement.TYPE_RESTOCK
        assert movement.quantity == 7
        assert movement.balance_after == 12

    def test_restock_services_rejected(self, api_client, manager, make_item):
        service = make_item(type_="service")
        api_client.force_authenticate(manager)
        resp = api_client.post(
            reverse("catalog-item-restock", args=[service.id]),
            {"quantity": 1},
            format="json",
        )
        assert resp.status_code == 400

    def test_stock_status_out(self, make_item):
        item = make_item(stock=0)
        assert item.stock_status == "out"
        item.stock = 2
        assert item.stock_status == "low"
        item.stock = 20
        assert item.stock_status == "ok"


class TestBulk:
    def test_bulk_change_status_and_category(self, api_client, manager, make_item, make_category):
        a, b = make_item(), make_item()
        cat = make_category("Новая")
        api_client.force_authenticate(manager)

        resp = api_client.post(
            reverse("catalog-bulk"),
            {"action": "change_status", "ids": [str(a.id), str(b.id)], "status": "inactive"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.data["affected"] == 2
        assert CatalogItem.objects.filter(status="inactive").count() == 2

        resp = api_client.post(
            reverse("catalog-bulk"),
            {"action": "change_category", "ids": [str(a.id)], "category": str(cat.id)},
            format="json",
        )
        assert resp.status_code == 200
        a.refresh_from_db()
        assert a.category_id == cat.id

    def test_bulk_adjust_price_records_history(self, api_client, manager, make_item):
        item = make_item(price=100)
        api_client.force_authenticate(manager)
        resp = api_client.post(
            reverse("catalog-bulk"),
            {"action": "adjust_price", "ids": [str(item.id)], "percent": "10"},
            format="json",
        )
        assert resp.status_code == 200
        item.refresh_from_db()
        assert item.price == 110
        history = PriceHistory.objects.filter(item=item)
        assert history.last().old_price == 100
        assert history.last().new_price == 110

    def test_bulk_delete_requires_manager(self, api_client, marketer, make_item):
        item = make_item()
        api_client.force_authenticate(marketer)
        resp = api_client.post(
            reverse("catalog-bulk"),
            {"action": "delete", "ids": [str(item.id)]},
            format="json",
        )
        assert resp.status_code == 403


class TestCSV:
    def test_export_contains_headers_and_rows(self, api_client, manager, make_item):
        item = make_item(name="Товар Экспорт", price=300)
        api_client.force_authenticate(manager)
        resp = api_client.get(reverse("catalog-export"))
        assert resp.status_code == 200
        assert "text/csv" in resp["Content-Type"]
        body = resp.content.decode("utf-8-sig")
        assert "name,type,category,sku,price" in body
        assert item.name in body

    def test_import_creates_and_updates(self, api_client, manager):
        api_client.force_authenticate(manager)
        csv_content = (
            "name,type,sku,price,cost_price,stock,status,description\n"
            "Импорт Товар,product,IMP-1,500,200,10,active,Описание товара\n"
            "Импорт Услуга,service,,1000,300,,active,Консультация\n"
        )
        resp = api_client.post(
            reverse("catalog-import"),
            {"file": io.BytesIO(csv_content.encode("utf-8"))},
            format="multipart",
        )
        assert resp.status_code == 200, resp.data
        assert resp.data["created"] == 2
        assert resp.data["errors"] == []

        # re-import with same SKU → update
        csv2 = (
            "name,type,sku,price,cost_price,stock,status\n"
            "Импорт Товар 2,product,IMP-1,550,220,5,active\n"
        )
        resp = api_client.post(
            reverse("catalog-import"),
            {"file": io.BytesIO(csv2.encode("utf-8"))},
            format="multipart",
        )
        assert resp.status_code == 200
        assert resp.data["updated"] == 1
        item = CatalogItem.objects.get(sku="IMP-1")
        assert item.name == "Импорт Товар 2"
        assert item.price == 550

    def test_import_reports_errors(self, api_client, manager):
        api_client.force_authenticate(manager)
        csv_content = "name,type,sku,price\n" "Без типа,,X1,10\n" "Ок,product,OK1,20\n"
        resp = api_client.post(
            reverse("catalog-import"),
            {"file": io.BytesIO(csv_content.encode("utf-8"))},
            format="multipart",
        )
        assert resp.status_code == 200
        assert resp.data["created"] == 1
        assert len(resp.data["errors"]) == 1
        assert resp.data["errors"][0]["row"] == 2


class TestValidation:
    def test_product_requires_sku(self, api_client, manager):
        api_client.force_authenticate(manager)
        resp = api_client.post(
            reverse("catalog-items"),
            {"name": "Товар без SKU", "type": "product", "price": "10"},
            format="json",
        )
        assert resp.status_code == 400

    def test_package_requires_items(self, api_client, manager):
        api_client.force_authenticate(manager)
        resp = api_client.post(
            reverse("catalog-items"),
            {"name": "Пустой пакет", "type": "package", "price": "0"},
            format="json",
        )
        assert resp.status_code == 400

    def test_category_list_has_counts(self, api_client, manager, make_item, make_category):
        cat = make_category("Популярная")
        make_item(category=cat)
        make_item(category=cat)
        api_client.force_authenticate(manager)
        resp = api_client.get(reverse("catalog-categories"))
        row = next(r for r in resp.data if r["name"] == "Популярная")
        assert row["item_count"] == 2
