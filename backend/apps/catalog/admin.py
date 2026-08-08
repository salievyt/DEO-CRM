from django.contrib import admin

from .models import (
    CatalogCategory,
    CatalogItem,
    InventoryMovement,
    PackageItem,
    PriceHistory,
)


class PackageItemInline(admin.TabularInline):
    model = PackageItem
    fk_name = "package"
    extra = 0


class PriceHistoryInline(admin.TabularInline):
    model = PriceHistory
    extra = 0
    readonly_fields = ("old_price", "new_price", "changed_by", "created_at")


class InventoryMovementInline(admin.TabularInline):
    model = InventoryMovement
    extra = 0
    readonly_fields = ("balance_after", "created_at")


@admin.register(CatalogCategory)
class CatalogCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "color", "created_at")
    search_fields = ("name",)


@admin.register(CatalogItem)
class CatalogItemAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "type",
        "sku",
        "price",
        "cost_price",
        "stock",
        "status",
        "category",
    )
    list_filter = ("type", "status", "category")
    search_fields = ("name", "sku", "description")
    inlines = [PackageItemInline, PriceHistoryInline, InventoryMovementInline]
    readonly_fields = ("created_at", "updated_at")


@admin.register(PriceHistory)
class PriceHistoryAdmin(admin.ModelAdmin):
    list_display = ("item", "old_price", "new_price", "changed_by", "created_at")
    list_filter = ("created_at",)
