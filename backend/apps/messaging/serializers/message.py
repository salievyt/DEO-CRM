from rest_framework import serializers

from ..models import Message


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.get_full_name", read_only=True)
    contact_name = serializers.CharField(source="contact.full_name", read_only=True)

    class Meta:
        model = Message
        fields = [
            "id", "conversation", "contact", "contact_name", "channel",
            "direction", "type", "text", "media_url", "media_name",
            "external_message_id", "status", "sender", "sender_name",
            "error_code", "error_message", "created_at", "updated_at",
        ]
        read_only_fields = fields
