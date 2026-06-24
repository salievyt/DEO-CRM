from django.db.models import Count
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsAdmin, IsProjectManager

from .models import Project, ProjectStatus, ProjectTeamMember, ServiceType
from .serializers import (
    ProjectCreateSerializer,
    ProjectDetailSerializer,
    ProjectListSerializer,
    ProjectStatusSerializer,
    ProjectTeamMemberSerializer,
    ServiceTypeSerializer,
)


class ProjectListCreateView(generics.ListCreateAPIView):
    """List or create projects."""
    permission_classes = [IsAuthenticated]
    search_fields = ["name", "client__first_name", "client__last_name"]
    ordering_fields = ["created_at", "deadline", "budget"]
    filterset_fields = ["status"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProjectCreateSerializer
        return ProjectListSerializer

    def get_queryset(self):
        qs = Project.objects.select_related("client", "status").all()
        # Staff can see all, clients see only theirs
        if self.request.user.role == "client":
            qs = qs.filter(client__user=self.request.user)
        # Filter by team member
        member = self.request.query_params.get("team_member")
        if member:
            qs = qs.filter(team__user_id=member)
        return qs

    def perform_create(self, serializer):
        project = serializer.save(created_by=self.request.user)
        # Add creator to team as PM
        ProjectTeamMember.objects.get_or_create(
            project=project,
            user=self.request.user,
            defaults={"role_in_project": "pm"},
        )


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a project."""
    permission_classes = [IsAuthenticated]
    queryset = Project.objects.select_related(
        "client", "status", "service_type"
    ).all()
    serializer_class = ProjectDetailSerializer


class ProjectTeamView(generics.ListCreateAPIView):
    """Manage project team."""
    permission_classes = [IsAuthenticated, IsProjectManager]
    serializer_class = ProjectTeamMemberSerializer

    def get_queryset(self):
        return ProjectTeamMember.objects.filter(
            project_id=self.kwargs["project_pk"]
        ).select_related("user")

    def perform_create(self, serializer):
        serializer.save(project_id=self.kwargs["project_pk"])


class ProjectTeamDeleteView(APIView):
    """Remove team member from project."""
    permission_classes = [IsAuthenticated, IsProjectManager]

    def delete(self, request, project_pk, user_pk):
        deleted, _ = ProjectTeamMember.objects.filter(
            project_id=project_pk, user_id=user_pk
        ).delete()
        if deleted:
            return Response(status=204)
        return Response({"error": "Участник не найден"}, status=404)


class ProjectStatusListView(generics.ListAPIView):
    """List all project statuses."""
    permission_classes = [IsAuthenticated]
    queryset = ProjectStatus.objects.all().order_by("order")
    serializer_class = ProjectStatusSerializer


class ServiceTypeListView(generics.ListCreateAPIView):
    """List or create service types."""
    permission_classes = [IsAuthenticated]
    queryset = ServiceType.objects.all()
    serializer_class = ServiceTypeSerializer


class ProjectStatsView(APIView):
    """Project statistics."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        status_counts = Project.objects.values(
            "status__name", "status__color"
        ).annotate(count=Count("id"))
        return Response({
            "total": Project.objects.count(),
            "active": Project.objects.exclude(status__name="Завершен").count(),
            "by_status": status_counts,
        })
