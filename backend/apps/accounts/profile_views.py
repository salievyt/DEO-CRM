from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsAdmin, IsProjectManager

from .profile_models import EmployeeCertificate, EmployeeProfile
from .profile_serializers import (
    EmployeeCertificateSerializer,
    EmployeeProfileSerializer,
)

User = get_user_model()


class EmployeeProfileDetailView(generics.RetrieveUpdateAPIView):
    """Get/update full employee profile (user + profile + teams + certs)."""

    queryset = EmployeeProfile.objects.select_related("user__role").prefetch_related(
        "certificates", "user__team_memberships__team"
    ).all()
    serializer_class = EmployeeProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectManager]
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        user_id = self.kwargs.get("user_id")
        try:
            obj, created = EmployeeProfile.objects.get_or_create(
                user_id=user_id,
                defaults={"user": User.objects.get(id=user_id)},
            )
            if created:
                # Re-fetch with related data
                return EmployeeProfile.objects.select_related(
                    "user__role"
                ).prefetch_related(
                    "certificates", "user__team_memberships__team"
                ).get(id=obj.id)
            return obj
        except User.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Пользователь не найден")


class EmployeeCertificateCreateView(generics.CreateAPIView):
    """Upload a certificate for an employee."""

    queryset = EmployeeCertificate.objects.all()
    serializer_class = EmployeeCertificateSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectManager]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        user_id = self.kwargs.get("user_id")
        profile, _ = EmployeeProfile.objects.get_or_create(
            user_id=user_id,
            defaults={"user": User.objects.get(id=user_id)},
        )
        serializer.save(profile=profile)


class EmployeeCertificateDeleteView(generics.DestroyAPIView):
    """Delete a certificate."""

    queryset = EmployeeCertificate.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsProjectManager]

    def get_object(self):
        return EmployeeCertificate.objects.get(
            id=self.kwargs.get("pk"),
            profile__user_id=self.kwargs.get("user_id"),
        )


class EmployeeStatsView(APIView):
    """Aggregated stats for an employee (task counts, project count, etc.)."""

    permission_classes = [permissions.IsAuthenticated, IsProjectManager]

    def get(self, request, user_id):
        from django.utils import timezone

        from apps.projects.models import ProjectTeamMember
        from apps.tasks.models import Task

        total_tasks = Task.objects.filter(assignee_id=user_id).count()
        done_tasks = Task.objects.filter(
            assignee_id=user_id, status__name="Done"
        ).count()
        overdue_tasks = Task.objects.filter(
            assignee_id=user_id,
            deadline__lt=timezone.now().date(),
        ).exclude(status__name="Done").count()
        active_projects = ProjectTeamMember.objects.filter(
            user_id=user_id
        ).values("project").distinct().count()

        return Response({
            "total_tasks": total_tasks,
            "done_tasks": done_tasks,
            "overdue_tasks": overdue_tasks,
            "active_projects": active_projects,
        })
