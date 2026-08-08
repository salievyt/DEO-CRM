from rest_framework import serializers

from .models import Reminder, ReminderLog, ReminderRule


class ReminderRuleSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source="get_type_display", read_only=True)
    priority_display = serializers.CharField(
        source="get_priority_display", read_only=True
    )

    class Meta:
        model = ReminderRule
        fields = [
            "id",
            "name",
            "type",
            "type_display",
            "enabled",
            "conditions",
            "priority",
            "priority_display",
            "target_roles",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ReminderSerializer(serializers.ModelSerializer):
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    client_name = serializers.SerializerMethodField()
    deal_title = serializers.SerializerMethodField()
    task_title = serializers.SerializerMethodField()
    invoice_number = serializers.SerializerMethodField()
    rule_name = serializers.CharField(source="rule.name", read_only=True, default=None)
    rule_type = serializers.CharField(source="rule.type", read_only=True, default=None)
    cta = serializers.SerializerMethodField()

    class Meta:
        model = Reminder
        fields = [
            "id",
            "user",
            "client",
            "client_name",
            "deal",
            "deal_title",
            "task",
            "task_title",
            "invoice",
            "invoice_number",
            "rule",
            "rule_name",
            "rule_type",
            "title",
            "description",
            "priority",
            "priority_display",
            "status",
            "status_display",
            "due_at",
            "snoozed_until",
            "created_at",
            "dismissed_at",
            "completed_at",
            "cta",
        ]
        read_only_fields = fields

    def get_client_name(self, obj):
        if obj.client:
            return obj.client.full_name
        if obj.deal and obj.deal.client:
            return obj.deal.client.full_name
        return None

    def get_deal_title(self, obj):
        if obj.deal:
            return obj.deal.contact_name
        return None

    def get_task_title(self, obj):
        if obj.task:
            return obj.task.title
        return None

    def get_invoice_number(self, obj):
        if obj.invoice:
            return obj.invoice.number
        return None

    def get_cta(self, obj):
        cta = {}
        if obj.client:
            cta["open_client"] = str(obj.client.id)
            if obj.client.phone:
                cta["call"] = obj.client.phone
            contact = obj.client.whatsapp or obj.client.phone
            if contact:
                cta["whatsapp"] = contact
        if obj.deal:
            cta["open_deal"] = str(obj.deal.id)
            if "call" not in cta and obj.deal.phone:
                cta["call"] = obj.deal.phone
        if obj.task:
            cta["open_task"] = str(obj.task.id)
        if obj.invoice:
            cta["open_invoice"] = str(obj.invoice.id)
        return cta


class ReminderLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.get_full_name", read_only=True, default="")
    action_display = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        model = ReminderLog
        fields = [
            "id",
            "reminder",
            "actor",
            "actor_name",
            "action",
            "action_display",
            "details",
            "created_at",
        ]
        read_only_fields = fields


class ReminderSnoozeSerializer(serializers.Serializer):
    period = serializers.ChoiceField(
        choices=["1h", "today", "tomorrow", "week", "custom"],
        required=False,
    )
    custom_at = serializers.DateTimeField(required=False, allow_null=True)

    def validate(self, attrs):
        period = attrs.get("period")
        custom_at = attrs.get("custom_at")
        if period == "custom" and not custom_at:
            raise serializers.ValidationError(
                {"custom_at": "Для периода 'custom' укажите custom_at"}
            )
        if period is None and custom_at is None:
            raise serializers.ValidationError(
                "Укажите period или custom_at"
            )
        return attrs
