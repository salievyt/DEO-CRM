from django.contrib import admin

from .models import Deal, DealItem, DealPayment


class DealItemInline(admin.TabularInline):
    model = DealItem
    extra = 0
    readonly_fields = ("line_subtotal", "line_total", "total_cost")


class DealPaymentInline(admin.TabularInline):
    model = DealPayment
    extra = 0


@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = (
        "number",
        "title",
        "client",
        "status",
        "total",
        "profit",
        "margin",
        "paid_amount",
        "created_at",
    )
    list_filter = ("status",)
    search_fields = ("number", "title", "lead__contact_name")
    readonly_fields = (
        "subtotal",
        "discount",
        "tax",
        "total",
        "total_cost",
        "profit",
        "margin",
        "paid_amount",
        "created_at",
        "updated_at",
    )
    inlines = [DealItemInline, DealPaymentInline]
