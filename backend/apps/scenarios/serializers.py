from rest_framework import serializers

from .models import Scenario, ScenarioTrigger
from .templates import SCENARIO_TEMPLATES


class ScenarioSerializer(serializers.ModelSerializer):
    keywords = serializers.ListField(child=serializers.CharField(max_length=255), allow_empty=False)
    channel_display = serializers.CharField(source="get_channel_display", read_only=True)
    match_mode_display = serializers.CharField(source="get_match_mode_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Scenario
        fields = [
            "id",
            "name",
            "description",
            "channel",
            "channel_display",
            "match_mode",
            "match_mode_display",
            "keywords",
            "reply_text",
            "cooldown_minutes",
            "priority",
            "is_active",
            "trigger_count",
            "last_triggered_at",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "trigger_count",
            "last_triggered_at",
            "created_at",
            "updated_at",
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return None
        return obj.created_by.get_full_name() or obj.created_by.email

    def validate_keywords(self, value):
        cleaned = [kw.strip() for kw in value if kw and kw.strip()]
        if not cleaned:
            raise serializers.ValidationError("Укажите хотя бы одно ключевое слово")
        return cleaned

    def validate_reply_text(self, value):
        if not (value or "").strip():
            raise serializers.ValidationError("Укажите текст ответа клиенту")
        return value


class ScenarioTriggerSerializer(serializers.ModelSerializer):
    scenario_name = serializers.CharField(source="scenario.name", read_only=True)
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    conversation_id = serializers.UUIDField(source="conversation.id", read_only=True)
    message_preview = serializers.SerializerMethodField()
    reply_preview = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ScenarioTrigger
        fields = [
            "id",
            "scenario",
            "scenario_name",
            "conversation_id",
            "client_name",
            "matched_keyword",
            "message_preview",
            "reply_preview",
            "status",
            "status_display",
            "error_message",
            "created_at",
        ]

    def get_message_preview(self, obj):
        return obj.message.text[:255] if obj.message else ""

    def get_reply_preview(self, obj):
        return obj.reply_message.text[:255] if obj.reply_message else ""


class ScenarioTestSerializer(serializers.Serializer):
    text = serializers.CharField(allow_blank=False)

    def validate_text(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Введите текст сообщения для проверки")
        return value


class ScenarioStatsSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    active = serializers.IntegerField()
    total_triggers = serializers.IntegerField()
    responded_today = serializers.IntegerField()
    failed = serializers.IntegerField()


def scenario_template_payload(template: dict) -> dict:
    """Payload of a preset template (minus ``priority`` meta field)."""
    return {key: value for key, value in template.items() if key != "priority"}


def list_scenario_templates() -> list[dict]:
    return [scenario_template_payload(t) for t in SCENARIO_TEMPLATES]
