from django.utils import timezone
from django.db.models import Q
from rest_framework import generics, serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from rest_framework.response import Response
from common.permissions import IsProjectManager
from apps.clients.models import Client
from common.permissions import IsStaff
from apps.messaging.models import Conversation
from apps.projects.models import Project
from .models import FollowUp


def sync_followups():
    now = timezone.now()
    created = 0
    for conversation in Conversation.objects.select_related("contact").filter(assigned_user__isnull=False):
        outgoing = conversation.messages.filter(direction="outgoing", status__in=["sent", "delivered", "read"]).order_by("-created_at").first()
        if not outgoing:
            continue
        key = f"reply:{conversation.pk}:{outgoing.pk}"
        answered = conversation.messages.filter(direction="incoming", created_at__gt=outgoing.created_at).exists()
        if answered or conversation.status == "closed":
            FollowUp.objects.filter(source_key__startswith=f"reply:{conversation.pk}:", status="pending").update(status="cancelled")
            continue
        # A newer outgoing message restarts the response window.
        FollowUp.objects.filter(source_key__startswith=f"reply:{conversation.pk}:", status="pending").exclude(source_key=key).update(status="cancelled")
        _, fresh = FollowUp.objects.get_or_create(source_key=key, defaults=dict(client=conversation.contact, owner_id=conversation.assigned_user_id, reason="no_reply", due_at=outgoing.created_at + timezone.timedelta(days=2)))
        created += fresh
    for project in Project.objects.filter(completed_at__isnull=False, progress=100, created_by__isnull=False):
        _, fresh = FollowUp.objects.get_or_create(source_key=f"project:{project.pk}:{project.completed_at.isoformat()}", defaults=dict(client_id=project.client_id, owner_id=project.created_by_id, reason="reactivation", due_at=project.completed_at + timezone.timedelta(days=30)))
        created += fresh
    return {"created": created, "evaluated_at": now.isoformat()}


class FollowUpSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    reason_label = serializers.CharField(source="get_reason_display", read_only=True)

    class Meta:
        model = FollowUp
        fields = ["id", "client", "client_name", "reason", "reason_label", "due_at", "status", "completed_at"]
        read_only_fields = ["id", "client", "reason", "completed_at"]

    def validate(self, attrs):
        if attrs.get("due_at") and attrs["due_at"] <= timezone.now():
            raise serializers.ValidationError({"due_at": "Выберите время в будущем"})
        return attrs

    def update(self, instance, validated_data):
        if "status" in validated_data:
            validated_data["completed_at"] = timezone.now() if validated_data["status"] == "completed" else None
        return super().update(instance, validated_data)


class FollowUpList(generics.ListAPIView):
    permission_classes = [IsStaff]
    serializer_class = FollowUpSerializer

    def get_queryset(self):
        qs = FollowUp.objects.filter(owner=self.request.user, status="pending").select_related("client")
        if self.request.query_params.get("all") != "true":
            qs = qs.filter(due_at__lte=timezone.now())
        return qs

    def post(self, request):
        # Explicit evaluation; normal GET requests never create reminders.
        return Response(sync_followups())


class FollowUpDetail(generics.RetrieveUpdateAPIView):
    permission_classes = [IsStaff]
    serializer_class = FollowUpSerializer
    def get_queryset(self):
        return FollowUp.objects.filter(owner=self.request.user)


class ProposalFollowUp(generics.GenericAPIView):
    permission_classes = [IsStaff]
    class Input(serializers.Serializer):
        from apps.clients.models import Client
        client = serializers.PrimaryKeyRelatedField(queryset=Client.objects.filter(is_active=True))
        event_id = serializers.UUIDField()

        def validate_client(self, client):
            user = self.context["request"].user
            if user.role and user.role.name not in {"superadmin", "owner", "project_manager"} and not Conversation.objects.filter(contact=client, assigned_user=user).exists():
                raise PermissionDenied("Выберите клиента из назначенных вам диалогов")
            return client

    serializer_class = Input

    def post(self, request):
        data = self.get_serializer(data=request.data)
        data.is_valid(raise_exception=True)
        entry, created = FollowUp.objects.get_or_create(source_key=f"proposal:{request.user.pk}:{data.validated_data['event_id']}", defaults=dict(client=data.validated_data['client'], owner=request.user, reason="proposal", due_at=timezone.now() + timezone.timedelta(days=3)))
        return Response(FollowUpSerializer(entry).data, status=201 if created else 200)


class FollowUpClients(APIView):
    permission_classes = [IsStaff]
    def get(self, request):
        if request.user.role and request.user.role.name in {"superadmin", "owner", "project_manager"}:
            clients = Client.objects.filter(is_active=True)
        else:
            client_ids = Conversation.objects.filter(assigned_user=request.user).values_list("contact_id", flat=True)
            clients = Client.objects.filter(is_active=True, id__in=client_ids)
        return Response([{"id": str(c.pk), "full_name": c.full_name} for c in clients.order_by("last_name", "first_name")[:100]])
