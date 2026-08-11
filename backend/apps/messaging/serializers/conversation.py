from rest_framework import serializers

from ..models import Conversation, TelegramAccount, WhatsAppAccount
from ..models.enums import Channel, MessageType


class ConversationListSerializer(serializers.ModelSerializer):
    contact_id = serializers.UUIDField(source="contact.id", read_only=True)
    contact_name = serializers.CharField(source="contact.full_name", read_only=True)
    contact_phone = serializers.CharField(source="contact.phone", read_only=True)
    company_name = serializers.CharField(source="contact.company_name", read_only=True)
    assigned_user_name = serializers.SerializerMethodField()
    telegram_account_id = serializers.UUIDField(source="telegram_account.id", read_only=True)
    telegram_account_name = serializers.CharField(source="telegram_account.name", read_only=True)

    class Meta:
        model = Conversation
        fields = [
            "id", "contact_id", "contact_name", "contact_phone", "company_name",
            "channel", "status", "assigned_user", "assigned_user_name",
            "unread_count", "last_message_at", "last_message_preview",
            "telegram_account_id", "telegram_account_name",
            "created_at", "updated_at",
        ]
        read_only_fields = fields

    def get_assigned_user_name(self, obj):
        return obj.assigned_user.get_full_name() if obj.assigned_user else None


class ConversationDetailSerializer(ConversationListSerializer):
    """List payload + the latest message (needed by the client card tab)."""

    last_message = serializers.SerializerMethodField()

    class Meta(ConversationListSerializer.Meta):
        fields = ConversationListSerializer.Meta.fields + ["last_message"]

    def get_last_message(self, obj):
        message = obj.messages.order_by("-created_at").first()
        if not message:
            return None
        return {
            "id": str(message.id),
            "direction": message.direction,
            "type": message.type,
            "text": message.text[:200],
            "status": message.status,
            "created_at": message.created_at,
        }


class ConversationCreateSerializer(serializers.Serializer):
    contact_id = serializers.UUIDField()
    channel = serializers.ChoiceField(
        choices=Channel.choices, default=Channel.WHATSAPP
    )
    whatsapp_account_id = serializers.UUIDField(required=False, allow_null=True)
    telegram_account_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, attrs):
        from apps.clients.models import Client

        client = Client.objects.filter(pk=attrs["contact_id"]).first()
        if not client:
            raise serializers.ValidationError({"contact_id": "Клиент не найден"})
        attrs["client"] = client

        if attrs["channel"] == Channel.WHATSAPP:
            account_id = attrs.get("whatsapp_account_id")
            if account_id:
                account = WhatsAppAccount.objects.filter(pk=account_id).first()
                if not account:
                    raise serializers.ValidationError(
                        {"whatsapp_account_id": "Аккаунт WhatsApp не найден"}
                    )
                attrs["whatsapp_account"] = account
            else:
                attrs["whatsapp_account"] = WhatsAppAccount.get_default()
                if attrs["whatsapp_account"] is None:
                    raise serializers.ValidationError(
                        {"channel": "Не настроен ни один WhatsApp аккаунт"}
                    )
        elif attrs["channel"] == Channel.TELEGRAM:
            account_id = attrs.get("telegram_account_id")
            if account_id:
                account = TelegramAccount.objects.filter(pk=account_id).first()
                if not account:
                    raise serializers.ValidationError(
                        {"telegram_account_id": "Telegram бот не найден"}
                    )
                attrs["telegram_account"] = account
            else:
                attrs["telegram_account"] = TelegramAccount.get_default()
                if attrs["telegram_account"] is None:
                    raise serializers.ValidationError(
                        {"channel": "Не настроен ни один Telegram бот"}
                    )
        return attrs


class TemplatePayloadSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    language = serializers.CharField(max_length=10, default="ru")
    parameters = serializers.ListField(
        child=serializers.CharField(max_length=1000),
        required=False,
        allow_empty=True,
    )


class SendMessageSerializer(serializers.Serializer):
    """Payload for POST /conversations/{id}/messages/."""

    text = serializers.CharField(
        required=False, allow_blank=True, allow_null=True, max_length=4096
    )
    type = serializers.ChoiceField(
        choices=MessageType.choices, default=MessageType.TEXT, required=False
    )
    media = serializers.FileField(required=False, allow_null=True)
    media_url = serializers.URLField(required=False, allow_blank=True, allow_null=True)
    filename = serializers.CharField(
        required=False, allow_blank=True, allow_null=True, max_length=255
    )
    template = TemplatePayloadSerializer(required=False, allow_null=True)

    def validate(self, attrs):
        has_text = bool((attrs.get("text") or "").strip())
        has_media = bool(attrs.get("media") or attrs.get("media_url"))
        has_template = bool(attrs.get("template"))
        if not (has_text or has_media or has_template):
            raise serializers.ValidationError(
                "Укажите text, template или media для отправки"
            )
        return attrs
