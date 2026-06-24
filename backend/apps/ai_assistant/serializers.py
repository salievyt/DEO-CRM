from rest_framework import serializers

from .models import AIRequest, AIPromptTemplate


class AIPromptTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIPromptTemplate
        fields = [
            "id", "name", "prompt_type", "system_prompt",
            "user_prompt_template", "variables_schema",
        ]


class AIRequestSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    template_name = serializers.CharField(
        source="template.name", read_only=True
    )

    class Meta:
        model = AIRequest
        fields = [
            "id", "user", "user_name", "template", "template_name",
            "prompt_type", "input_data", "output_data", "model",
            "tokens_used", "status", "created_at", "completed_at",
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
