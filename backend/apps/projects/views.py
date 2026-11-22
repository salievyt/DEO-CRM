from decimal import Decimal

from django.db.models import Count, Sum
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import HasRole, IsAdmin, IsProjectManager, IsStaff, IsStaffOrClientReadOnly
from common.scoping import scope_projects

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
    """List or create projects (clients: read-only, own projects only)."""
    permission_classes = [IsAuthenticated, IsStaffOrClientReadOnly]
    search_fields = ["name", "client__first_name", "client__last_name"]
    ordering_fields = ["created_at", "deadline", "budget"]
    filterset_fields = ["status"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProjectCreateSerializer
        return ProjectListSerializer

    def get_queryset(self):
        # Staff see all, clients only theirs, users without a role nothing
        qs = scope_projects(self.request.user, Project.objects.select_related("client", "status"))
        # Filter by team member
        member = self.request.query_params.get("team_member")
        if member:
            qs = qs.filter(team__user_id=member)
        # Filter by client
        client = self.request.query_params.get("client")
        if client:
            qs = qs.filter(client_id=client)
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
    """Retrieve, update or delete a project (clients: read-only, own projects only)."""
    permission_classes = [IsAuthenticated, IsStaffOrClientReadOnly]
    queryset = Project.objects.select_related(
        "client", "status", "service_type"
    ).all()
    serializer_class = ProjectDetailSerializer

    def get_queryset(self):
        return scope_projects(self.request.user, super().get_queryset())


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
    permission_classes = [IsAuthenticated, HasRole]
    queryset = ProjectStatus.objects.all().order_by("order")
    serializer_class = ProjectStatusSerializer


class ServiceTypeListView(generics.ListCreateAPIView):
    """List service types (any role) or create one (PM and above)."""
    permission_classes = [IsAuthenticated, HasRole]
    queryset = ServiceType.objects.all()
    serializer_class = ServiceTypeSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsProjectManager()]
        return super().get_permissions()


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


class ProjectTimesheetView(APIView):
    """Aggregated time report for a project (per user and per task).

    Also syncs the denormalized ``tracked_hours`` cache on the project so
    list/detail endpoints reflect the real time spent. Staff only: exposes
    rates, budgets and employee names.
    """

    permission_classes = [IsAuthenticated, IsStaff]

    def get(self, request, pk):
        from apps.tasks.models import TaskTimer

        project = get_object_or_404(Project, pk=pk)
        timers = TaskTimer.objects.filter(
            task__project=project, is_running=False
        ).select_related("user", "task")

        total_seconds = (
            timers.aggregate(total=Sum("duration_seconds"))["total"] or 0
        )
        tracked_hours = round(total_seconds / 3600, 2)

        if float(project.tracked_hours) != tracked_hours:
            Project.objects.filter(pk=project.id).update(
                tracked_hours=Decimal(str(tracked_hours))
            )

        by_user = (
            timers.values("user_id", "user__first_name", "user__last_name")
            .annotate(total_seconds=Sum("duration_seconds"))
            .order_by("-total_seconds")
        )
        by_task = (
            timers.values("task_id", "task__title")
            .annotate(total_seconds=Sum("duration_seconds"))
            .order_by("-total_seconds")
        )

        hours_budget = (
            float(project.hours_budget) if project.hours_budget is not None else None
        )
        cost_per_hour = (
            float(project.cost_per_hour) if project.cost_per_hour is not None else None
        )

        return Response(
            {
                "project_id": str(project.id),
                "project_name": project.name,
                "tracked_seconds": total_seconds,
                "tracked_hours": tracked_hours,
                "hours_budget": hours_budget,
                "cost_per_hour": cost_per_hour,
                "remaining_hours": (
                    round(hours_budget - tracked_hours, 2)
                    if hours_budget is not None
                    else None
                ),
                "budget_used_percent": (
                    round(tracked_hours / hours_budget * 100, 1)
                    if hours_budget
                    else None
                ),
                "cost_spent": (
                    round(tracked_hours * cost_per_hour, 2)
                    if cost_per_hour is not None
                    else None
                ),
                "by_user": [
                    {
                        "user_id": row["user_id"],
                        "user_name": f"{row['user__first_name']} {row['user__last_name']}".strip(),
                        "total_seconds": row["total_seconds"],
                        "total_hours": round(row["total_seconds"] / 3600, 2),
                    }
                    for row in by_user
                ],
                "by_task": [
                    {
                        "task_id": row["task_id"],
                        "task_title": row["task__title"],
                        "total_seconds": row["total_seconds"],
                        "total_hours": round(row["total_seconds"] / 3600, 2),
                    }
                    for row in by_task
                ],
            }
        )


class ProjectHealthList(APIView):
    """Explainable risk summary for the user's project set."""
    permission_classes = [IsAuthenticated, HasRole]

    def get(self, request):
        from .health import project_health
        qs = scope_projects(
            request.user,
            Project.objects.select_related("client", "status").prefetch_related(
                "tasks__status", "expenses"
            ),
        )
        return Response([{"id": str(p.pk), "name": p.name, "health": project_health(p)} for p in qs])


class ProjectHealthDetail(APIView):
    permission_classes = [IsAuthenticated, HasRole]

    def get(self, request, pk):
        from .health import project_health

        project = get_object_or_404(
            scope_projects(
                request.user, Project.objects.prefetch_related("tasks__status", "expenses")
            ),
            pk=pk,
        )
        return Response(project_health(project))
