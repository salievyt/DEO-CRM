from django.contrib import admin

from .models import (
    Task, TaskAttachment, TaskComment, TaskHistory, TaskPriority, TaskStatus, TaskTimer
)


class TaskCommentInline(admin.TabularInline):
    model = TaskComment
    extra = 0


class TaskAttachmentInline(admin.TabularInline):
    model = TaskAttachment
    extra = 0


class TaskHistoryInline(admin.TabularInline):
    model = TaskHistory
    extra = 0
    readonly_fields = ["created_at"]


class TaskTimerInline(admin.TabularInline):
    model = TaskTimer
    extra = 0
    readonly_fields = ["start_time", "end_time", "duration_seconds"]


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = [
        "title", "project", "assignee", "status", "priority",
        "deadline", "estimated_hours", "created_at"
    ]
    list_filter = ["status", "priority"]
    search_fields = ["title", "description"]
    inlines = [TaskCommentInline, TaskAttachmentInline, TaskHistoryInline, TaskTimerInline]
    date_hierarchy = "created_at"


@admin.register(TaskStatus)
class TaskStatusAdmin(admin.ModelAdmin):
    list_display = ["name", "order", "color"]
    list_editable = ["order"]


@admin.register(TaskPriority)
class TaskPriorityAdmin(admin.ModelAdmin):
    list_display = ["name", "level", "color"]
    list_editable = ["level"]
