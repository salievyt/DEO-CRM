from rest_framework import serializers

from .models import EventType, Scenario, ScenarioTrigger
from .templates import SCENARIO_TEMPLATES


class ScenarioSerializer(serializers.ModelSerializer):
    keywords = serializers.ListField(
        child=serializers.CharField(max_length=255),
        required=False,
        allow_empty=True,
    )
    event_type_display = serializers.CharField(source="get_event_type_display", read_only=True)
    action_type_display = serializers.CharField(source="get_action_type_display", read_only=True)
    channel_display = serializers.CharField(source="get_channel_display", read_only=True)
    match_mode_display = serializers.CharField(source="get_match_mode_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Scenario
        fields = [
            "id",
            "name",
            "description",
            "event_type",
            "event_type_display",
            "action_type",
            "action_type_display",
            "action_config",
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

    def validate(self, attrs):
        event_type = attrs.get(
            "event_type",
            self.instance.event_type if self.instance else EventType.MESSAGE,
        )
        if event_type == EventType.MESSAGE:
            keywords = attrs.get(
                "keywords", self.instance.keywords if self.instance else []
            )
            if not [kw for kw in keywords if (kw or "").strip()]:
                raise serializers.ValidationError(
                    {"keywords": "Укажите хотя бы одно ключевое слово"}
                )
            reply_text = attrs.get(
                "reply_text", self.instance.reply_text if self.instance else ""
            )
            if not (reply_text or "").strip():
                raise serializers.ValidationError(
                    {"reply_text": "Укажите текст ответа клиенту"}
                )
        else:
            action_type = attrs.get(
                "action_type",
                self.instance.action_type if self.instance else None,
            )
            if action_type == "reply":
                raise serializers.ValidationError(
                    {
                        "action_type": (
                            "Для событий выберите действие «создать задачу», "
                            "«создать напоминание» или «создать проект»"
                        )
                    }
                )
        return attrs


class ScenarioTriggerSerializer(serializers.ModelSerializer):
    scenario_name = serializers.CharField(source="scenario.name", read_only=True)
    client_name = serializers.CharField(source="client.full_name", read_only=True, allow_null=True, default=None)
    event_type_display = serializers.SerializerMethodField()
    conversation_id = serializers.SerializerMethodField()
    message_preview = serializers.SerializerMethodField()
    reply_preview = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ScenarioTrigger
        fields = [
            "id",
            "scenario",
            "scenario_name",
            "event_type",
            "event_type_display",
            "entity_type",
            "entity_id",
            "entity_label",
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

    def get_event_type_display(self, obj):
        return dict(EventType.choices).get(obj.event_type, obj.event_type)

    def get_conversation_id(self, obj):
        return getattr(obj.conversation, "id", None)

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
    """Payload of a preset template (minus ``priority`` meta field).

    Event-driven templates do not train keywords/reply text; normalize those
    to their empty defaults so callers can treat every template uniformly.
    """
    payload = {key: value for key, value in template.items() if key != "priority"}
    if "event_type" not in payload:
        payload["event_type"] = EventType.MESSAGE
    payload.setdefault("keywords", [])
    payload.setdefault("reply_text", "")
    return payload


def list_scenario_templates() -> list[dict]:
    return [scenario_template_payload(t) for t in SCENARIO_TEMPLATES]
