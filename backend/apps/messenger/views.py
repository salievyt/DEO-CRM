from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from .models import Chat, ChatParticipant, Message, MessageReaction
from .serializers import (
    ChatCreateSerializer,
    ChatDetailSerializer,
    ChatListSerializer,
    MessageCreateSerializer,
    MessageSerializer,
)


class ChatListCreateView(generics.ListCreateAPIView):
    """List or create chats."""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ChatCreateSerializer
        return ChatListSerializer

    def get_queryset(self):
        return Chat.objects.filter(
            participants__user=self.request.user
        ).prefetch_related("participants__user").order_by("-updated_at")


class ChatDetailView(generics.RetrieveAPIView):
    """Get chat details."""
    permission_classes = [IsAuthenticated]
    queryset = Chat.objects.prefetch_related("participants__user").all()
    serializer_class = ChatDetailSerializer


class MessageListView(generics.ListCreateAPIView):
    """List or send messages in a chat."""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return MessageCreateSerializer
        return MessageSerializer

    def get_queryset(self):
        return Message.objects.filter(
            chat_id=self.kwargs["chat_pk"]
        ).select_related("sender").order_by("created_at")

    def perform_create(self, serializer):
        serializer.save(
            chat_id=self.kwargs["chat_pk"],
            sender=self.request.user,
        )


class UnreadCountView(APIView):
    """Get count of unread messages across all chats."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Count, Max

        chats = Chat.objects.filter(participants__user=request.user)
        total_unread = 0
        for chat in chats:
            participant = ChatParticipant.objects.filter(
                chat=chat, user=request.user
            ).first()
            last_read = participant.last_read_at if participant else None
            unread = Message.objects.filter(
                chat=chat,
                created_at__gt=last_read,
            ).exclude(sender=request.user).count()
            total_unread += unread

        return Response({"total_unread": total_unread})
