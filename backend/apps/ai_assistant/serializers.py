from rest_framework import serializers

from .models import AIRequest, AIPromptTemplate, AISettings


def mask_api_key(value):
    """Return a masked preview of a secret key (never the full value)."""
    if not value:
        return ""
    if len(value) <= 8:
        return value[0] + "…" * (len(value) - 1)
    return f"{value[:6]}…{value[-4:]}"


class AISettingsSerializer(serializers.ModelSerializer):
    """Settings with write-only API key; responses contain a masked preview."""

    api_key = serializers.CharField(
        write_only=True, required=False, allow_blank=True, trim_whitespace=False
    )
    api_key_preview = serializers.SerializerMethodField()

    class Meta:
        model = AISettings
        fields = [
            "api_url",
            "api_key",
            "api_key_preview",
            "model",
            "temperature",
            "max_tokens",
            "timeout",
            "enabled",
            "configured",
            "updated_at",
        ]
        read_only_fields = ["configured", "updated_at"]
        extra_kwargs = {
            "api_url": {"required": False},
            "model": {"required": False},
        }

    def get_api_key_preview(self, obj):
        return mask_api_key(obj.api_key)

    def update(self, instance, validated_data):
        if not validated_data.get("api_key"):
            # blank key = keep the existing one
            validated_data.pop("api_key", None)
        return super().update(instance, validated_data)


class AIPromptTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIPromptTemplate
        fields = [
            "id",
            "name",
            "prompt_type",
            "system_prompt",
            "user_prompt_template",
            "variables_schema",
        ]


class AIRequestSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    template_name = serializers.CharField(source="template.name", read_only=True)

    class Meta:
        model = AIRequest
        fields = [
            "id",
            "user",
            "user_name",
            "template",
            "template_name",
            "prompt_type",
            "input_data",
            "output_data",
            "model",
            "tokens_used",
            "status",
            "created_at",
            "completed_at",
        ]
        read_only_fields = ["id", "user", "status", "created_at", "completed_at"]


class AIGenerateSerializer(serializers.Serializer):
    """Serializer for AI generation requests."""

    prompt_type = serializers.ChoiceField(choices=AIPromptTemplate.PROMPT_TYPE_CHOICES)
    project_id = serializers.UUIDField(required=False)
    client_id = serializers.UUIDField(required=False)
    variables = serializers.JSONField(default=dict)

    def validate_variables(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("variables must be a JSON object")
        return value
