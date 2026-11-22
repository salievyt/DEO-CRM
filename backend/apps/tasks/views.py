import uuid
from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status, views
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.permissions import HasRole, IsProjectManager, IsStaff, IsStaffOrClientReadOnly
from common.scoping import scope_tasks

from . import models as task_models
from .models import Task, TaskComment, TaskPriority, TaskStatus, TaskTimer
from .serializers import (
    TaskCommentSerializer,
    TaskCreateSerializer,
    TaskDetailSerializer,
    TaskListSerializer,
    TaskPrioritySerializer,
    TaskStatusSerializer,
    TaskTimerSerializer,
)


class TaskListCreateView(generics.ListCreateAPIView):
    """List or create tasks (clients: read-only, own projects only)."""
    permission_classes = [IsAuthenticated, IsStaffOrClientReadOnly]
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "deadline", "priority__level"]
    filterset_fields = ["status", "priority"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return TaskCreateSerializer
        return TaskListSerializer

    def get_queryset(self):
        qs = Task.objects.select_related(
            "project", "assignee", "status", "priority"
        ).all()
        project = self.request.query_params.get("project")
        assignee = self.request.query_params.get("assignee")
        client = self.request.query_params.get("client")
        if project:
            qs = qs.filter(project_id=project)
        if assignee:
            qs = qs.filter(assignee_id=assignee)
        if client:
            qs = qs.filter(project__client_id=client)
        return scope_tasks(self.request.user, qs)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a task (clients: read-only, own projects only)."""
    permission_classes = [IsAuthenticated, IsStaffOrClientReadOnly]
    queryset = Task.objects.select_related(
        "project", "assignee", "status", "priority"
    ).all()
    serializer_class = TaskDetailSerializer

    def get_queryset(self):
        return scope_tasks(self.request.user, super().get_queryset())


class TaskChangeStatusView(views.APIView):
    """Change task status (staff only; the client cabinet does not use it)."""
    permission_classes = [IsAuthenticated, IsStaff]

    def post(self, request, pk):
        task = get_object_or_404(scope_tasks(request.user), pk=pk)
        status_id = request.data.get("status_id") if hasattr(request.data, "get") else None
        # Web sends the id as a string, the mobile app as an integer.
        if isinstance(status_id, bool) or not isinstance(status_id, (str, int)) or status_id == "":
            return Response({"error": "Укажите status_id"}, status=400)
        try:
            new_status = TaskStatus.objects.get(pk=status_id)
        except (TaskStatus.DoesNotExist, ValidationError, ValueError):
            return Response({"error": "Задача или статус не найдены"}, status=404)

        old_status = task.status
        task.status = new_status
        task.save()

        task_models.TaskHistory.objects.create(
            task=task,
            user=request.user,
            field_changed="status",
            old_value=old_status.name,
            new_value=new_status.name,
        )
        return Response(TaskDetailSerializer(task).data)


class TaskAssignView(views.APIView):
    """Assign task to user."""
    permission_classes = [IsAuthenticated, IsProjectManager]

    def post(self, request, pk):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            task = Task.objects.get(pk=pk)
            user = User.objects.get(pk=request.data["user_id"])
        except (Task.DoesNotExist, User.DoesNotExist):
            return Response({"error": "Задача или пользователь не найдены"}, status=404)

        task.assignee = user
        task.save()

        task_models.TaskHistory.objects.create(
            task=task,
            user=request.user,
            field_changed="assignee",
            old_value=str(task.assignee) if task.assignee else "",
            new_value=user.get_full_name(),
        )
        return Response(TaskDetailSerializer(task).data)


class TaskCommentListView(generics.ListCreateAPIView):
    """List or add comments to a task visible to the user (clients: own tasks)."""
    permission_classes = [IsAuthenticated, HasRole]
    serializer_class = TaskCommentSerializer

    def get_task(self):
        if not hasattr(self, "_task"):
            self._task = get_object_or_404(
                scope_tasks(self.request.user), pk=self.kwargs["task_pk"]
            )
        return self._task

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return TaskComment.objects.none()
        return (
            TaskComment.objects.filter(task=self.get_task())
            .select_related("user")
            .order_by("created_at")
        )

    def perform_create(self, serializer):
        task = self.get_task()
        parent = serializer.validated_data.get("parent_comment")
        if parent is not None and parent.task_id != task.pk:
            raise DRFValidationError({"parent_comment": "Комментарий относится к другой задаче."})
        serializer.save(task=task, user=self.request.user)


class TaskTimerStartView(views.APIView):
    """Start timer for a task (staff only)."""
    permission_classes = [IsAuthenticated, IsStaff]

    @transaction.atomic
    def post(self, request, pk):
        get_user_model().objects.select_for_update().get(pk=request.user.pk)
        from .focus.views import active, snapshot
        if snapshot(active(request.user)) or TaskTimer.objects.filter(user=request.user, is_running=True).exists():
            return Response({"detail": "У вас уже есть активный таймер или фокус-сессия."}, status=409)
        try:
            task = Task.objects.get(pk=pk)
        except Task.DoesNotExist:
            return Response({"error": "Задача не найдена"}, status=404)

        timer = TaskTimer.objects.create(
            task=task,
            user=request.user,
            start_time=timezone.now(),
            is_running=True,
        )
        return Response(TaskTimerSerializer(timer).data)


class TaskTimerStopView(views.APIView):
    """Stop running timer for a task (staff only)."""
    permission_classes = [IsAuthenticated, IsStaff]

    @transaction.atomic
    def post(self, request, pk):
        get_user_model().objects.select_for_update().get(pk=request.user.pk)
        timer = TaskTimer.objects.filter(
            task_id=pk, user=request.user, is_running=True
        ).first()
        if not timer:
            return Response({"error": "Нет активного таймера"}, status=404)

        now = timezone.now()
        duration = int((now - timer.start_time).total_seconds())
        timer.end_time = now
        timer.duration_seconds = duration
        timer.is_running = False
        timer.save()

        from .time_tracking import recalculate_task_time
        recalculate_task_time(timer.task)

        return Response(TaskTimerSerializer(timer).data)


class TaskKanbanView(views.APIView):
    """Get tasks grouped by status for Kanban (clients: own projects only)."""
    permission_classes = [IsAuthenticated, HasRole]

    def get(self, request):
        statuses = TaskStatus.objects.all().order_by("order")
        visible = scope_tasks(request.user)
        columns = []
        for status in statuses:
            tasks = visible.filter(status=status).select_related("assignee", "priority")
            project = request.query_params.get("project")
            if project:
                tasks = tasks.filter(project_id=project)
            columns.append({
                "id": str(status.id),
                "title": status.name,
                "color": status.color,
                "tasks": TaskListSerializer(tasks, many=True).data,
            })
        return Response(columns)


class MyTasksView(generics.ListAPIView):
    """Get tasks assigned to current user."""
    permission_classes = [IsAuthenticated]
    serializer_class = TaskListSerializer

    def get_queryset(self):
        return Task.objects.filter(
            assignee=self.request.user
        ).select_related(
            "project", "status", "priority"
        ).order_by("-priority__level", "deadline")


class UpcomingTasksView(generics.ListAPIView):
    """Get tasks with upcoming deadlines."""
    permission_classes = [IsAuthenticated]
    serializer_class = TaskListSerializer

    def get_queryset(self):
        in_three_days = timezone.now().date() + timedelta(days=3)
        return Task.objects.filter(
            assignee=self.request.user,
            deadline__lte=in_three_days,
            deadline__gte=timezone.now().date(),
        ).exclude(
            status__name__in=["Выполнена", "Отклонена"]
        ).select_related("project", "status", "priority").order_by("deadline")


class TaskStatusListView(generics.ListAPIView):
    """List all task statuses."""
    permission_classes = [IsAuthenticated]
    queryset = TaskStatus.objects.all().order_by("order")
    serializer_class = TaskStatusSerializer


class TaskPriorityListView(generics.ListAPIView):
    """List all task priorities."""
    permission_classes = [IsAuthenticated]
    queryset = TaskPriority.objects.all().order_by("level")
    serializer_class = TaskPrioritySerializer
