from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Chat, ChatParticipant, Message, MessageReaction

User = get_user_model()


def _display_name(user) -> str:
    if user is None:
        return ""
    return user.get_full_name() or user.email or ""


class ChatParticipantSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_avatar = serializers.CharField(source="user.avatar", read_only=True, default="")
    role_name = serializers.CharField(source="user.role.name", read_only=True, default="")

    class Meta:
        model = ChatParticipant
        fields = [
            "id", "user", "user_name", "user_avatar", "role_name",
            "client", "joined_at", "last_read_at",
        ]

    def get_user_name(self, obj):
        return _display_name(obj.user)


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_avatar = serializers.CharField(source="sender.avatar", read_only=True, default="")

    class Meta:
        model = Message
        fields = [
            "id", "chat", "sender", "sender_name", "sender_avatar", "content",
            "file_url", "file_name", "voice_url", "voice_duration",
            "reply_to", "edited_at", "created_at",
        ]

    def get_sender_name(self, obj):
        return _display_name(obj.sender)


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["content", "file_url", "file_name", "reply_to"]


class ChatListSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    participants = ChatParticipantSerializer(many=True, read_only=True)

    class Meta:
        model = Chat
        fields = [
            "id", "name", "display_name", "project", "is_group",
            "participants", "last_message", "unread_count",
            "created_at", "updated_at",
        ]

    def get_last_message(self, obj):
        msg = obj.last_message
        if not msg:
            return None
        return {
            "content": msg.content[:100] if msg.content else "",
            "sender_id": str(msg.sender_id) if msg.sender_id else None,
            "sender_name": _display_name(msg.sender),
            "created_at": msg.created_at,
        }

    def get_unread_count(self, obj):
        request = self.context.get("request")
        user = request.user if request else None
        if user is None or not user.is_authenticated:
            return 0
        participant = obj.participants.filter(user=user).first()
        if not participant or not participant.last_read_at:
            return obj.messages.exclude(sender=user).count()
        return obj.messages.filter(
            created_at__gt=participant.last_read_at
        ).exclude(sender=user).count()

    def get_display_name(self, obj):
        if obj.name:
            return obj.name
        request = self.context.get("request")
        me = request.user if request else None
        others = [
            _display_name(p.user)
            for p in obj.participants.all()
            if p.user is not None and p.user != me
        ]
        if others:
            return ", ".join(others[:3])
        return "Чат"


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
        child=serializers.UUIDField(), write_only=True, required=False, default=list
    )

    class Meta:
        model = Chat
        fields = ["name", "project", "is_group", "participant_ids"]

    def validate(self, attrs):
        if attrs.get("is_group") and not (attrs.get("name") or "").strip():
            raise serializers.ValidationError(
                {"name": "Для группового чата укажите название"}
            )
        return attrs

    def create(self, validated_data):
        participant_ids = validated_data.pop("participant_ids", [])
        user = self.context["request"].user
        chat = Chat.objects.create(created_by=user, **validated_data)

        ChatParticipant.objects.create(chat=chat, user=user)
        for participant_user in User.objects.filter(pk__in=participant_ids):
            ChatParticipant.objects.get_or_create(chat=chat, user=participant_user)
        return chat


class AddParticipantsSerializer(serializers.Serializer):
    user_ids = serializers.ListField(
        child=serializers.UUIDField(), allow_empty=False
    )
