"""Serializers for the catalog app."""

from django.db import transaction
from rest_framework import serializers

from .models import (
    CatalogCategory,
    CatalogItem,
    InventoryMovement,
    PackageItem,
    PriceHistory,
)


class CatalogCategorySerializer(serializers.ModelSerializer):
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CatalogCategory
        fields = ("id", "name", "color", "item_count", "created_at")


class PackageItemSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="item.name", read_only=True)
    unit_price = serializers.DecimalField(
        source="item.price", max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = PackageItem
        fields = ("id", "item", "name", "unit_price", "quantity", "total_price")
        extra_kwargs = {"item": {"required": True}}


class PriceHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(
        source="changed_by.full_name", read_only=True, default=""
    )

    class Meta:
        model = PriceHistory
        fields = (
            "id",
            "old_price",
            "new_price",
            "old_cost",
            "new_cost",
            "reason",
            "changed_by_name",
            "created_at",
        )


class InventoryMovementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(
        source="created_by.full_name", read_only=True, default=""
    )

    class Meta:
        model = InventoryMovement
        fields = (
            "id",
            "movement_type",
            "quantity",
            "balance_after",
            "reference",
            "note",
            "created_by_name",
            "created_at",
        )


class CatalogItemListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, default="")
    stock_status = serializers.CharField(read_only=True)

    class Meta:
        model = CatalogItem
        fields = (
            "id",
            "name",
            "description",
            "type",
            "category",
            "category_name",
            "sku",
            "price",
            "cost_price",
            "tax",
            "discount",
            "price_after_discount",
            "stock",
            "low_stock_threshold",
            "stock_status",
            "unit",
            "duration_minutes",
            "billing_period",
            "next_billing_date",
            "image",
            "status",
            "created_at",
            "updated_at",
        )


class CatalogItemDetailSerializer(CatalogItemListSerializer):
    package_items = PackageItemSerializer(many=True, read_only=True)
    price_history = PriceHistorySerializer(many=True, read_only=True)
    inventory_movements = InventoryMovementSerializer(many=True, read_only=True)

    class Meta(CatalogItemListSerializer.Meta):
        fields = CatalogItemListSerializer.Meta.fields + (
            "package_items",
            "price_history",
            "inventory_movements",
        )


class CatalogItemWriteSerializer(serializers.ModelSerializer):
    """Create/update with nested package items and price-history recording."""

    package_items = PackageItemSerializer(many=True, required=False, allow_empty=True)
    reason = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = CatalogItem
        fields = (
            "id",
            "name",
            "description",
            "type",
            "category",
            "sku",
            "price",
            "cost_price",
            "tax",
            "discount",
            "stock",
            "low_stock_threshold",
            "unit",
            "duration_minutes",
            "billing_period",
            "next_billing_date",
            "image",
            "status",
            "package_items",
            "reason",
        )

    def validate(self, attrs):
        item_type = attrs.get("type", getattr(self.instance, "type", None))
        if item_type == CatalogItem.TYPE_PACKAGE:
            payload = attrs.get("package_items")
            if payload is None and self.instance is None:
                raise serializers.ValidationError(
                    {"package_items": "Для пакета укажите входящие позиции."}
                )
        if item_type == CatalogItem.TYPE_PRODUCT:
            # SKU required on create; on update only if provided (avoid
            # clearing an existing SKU with a partial PATCH).
            if self.instance is None and not attrs.get("sku"):
                raise serializers.ValidationError({"sku": "Для товара укажите артикул (SKU)."})
            if attrs.get("sku") == "":
                raise serializers.ValidationError({"sku": "Артикул не может быть пустым."})
        return attrs

    def create(self, validated_data):
        package_items = validated_data.pop("package_items", []) or []
        reason = validated_data.pop("reason", "")
        item_type = validated_data.get("type")

        with transaction.atomic():
            item = CatalogItem.objects.create(**validated_data)
            if item_type == CatalogItem.TYPE_PACKAGE and package_items:
                for pi in package_items:
                    PackageItem.objects.create(
                        package=item,
                        item=pi["item"],
                        quantity=pi.get("quantity", 1),
                    )
                item.price = self._package_total(item)
                item.save(update_fields=["price"])
        self._record_price_history(item, None, None, reason)
        return item

    def update(self, instance, validated_data):
        package_items = validated_data.pop("package_items", None)
        reason = validated_data.pop("reason", "")
        old_price = instance.price
        old_cost = instance.cost_price

        with transaction.atomic():
            instance = super().update(instance, validated_data)
            if instance.type == CatalogItem.TYPE_PACKAGE:
                if package_items is not None:
                    instance.package_items.all().delete()
                    for pi in package_items:
                        PackageItem.objects.create(
                            package=instance,
                            item=pi["item"],
                            quantity=pi.get("quantity", 1),
                        )
                instance.price = self._package_total(instance)
                instance.save(update_fields=["price"])

        price_changed = instance.price != old_price or instance.cost_price != old_cost
        if price_changed:
            self._record_price_history(instance, old_price, old_cost, reason)
        return instance

    @staticmethod
    def _package_total(package):
        total = sum(
            (pi.item.price * pi.quantity for pi in package.package_items.all()),
            0,
        )
        return total

    def _record_price_history(self, item, old_price, old_cost, reason):
        new_price = item.price
        new_cost = item.cost_price
        if old_price is None or new_price != old_price or new_cost != old_cost:
            request = self.context.get("request")
            user = request.user if request and hasattr(request, "user") else None
            PriceHistory.objects.create(
                item=item,
                old_price=old_price,
                new_price=new_price,
                old_cost=old_cost,
                new_cost=new_cost,
                reason=reason,
                changed_by=user if user and user.is_authenticated else None,
            )


class BulkOperationSerializer(serializers.Serializer):
    """Bulk action payload: action + ids (+ optional payload)."""

    ACTION_CHOICES = [
        ("change_status", "Сменить статус"),
        ("change_category", "Сменить категорию"),
        ("adjust_price", "Изменить цены на %"),
        ("delete", "Удалить"),
    ]

    action = serializers.ChoiceField(choices=ACTION_CHOICES)
    ids = serializers.ListField(child=serializers.UUIDField())
    status = serializers.ChoiceField(choices=CatalogItem.STATUS_CHOICES, required=False)
    category = serializers.UUIDField(required=False)
    percent = serializers.DecimalField(max_digits=7, decimal_places=2, required=False)

    def validate(self, attrs):
        action = attrs["action"]
        if action == "change_status" and not attrs.get("status"):
            raise serializers.ValidationError({"status": "Обязательно для change_status."})
        if action == "change_category" and not attrs.get("category"):
            raise serializers.ValidationError({"category": "Обязательно для change_category."})
        if action == "adjust_price" and attrs.get("percent") is None:
            raise serializers.ValidationError({"percent": "Обязательно для adjust_price."})
        return attrs


class RestockSerializer(serializers.Serializer):
    """Increase / adjust stock of a product."""

    quantity = serializers.IntegerField(min_value=0)
    note = serializers.CharField(required=False, allow_blank=True)
