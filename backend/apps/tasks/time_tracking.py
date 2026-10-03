from decimal import Decimal
from django.db.models import Sum
from apps.projects.models import Project
from .models import Task, TaskTimer


def recalculate_task_time(task):
    """Call inside a transaction. Serialize totals across employees on a project."""
    if task.project_id:
        Project.objects.select_for_update().get(pk=task.project_id)
    Task.objects.select_for_update().get(pk=task.pk)
    total = (
        TaskTimer.objects.filter(task_id=task.pk, is_running=False).aggregate(
            total=Sum("duration_seconds")
        )["total"]
        or 0
    )
    Task.objects.filter(pk=task.pk).update(actual_hours=round(Decimal(total) / 3600, 1))
    if task.project_id:
        total = (
            TaskTimer.objects.filter(task__project_id=task.project_id, is_running=False).aggregate(
                total=Sum("duration_seconds")
            )["total"]
            or 0
        )
        Project.objects.filter(pk=task.project_id).update(
            tracked_hours=round(Decimal(total) / 3600, 2)
        )
