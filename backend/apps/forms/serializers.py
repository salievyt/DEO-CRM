from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import FormInvitation, FormTemplate

FIELD_TYPES = set(FormTemplate.FIELD_TYPES)


class FormTemplateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    entity_type_display = serializers.CharField(
        source="get_entity_type_display", read_only=True
    )
    link_count = serializers.IntegerField(source="invitations.count", read_only=True)
    filled_count = serializers.SerializerMethodField()
    public_url = serializers.CharField(read_only=True)
    link_lifetime = serializers.ChoiceField(
        choices=("1", "3", "7", "forever"), write_only=True, required=False
    )

    class Meta:
        model = FormTemplate
        fields = [
            "id", "title", "description", "entity_type", "entity_type_display",
            "form_fields", "is_active", "create_lead", "lead_field_map",
            "created_by_name", "link_count",
            "filled_count", "public_token", "public_url", "public_link_expires_at",
            "link_lifetime", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "public_token", "public_link_expires_at", "created_at", "updated_at"
        ]

    def get_filled_count(self, obj):
        return obj.invitations.filter(status=FormInvitation.Status.FILLED).count()

    def create(self, validated_data):
        lifetime = validated_data.pop("link_lifetime", "forever")
        validated_data["public_link_expires_at"] = self._expires_at(lifetime)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        lifetime = validated_data.pop("link_lifetime", None)
        if lifetime is not None:
            validated_data["public_link_expires_at"] = self._expires_at(lifetime)
        return super().update(instance, validated_data)

    @staticmethod
    def _expires_at(lifetime):
        if lifetime == "forever":
            return None
        return timezone.now() + timedelta(days=int(lifetime))

    def validate_form_fields(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Поля должны быть списком объектов.")
        keys = set()
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError("Каждое поле — объект с атрибутами.")
            key = item.get("key")
            if not key:
                raise serializers.ValidationError("У каждого поля должен быть ключ (key).")
            if key in keys:
                raise serializers.ValidationError(f"Дублируется ключ поля: {key}.")
            keys.add(key)
            field_type = item.get("type", "text")
            if field_type not in FIELD_TYPES:
                raise serializers.ValidationError(
                    f"Недопустимый тип поля '{field_type}' для '{key}'."
                )
            if field_type == "select" and not item.get("options"):
                raise serializers.ValidationError(
                    f"Для select-поля '{key}' нужен список options."
                )
        return value

    def validate_lead_field_map(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "Маппинг полей лида должен быть словарём."
            )
        allowed = set(FormTemplate.LEAD_FIELD_MAP_KEYS)
        invalid = set(value) - allowed
        if invalid:
            raise serializers.ValidationError(
                f"Недопустимые атрибуты лида: {', '.join(sorted(invalid))}."
            )
        return value

    def validate(self, attrs):
        lead_map = attrs.get(
            "lead_field_map", getattr(self.instance, "lead_field_map", {}) or {}
        )
        if attrs.get("create_lead", getattr(self.instance, "create_lead", False)):
            if "contact_name" not in lead_map or not lead_map.get("contact_name"):
                raise serializers.ValidationError(
                    {"lead_field_map": "Для создания лида укажите поле контактного имени."}
                )
            field_keys = {item.get("key") for item in attrs.get("form_fields", [])}
            if not field_keys and self.instance is not None:
                field_keys = {
                    item.get("key") for item in getattr(self.instance, "form_fields", [])
                }
            unknown = {
                field_key
                for field_key in lead_map.values()
                if field_key and field_key not in field_keys
            }
            if unknown:
                raise serializers.ValidationError(
                    {
                        "lead_field_map": (
                            "Указанные поля анкеты не существуют: "
                            + ", ".join(sorted(unknown))
                            + "."
                        )
                    }
                )
        return attrs


class FormInvitationSerializer(serializers.ModelSerializer):
    form_title = serializers.CharField(source="form.title", read_only=True)
    entity_type_display = serializers.CharField(
        source="get_entity_type_display", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    answer_url = serializers.SerializerMethodField()
    lead_id = serializers.UUIDField(source="lead.id", read_only=True)
    lead_contact_name = serializers.CharField(source="lead.contact_name", read_only=True)

    class Meta:
        model = FormInvitation
        fields = [
            "id", "form", "form_title", "token", "recipient_name",
            "recipient_email", "entity_type", "entity_type_display", "entity_id",
            "status", "status_display", "expires_at", "submitted_at",
            "response", "answer_url", "lead_id", "lead_contact_name", "created_at",
        ]
        read_only_fields = [
            "id", "token", "status", "submitted_at", "response", "created_at",
        ]

    def get_answer_url(self, obj):
        return obj.answer_url


class FormInvitationCreateSerializer(serializers.ModelSerializer):
    token = serializers.UUIDField(read_only=True)
    answer_url = serializers.SerializerMethodField()

    class Meta:
        model = FormInvitation
        fields = [
            "form", "recipient_name", "recipient_email", "token", "answer_url",
            "entity_type", "entity_id", "expires_at",
        ]

    def get_answer_url(self, obj):
        return obj.answer_url
