from django.db.models import Count, Q
from rest_framework import filters, generics, status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.permissions import IsAdmin, IsProjectManager

from .models import Client, ClientInteraction, ClientTag
from .serializers import (
    ClientCreateSerializer,
    ClientDetailSerializer,
    ClientInteractionSerializer,
    ClientListSerializer,
    ClientTagSerializer,
)


class ClientListCreateView(generics.ListCreateAPIView):
    """List all clients or create a new one."""
    permission_classes = [IsAuthenticated, IsProjectManager]
    search_fields = ["first_name", "last_name", "company_name", "email", "phone"]
    ordering_fields = ["created_at", "last_name", "company_name"]
    filterset_fields = ["is_active", "source"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ClientCreateSerializer
        return ClientListSerializer

    def get_queryset(self):
        qs = Client.objects.select_related("created_by").prefetch_related(
            "tag_assignments__tag"
        )
        # Filter by tag
        tag_id = self.request.query_params.get("tag")
        if tag_id:
            qs = qs.filter(tag_assignments__tag_id=tag_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ClientDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a client."""
    permission_classes = [IsAuthenticated, IsProjectManager]
    queryset = Client.objects.prefetch_related("tag_assignments__tag").all()
    serializer_class = ClientDetailSerializer


class ClientStatsView(views.APIView):
    """Client statistics for dashboard."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        total = Client.objects.count()
        active = Client.objects.filter(is_active=True).count()
        by_source = Client.objects.values("source").annotate(
            count=Count("id")
        ).order_by("-count")
        return Response({
            "total": total,
            "active": active,
            "by_source": by_source,
        })


class ClientInteractionListView(generics.ListCreateAPIView):
    """List or create interactions for a client."""
    permission_classes = [IsAuthenticated, IsProjectManager]
    serializer_class = ClientInteractionSerializer

    def get_queryset(self):
        return ClientInteraction.objects.filter(
            client_id=self.kwargs["client_pk"]
        ).select_related("user").order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(
            client_id=self.kwargs["client_pk"],
            user=self.request.user,
        )


class ClientTagListView(generics.ListCreateAPIView):
    """List and create client tags."""
    permission_classes = [IsAuthenticated]
    queryset = ClientTag.objects.all().order_by("name")
    serializer_class = ClientTagSerializer


class ClientTagDeleteView(generics.DestroyAPIView):
    """Delete a client tag."""
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = ClientTag.objects.all()
    serializer_class = ClientTagSerializer


class ClientAssignTagsView(views.APIView):
    """Assign tags to a client."""
    permission_classes = [IsAuthenticated, IsProjectManager]

    def post(self, request, client_pk):
        try:
            client = Client.objects.get(pk=client_pk)
        except Client.DoesNotExist:
            return Response({"error": "Клиент не найден"}, status=404)

        tag_ids = request.data.get("tags", [])
        for tag_id in tag_ids:
            try:
                tag = ClientTag.objects.get(pk=tag_id)
                ClientTagAssignment.objects.get_or_create(client=client, tag=tag)
            except ClientTag.DoesNotExist:
                pass
        return Response({"status": "ok"})

    def delete(self, request, client_pk, tag_pk):
        try:
            assignment = ClientTagAssignment.objects.get(
                client_id=client_pk, tag_id=tag_pk
            )
            assignment.delete()
            return Response(status=204)
        except ClientTagAssignment.DoesNotExist:
            return Response({"error": "Тег не назначен клиенту"}, status=404)
