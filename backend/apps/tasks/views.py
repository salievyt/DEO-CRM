import uuid
from datetime import datetime, timedelta

from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import generics, status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.permissions import IsAdmin, IsProjectManager

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
from . import models as task_models


class TaskListCreateView(generics.ListCreateAPIView):
    """List or create tasks."""
    permission_classes = [IsAuthenticated]
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
        if project:
            qs = qs.filter(project_id=project)
        if assignee:
            qs = qs.filter(assignee_id=assignee)
        # Client sees only their project tasks
        if self.request.user.role == "client":
            qs = qs.filter(project__client__user=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a task."""
    permission_classes = [IsAuthenticated]
    queryset = Task.objects.select_related(
        "project", "assignee", "status", "priority"
    ).all()
    serializer_class = TaskDetailSerializer


class TaskChangeStatusView(views.APIView):
    """Change task status."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            task = Task.objects.get(pk=pk)
            new_status = TaskStatus.objects.get(pk=request.data["status_id"])
        except (Task.DoesNotExist, TaskStatus.DoesNotExist):
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
    """List or add comments to a task."""
    permission_classes = [IsAuthenticated]
    serializer_class = TaskCommentSerializer

    def get_queryset(self):
        return TaskComment.objects.filter(
            task_id=self.kwargs["task_pk"]
        ).select_related("user").order_by("created_at")

    def perform_create(self, serializer):
        serializer.save(
            task_id=self.kwargs["task_pk"],
            user=self.request.user,
        )


class TaskTimerStartView(views.APIView):
    """Start timer for a task."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
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
    """Stop running timer for a task."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
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

        # Update task actual hours
        task = timer.task
        total = TaskTimer.objects.filter(task=task).aggregate(
            total=Sum("duration_seconds")
        )["total"] or 0
        task.actual_hours = round(total / 3600, 1)
        task.save()

        return Response(TaskTimerSerializer(timer).data)


class TaskKanbanView(views.APIView):
    """Get tasks grouped by status for Kanban."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        statuses = TaskStatus.objects.all().order_by("order")
        columns = []
        for status in statuses:
            tasks = Task.objects.filter(
                status=status
            ).select_related("assignee", "priority")
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
