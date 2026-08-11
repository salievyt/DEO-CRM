from rest_framework import serializers

from .models import (
    Expense, ExpenseCategory, Income, Invoice, InvoiceItem, Payment, Product, Salary
)


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "id", "name", "description", "price", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class InvoiceItemSerializer(serializers.ModelSerializer):
    total_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = InvoiceItem
        fields = ["id", "description", "quantity", "unit_price", "total_price"]


class PaymentSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(
        source="invoice.number", read_only=True, required=False
    )

    class Meta:
        model = Payment
        fields = [
            "id", "invoice", "invoice_number", "amount", "method",
            "paid_at", "transaction_id", "notes",
        ]
        read_only_fields = ["id", "paid_at"]


class InvoiceListSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    project_name = serializers.CharField(
        source="project.name", read_only=True
    )

    class Meta:
        model = Invoice
        fields = [
            "id", "number", "client_name", "project_name",
            "amount", "paid_amount", "status", "issued_date",
            "due_date", "created_at",
        ]


class InvoiceDetailSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    client_name = serializers.CharField(source="client.full_name", read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id", "number", "project", "client", "client_name",
            "amount", "paid_amount", "status", "description",
            "issued_date", "due_date", "paid_at", "items", "payments",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "paid_at", "created_at", "updated_at"]


class InvoiceCreateSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True)

    class Meta:
        model = Invoice
        fields = [
            "project", "client", "amount", "description",
            "issued_date", "due_date", "items",
        ]

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        # Auto-generate invoice number
        from datetime import datetime
        count = Invoice.objects.filter(
            issued_date__year=datetime.now().year
        ).count() + 1
        validated_data["number"] = f"INV-{datetime.now().year}-{count:04d}"
        invoice = Invoice.objects.create(**validated_data)
        for item_data in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item_data)
        return invoice


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = ["id", "name", "description"]


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Expense
        fields = [
            "id", "category", "category_name", "project", "amount",
            "description", "expense_date", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class IncomeSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    method_display = serializers.CharField(source="get_method_display", read_only=True)

    class Meta:
        model = Income
        fields = [
            "id", "client", "client_name", "project", "project_name",
            "amount", "description", "method", "method_display",
            "income_date", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class SalarySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = Salary
        fields = [
            "id", "user", "user_name", "amount", "month",
            "year", "paid_at", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
