from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ..logging import audit_log
from ..models import Conversation, WhatsAppAccount
from ..models.enums import Channel, ConversationStatus
from ..permissions import IsInboxStaff
from ..serializers import (
    ConversationCreateSerializer,
    ConversationDetailSerializer,
    ConversationListSerializer,
)
from ..services.conversations import (
    conversation_serialized,
    get_or_create_client_for_lead,
    get_or_create_conversation,
    mark_conversation_read,
)
from ..services.realtime import notify


class ConversationListCreateView(generics.ListCreateAPIView):
    """List conversations (filters) or create a new one."""

    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ConversationCreateSerializer
        return ConversationListSerializer

    def get_queryset(self):
        qs = Conversation.objects.select_related(
            "contact", "assigned_user", "whatsapp_account"
        ).all()

        channel = self.request.query_params.get("channel")
        if channel:
            qs = qs.filter(channel=channel)
        cstatus = self.request.query_params.get("status")
        if cstatus:
            qs = qs.filter(status=cstatus)
        if self.request.query_params.get("unread") == "true":
            qs = qs.filter(unread_count__gt=0)
        if self.request.query_params.get("assigned") == "me":
            qs = qs.filter(assigned_user=self.request.user)
        contact = self.request.query_params.get("contact")
        if contact:
            qs = qs.filter(contact_id=contact)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(contact__first_name__icontains=search)
                | Q(contact__last_name__icontains=search)
                | Q(contact__company_name__icontains=search)
                | Q(contact__phone__icontains=search)
            )
        return qs

    def create(self, request, *args, **kwargs):
        serializer = ConversationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation = self._create_conversation(serializer.validated_data)
        notify(conversation, "conversation.created", conversation_serialized(conversation))
        return Response(
            ConversationListSerializer(conversation, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @staticmethod
    def _create_conversation(validated_data):
        client = validated_data["client"]
        channel = validated_data["channel"]
        account = validated_data.get("whatsapp_account")
        return get_or_create_conversation(account, client, channel)


class ConversationFromLeadView(APIView):
    """Open (or reuse) a WhatsApp conversation for a lead.

    If the lead has no linked Client yet, one is created from the lead's
    contact data (or found by phone) and linked back to the lead — so the
    manager can start chatting from the lead card directly.
    """

    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]

    def post(self, request):
        from apps.leads.models import Lead

        lead_id = request.data.get("lead_id")
        if not lead_id:
            return Response({"error": "lead_id обязателен"}, status=400)

        lead = Lead.objects.filter(pk=lead_id).first()
        if not lead:
            return Response({"error": "Лид не найден"}, status=404)
        if not lead.phone:
            return Response({"error": "У лида не указан телефон"}, status=400)

        client = get_or_create_client_for_lead(lead)
        account = WhatsAppAccount.get_default()
        if account is None:
            return Response(
                {"error": "Не настроен ни один WhatsApp аккаунт"}, status=400
            )

        existed = Conversation.objects.filter(contact=client, channel=Channel.WHATSAPP)\
            .filter(whatsapp_account=account).exists()
        conversation = get_or_create_conversation(
            account, client, Channel.WHATSAPP
        )
        audit_log(request.user, "conversation.from_lead", "messaging_conversation",
                  conversation.id, {"lead_id": str(lead.id)})
        if not existed:
            notify(conversation, "conversation.created", conversation_serialized(conversation))
        return Response(
            ConversationListSerializer(conversation, context={"request": request}).data
        )


class ConversationDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]
    queryset = Conversation.objects.select_related("contact", "assigned_user")
    serializer_class = ConversationDetailSerializer


class ConversationReadView(APIView):
    """Mark a conversation as read (resets unread_count)."""

    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]

    def post(self, request, pk):
        conversation = Conversation.objects.filter(pk=pk).first()
        if not conversation:
            return Response({"error": "Диалог не найден"}, status=404)
        prev = mark_conversation_read(conversation)
        if prev:
            notify(conversation, "conversation.updated", conversation_serialized(conversation))
        return Response({"detail": "ok", "unread_before": prev})


class ConversationCloseView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]

    def post(self, request, pk):
        conversation = Conversation.objects.filter(pk=pk).first()
        if not conversation:
            return Response({"error": "Диалог не найден"}, status=404)
        conversation.status = ConversationStatus.CLOSED
        conversation.save(update_fields=["status", "updated_at"])
        audit_log(request.user, "conversation.close", "messaging_conversation",
                  conversation.id, {"channel": conversation.channel})
        notify(conversation, "conversation.updated", conversation_serialized(conversation))
        return Response({"detail": "ok"})


class ConversationReopenView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]

    def post(self, request, pk):
        conversation = Conversation.objects.filter(pk=pk).first()
        if not conversation:
            return Response({"error": "Диалог не найден"}, status=404)
        conversation.status = ConversationStatus.OPEN
        conversation.save(update_fields=["status", "updated_at"])
        audit_log(request.user, "conversation.reopen", "messaging_conversation",
                  conversation.id, {"channel": conversation.channel})
        notify(conversation, "conversation.updated", conversation_serialized(conversation))
        return Response({"detail": "ok"})


class ConversationAssignView(APIView):
    """Assign a manager to a conversation."""

    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]

    def post(self, request, pk):
        conversation = Conversation.objects.filter(pk=pk).first()
        if not conversation:
            return Response({"error": "Диалог не найден"}, status=404)

        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"error": "user_id обязателен"}, status=400)

        from apps.accounts.models import User
        from ..permissions import has_inbox_role

        user = User.objects.filter(pk=user_id, is_active=True).first()
        if not user or not has_inbox_role(user):
            return Response({"error": "Пользователь не найден или не имеет доступа к Inbox"},
                            status=400)

        conversation.assigned_user = user
        conversation.save(update_fields=["assigned_user", "updated_at"])
        audit_log(request.user, "conversation.assign", "messaging_conversation",
                  conversation.id, {"user_id": str(user.id)})
        notify(conversation, "conversation.updated", conversation_serialized(conversation))
        return Response(
            ConversationListSerializer(conversation, context={"request": request}).data
        )


class ConversationCanSendView(APIView):
    """Check whether a free-form message may be sent (24h window heuristic).

    The WhatsApp API stays the source of truth — if a send fails with
    ``template_required`` the UI receives the template picker payload instead.
    """

    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]

    def get(self, request, pk):
        conversation = Conversation.objects.filter(pk=pk).first()
        if not conversation:
            return Response({"error": "Диалог не найден"}, status=404)

        if conversation.channel != Channel.WHATSAPP:
            return Response({
                "can_send_text": True,
                "reason": None,
                "templates": [],
                "channel": conversation.channel,
            })

        can_send = conversation.conversation_window_open()
        templates = []
        if not can_send:
            from ..services.templates import get_cached_templates

            account = conversation.whatsapp_account or WhatsAppAccount.get_default()
            if account:
                try:
                    templates = get_cached_templates(account)
                except Exception:
                    templates = []

        return Response({
            "can_send_text": can_send,
            "reason": None if can_send else "conversation_window_closed",
            "templates": templates,
            "channel": conversation.channel,
        })
