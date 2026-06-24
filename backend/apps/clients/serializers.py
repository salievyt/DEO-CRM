from rest_framework import serializers

from .models import Client, ClientInteraction, ClientTag, ClientTagAssignment


class ClientTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientTag
        fields = ["id", "name", "color"]


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

    class Meta:
        model = Client
        fields = [
            "id", "full_name", "first_name", "last_name", "company_name",
            "phone", "email", "telegram", "whatsapp", "address",
            "source", "notes", "is_active", "tags",
            "total_revenue", "total_projects", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_tags(self, obj):
        return [
            {"id": a.tag.id, "name": a.tag.name, "color": a.tag.color}
            for a in obj.tag_assignments.select_related("tag").all()
        ]


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
