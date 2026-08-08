from rest_framework import serializers

from apps.finance.models import ClientPurchase

from .models import (
    Client,
    ClientInteraction,
    ClientStatus,
    ClientTag,
    ClientTagAssignment,
)
from .services import client_last_contact_at, compute_client_health


class ClientTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientTag
        fields = ["id", "name", "color"]


class ClientStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientStatus
        fields = ["id", "name", "color", "order", "is_system"]
        read_only_fields = ["is_system"]


class ClientInteractionSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ClientInteraction
        fields = ["id", "client", "user", "user_name", "type", "description", "created_at"]
        read_only_fields = ["id", "user", "created_at"]

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name()
        return ""


class ClientListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    tags = serializers.SerializerMethodField()
    total_projects = serializers.IntegerField(read_only=True)

    class Meta:
        model = Client
        fields = [
            "id", "full_name", "first_name", "last_name", "company_name",
            "phone", "email", "source", "is_active", "tags",
            "total_projects", "created_at",
        ]

    def get_tags(self, obj):
        return [
            {"id": a.tag.id, "name": a.tag.name, "color": a.tag.color}
            for a in obj.tag_assignments.select_related("tag").all()
        ]


class ClientDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    tags = serializers.SerializerMethodField()
    total_revenue = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    total_projects = serializers.IntegerField(read_only=True)
    status = ClientStatusSerializer(read_only=True)
    health = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            "id", "full_name", "first_name", "last_name", "company_name",
            "phone", "email", "telegram", "whatsapp", "address",
            "source", "notes", "is_active", "status", "health", "tags",
            "total_revenue", "total_projects", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_tags(self, obj):
        return [
            {"id": a.tag.id, "name": a.tag.name, "color": a.tag.color}
            for a in obj.tag_assignments.select_related("tag").all()
        ]

    def get_health(self, obj):
        return compute_client_health(obj)


class ClientCreateSerializer(serializers.ModelSerializer):
    tags = serializers.ListField(
        child=serializers.UUIDField(), required=False, write_only=True
    )

    class Meta:
        model = Client
        fields = [
            "first_name", "last_name", "company_name", "phone", "email",
            "telegram", "whatsapp", "address", "source", "notes", "tags",
        ]

    def create(self, validated_data):
        tags = validated_data.pop("tags", [])
        client = Client.objects.create(**validated_data)
        for tag_id in tags:
            try:
                tag = ClientTag.objects.get(id=tag_id)
                ClientTagAssignment.objects.create(client=client, tag=tag)
            except ClientTag.DoesNotExist:
                pass
        return client


class ClientPurchaseSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_id = serializers.UUIDField(source="product.id", read_only=True)
    total_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = ClientPurchase
        fields = [
            "id", "product_id", "product_name", "quantity",
            "unit_price", "total_price", "invoice", "purchased_at",
        ]
        read_only_fields = ["id", "purchased_at"]


class ClientPurchaseCreateSerializer(serializers.ModelSerializer):
    unit_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )
    product_id = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    total_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = ClientPurchase
        fields = [
            "id", "product", "product_id", "product_name", "quantity",
            "unit_price", "total_price", "invoice",
        ]
        read_only_fields = ["id"]

    def get_product_id(self, obj):
        return str(obj.product_id)

    def get_product_name(self, obj):
        return obj.product.name

    def validate(self, attrs):
        product = attrs.get("product")
        if product is not None and attrs.get("unit_price") is None:
            attrs["unit_price"] = product.price or 0
        return attrs


class ClientOverviewSerializer(serializers.Serializer):
    """Aggregated data for the Client 360 overview tab."""

    client = ClientDetailSerializer(read_only=True)
    summary = serializers.DictField(read_only=True)
    counts = serializers.DictField(read_only=True)


class ActivityItemSerializer(serializers.Serializer):
    """A single entry of the unified activity timeline."""

    id = serializers.UUIDField(read_only=True)
    entity_type = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True, allow_blank=True)
    actor = serializers.CharField(read_only=True, allow_blank=True)
    ref_id = serializers.UUIDField(read_only=True, allow_null=True)
    ref_label = serializers.CharField(read_only=True, allow_blank=True)
    timestamp = serializers.DateTimeField(read_only=True)
    meta = serializers.DictField(read_only=True, required=False)
