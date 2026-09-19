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

    class Meta:
        model = FormTemplate
        fields = [
            "id", "title", "description", "entity_type", "entity_type_display",
            "form_fields", "is_active", "created_by_name", "link_count",
            "filled_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_filled_count(self, obj):
        return obj.invitations.filter(status=FormInvitation.Status.FILLED).count()

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


class FormInvitationSerializer(serializers.ModelSerializer):
    form_title = serializers.CharField(source="form.title", read_only=True)
    entity_type_display = serializers.CharField(
        source="get_entity_type_display", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    answer_url = serializers.SerializerMethodField()

    class Meta:
        model = FormInvitation
        fields = [
            "id", "form", "form_title", "token", "recipient_name",
            "recipient_email", "entity_type", "entity_type_display", "entity_id",
            "status", "status_display", "expires_at", "submitted_at",
            "response", "answer_url", "created_at",
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