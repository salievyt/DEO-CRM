"""Serializers for the deals app."""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from apps.catalog.models import CatalogItem

from .models import Deal, DealItem, DealPayment

User = get_user_model()


class DealItemWriteSerializer(serializers.Serializer):
    """Line item payload on create/update (values are snapshotted)."""

    item = serializers.PrimaryKeyRelatedField(queryset=CatalogItem.objects.all())
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0"))
    discount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0)
    tax = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0)

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Количество должно быть больше нуля.")
        return value


class DealItemSerializer(serializers.ModelSerializer):
    item_type = serializers.CharField(source="item.type", read_only=True, default="")
    item_sku = serializers.CharField(source="item.sku", read_only=True, default="")
    unit = serializers.CharField(source="item.unit", read_only=True, default="")

    class Meta:
        model = DealItem
        fields = (
            "id",
            "item",
            "item_type",
            "item_sku",
            "name",
            "quantity",
            "unit_price",
            "discount",
            "tax",
            "cost_price",
            "line_subtotal",
            "line_total",
            "total_cost",
            "unit",
        )


class DealPaymentSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(
        source="created_by.full_name", read_only=True, default=""
    )

    class Meta:
        model = DealPayment
        fields = (
            "id",
            "amount",
            "method",
            "transaction_id",
            "notes",
            "created_by_name",
            "paid_at",
        )


class DealListSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True, default="")
    lead_contact = serializers.CharField(source="lead.contact_name", read_only=True, default="")
    item_count = serializers.IntegerField(read_only=True)
    assigned_to_name = serializers.CharField(
        source="assigned_to.full_name", read_only=True, default=""
    )
    remaining = serializers.SerializerMethodField()

    class Meta:
        model = Deal
        fields = (
            "id",
            "number",
            "title",
            "status",
            "client",
            "client_name",
            "lead",
            "lead_contact",
            "subtotal",
            "discount",
            "tax",
            "total",
            "total_cost",
            "profit",
            "margin",
            "paid_amount",
            "item_count",
            "assigned_to_name",
            "won_at",
            "created_at",
            "updated_at",
            "remaining",
        )

    def get_remaining(self, obj):
        return max(obj.total - obj.paid_amount, 0)


class DealDetailSerializer(DealListSerializer):
    items = DealItemSerializer(many=True, read_only=True)
    payments = DealPaymentSerializer(many=True, read_only=True)
    documents = serializers.SerializerMethodField()

    class Meta(DealListSerializer.Meta):
        fields = DealListSerializer.Meta.fields + (
            "description",
            "items",
            "payments",
            "documents",
        )

    def get_documents(self, obj):
        docs = obj.documents.all() if hasattr(obj, "documents") else []
        return [{"id": str(d.id), "title": d.title, "file_name": d.file_name} for d in docs]


class DealWriteSerializer(serializers.ModelSerializer):
    """Update a deal: replace items, order discount/tax, basic fields."""

    items = DealItemWriteSerializer(many=True, required=False)

    class Meta:
        model = Deal
        fields = (
            "title",
            "description",
            "status",
            "assigned_to",
            "discount",
            "tax",
            "items",
        )

    def _replace_items(self, deal, items_data):
        deal.items.all().delete()
        for row in items_data:
            item = row["item"]
            DealItem.objects.create(
                deal=deal,
                item=item,
                name=item.name,
                quantity=row["quantity"],
                unit_price=item.price,
                discount=row.get("discount") or 0,
                tax=row.get("tax") or 0,
                cost_price=item.cost_price,
            )

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        if items_data is not None and instance.status == Deal.STATUS_WON:
            raise serializers.ValidationError(
                "Нельзя менять позиции выигранной сделки — остатки уже списаны. "
                "Сначала верните сделку в другой статус."
            )
        with transaction.atomic():
            instance = super().update(instance, validated_data)
            if items_data is not None:
                self._replace_items(instance, items_data)
            instance.recalculate()
        return instance


class DealConvertSerializer(serializers.Serializer):
    """Convert an existing lead into a deal with line items."""

    lead = serializers.UUIDField()
    items = DealItemWriteSerializer(many=True)
    discount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0)
    tax = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, default=0)
    description = serializers.CharField(required=False, allow_blank=True)
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )


class DealStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Deal.STATUS_CHOICES)
