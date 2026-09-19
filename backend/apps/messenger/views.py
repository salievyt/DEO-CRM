import logging

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsProjectManager

from .models import Chat, ChatParticipant, Message
from .realtime import broadcast_message, broadcast_read
from .serializers import (
    AddParticipantsSerializer,
    ChatCreateSerializer,
    ChatDetailSerializer,
    ChatListSerializer,
    MessageCreateSerializer,
    MessageSerializer,
)

logger = logging.getLogger("messenger.views")


def _is_manager(user) -> bool:
    return (
        user.is_authenticated
        and user.role is not None
        and user.role.name in ("superadmin", "owner", "project_manager")
    )


class ChatListCreateView(generics.ListCreateAPIView):
    """List or create chats.

    Group chats are reserved for project managers and above; direct chats can
    be created by any authenticated employee.
    """

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ChatCreateSerializer
        return ChatListSerializer

    def get_queryset(self):
        qs = Chat.objects.filter(
            participants__user=self.request.user
        ).prefetch_related("participants__user").order_by("-updated_at")
        client = self.request.query_params.get("client")
        if client:
            qs = qs.filter(participants__client_id=client)
        return qs

    def create(self, request, *args, **kwargs):
        if request.data.get("is_group") and not _is_manager(request.user):
            raise PermissionDenied("Создавать группы могут только проектные менеджеры и выше")
        return super().create(request, *args, **kwargs)


class ChatDetailView(generics.RetrieveAPIView):
    """Get chat details."""

    permission_classes = [IsAuthenticated]
    serializer_class = ChatDetailSerializer

    def get_queryset(self):
        return Chat.objects.filter(
            participants__user=self.request.user
        ).prefetch_related("participants__user")


class MessageListView(generics.ListCreateAPIView):
    """List or send messages in a chat."""

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return MessageCreateSerializer
        return MessageSerializer

    def _is_participant(self):
        return ChatParticipant.objects.filter(
            chat_id=self.kwargs["chat_pk"], user=self.request.user
        ).exists()

    def get_queryset(self):
        if not self._is_participant():
            return Message.objects.none()
        return Message.objects.filter(
            chat_id=self.kwargs["chat_pk"]
        ).select_related("sender").order_by("created_at")

    def create(self, request, *args, **kwargs):
        if not self._is_participant():
            raise PermissionDenied("Вы не участник этого чата")
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        message = serializer.save(
            chat_id=self.kwargs["chat_pk"],
            sender=self.request.user,
        )
        # Bump the chat so it floats to the top of the list, then fan out.
        Chat.objects.filter(pk=self.kwargs["chat_pk"]).update(updated_at=timezone.now())
        try:
            broadcast_message(message)
        except Exception:  # pragma: no cover - realtime must not break sending
            logger.exception("chat message broadcast failed chat=%s", self.kwargs["chat_pk"])


class ChatParticipantsView(APIView):
    """Manage chat participants (project managers and above)."""

    permission_classes = [IsAuthenticated, IsProjectManager]

    def get_chat(self, pk):
        try:
            return Chat.objects.get(pk=pk)
        except Chat.DoesNotExist:
            return None

    def post(self, request, pk):
        chat = self.get_chat(pk)
        if chat is None:
            return Response({"error": "Чат не найден"}, status=status.HTTP_404_NOT_FOUND)

        serializer = AddParticipantsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from django.contrib.auth import get_user_model

        User = get_user_model()
        users = User.objects.filter(pk__in=serializer.validated_data["user_ids"], is_active=True)
        added = []
        for user in users:
            _, created = ChatParticipant.objects.get_or_create(chat=chat, user=user)
            if created:
                added.append(user.id)

        chat.is_group = True
        chat.save(update_fields=["is_group", "updated_at"])

        return Response(
            ChatDetailSerializer(chat).data,
            status=status.HTTP_201_CREATED if added else status.HTTP_200_OK,
        )

    def delete(self, request, pk, user_id):
        chat = self.get_chat(pk)
        if chat is None:
            return Response({"error": "Чат не найден"}, status=status.HTTP_404_NOT_FOUND)

        deleted, _ = ChatParticipant.objects.filter(chat=chat, user_id=user_id).delete()
        if not deleted:
            return Response({"error": "Участник не найден"}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChatMarkReadView(APIView):
    """Mark a chat as read for the current user."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        participant = ChatParticipant.objects.filter(
            chat_id=pk, user=request.user
        ).first()
        if participant is None:
            return Response({"error": "Чат не найден"}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        participant.last_read_at = now
        participant.save(update_fields=["last_read_at"])
        try:
            broadcast_read(pk, request.user.id, now)
        except Exception:  # pragma: no cover
            logger.exception("chat read broadcast failed chat=%s", pk)
        return Response({"last_read_at": now.isoformat()})


class UnreadCountView(APIView):
    """Get count of unread messages across all chats."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        total_unread = 0
        chats = Chat.objects.filter(participants__user=request.user)
        for chat in chats:
            participant = ChatParticipant.objects.filter(
                chat=chat, user=request.user
            ).first()
            last_read = participant.last_read_at if participant else None
            unread_messages = Message.objects.filter(chat=chat).exclude(sender=request.user)
            if last_read is not None:
                unread_messages = unread_messages.filter(created_at__gt=last_read)
            total_unread += unread_messages.count()

        return Response({"total_unread": total_unread})
