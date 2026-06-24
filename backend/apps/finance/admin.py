from django.contrib import admin

from .models import Expense, ExpenseCategory, Invoice, InvoiceItem, Payment, Salary


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 1


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    readonly_fields = ["paid_at"]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = [
        "number", "client", "project", "amount", "paid_amount",
        "status", "issued_date", "due_date"
    ]
    list_filter = ["status", "issued_date"]
    search_fields = ["number", "client__first_name", "client__last_name"]
    inlines = [InvoiceItemInline, PaymentInline]
    date_hierarchy = "issued_date"


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["invoice", "amount", "method", "paid_at"]


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "description"]


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ["category", "amount", "description", "expense_date"]
    list_filter = ["category", "expense_date"]
    date_hierarchy = "expense_date"


@admin.register(Salary)
class SalaryAdmin(admin.ModelAdmin):
    list_display = ["user", "amount", "month", "year", "paid_at"]
    list_filter = ["month", "year"]
