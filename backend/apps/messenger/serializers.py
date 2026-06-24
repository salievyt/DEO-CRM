from rest_framework import serializers

from .models import Chat, ChatParticipant, Message, MessageReaction


class ChatParticipantSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = ChatParticipant
        fields = ["id", "user", "user_name", "joined_at", "last_read_at"]


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.get_full_name", read_only=True)

    class Meta:
        model = Message
        fields = [
            "id", "chat", "sender", "sender_name", "content",
            "file_url", "file_name", "voice_url", "voice_duration",
            "reply_to", "edited_at", "created_at",
        ]


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["content", "file_url", "file_name", "reply_to"]


class ChatListSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = [
            "id", "name", "project", "is_group",
            "last_message", "unread_count", "created_at", "updated_at",
        ]

    def get_last_message(self, obj):
        msg = obj.last_message
        if msg:
            return {
                "content": msg.content[:100] if msg.content else "",
                "sender_name": msg.sender.get_full_name() if msg.sender else "",
                "created_at": msg.created_at,
            }
        return None

    def get_unread_count(self, obj):
        user = self.context["request"].user
        participant = obj.participants.filter(user=user).first()
        if not participant or not participant.last_read_at:
            return obj.messages.count()
        return obj.messages.filter(
            created_at__gt=participant.last_read_at
        ).exclude(sender=user).count()


class ChatDetailSerializer(serializers.ModelSerializer):
    participants = ChatParticipantSerializer(many=True, read_only=True)

    class Meta:
        model = Chat
        fields = [
            "id", "name", "project", "is_group",
            "participants", "created_at", "updated_at",
        ]


class ChatCreateSerializer(serializers.ModelSerializer):
    participant_ids = serializers.ListField(
        child=serializers.UUIDField(), write_only=True
    )

    class Meta:
        model = Chat
        fields = ["name", "project", "is_group", "participant_ids"]

    def create(self, validated_data):
        participant_ids = validated_data.pop("participant_ids", [])
        chat = Chat.objects.create(**validated_data)

        # Add creator
        user = self.context["request"].user
        ChatParticipant.objects.create(chat=chat, user=user)

        # Add other participants
        from django.contrib.auth import get_user_model
        User = get_user_model()
        for uid in participant_ids:
            try:
                participant_user = User.objects.get(pk=uid)
                ChatParticipant.objects.get_or_create(
                    chat=chat, user=participant_user
                )
            except User.DoesNotExist:
                pass
        return chat
