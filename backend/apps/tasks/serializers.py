from django.db.models import Sum
from rest_framework import serializers

from .models import (
    Task, TaskAttachment, TaskComment, TaskHistory, TaskPriority, TaskStatus, TaskTimer
)


class TaskStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskStatus
        fields = ["id", "name", "order", "color"]


class TaskPrioritySerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskPriority
        fields = ["id", "name", "level", "color"]


class TaskCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_avatar = serializers.ImageField(source="user.avatar", read_only=True)

    class Meta:
        model = TaskComment
        fields = [
            "id", "user", "user_name", "user_avatar", "content",
            "parent_comment", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]


class TaskTimerSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = TaskTimer
        fields = [
            "id", "user", "user_name", "start_time", "end_time",
            "duration_seconds", "is_running", "note",
        ]
        read_only_fields = ["id", "duration_seconds", "is_running"]


class TaskListSerializer(serializers.ModelSerializer):
    project_name = serializers.SerializerMethodField()
    assignee_name = serializers.CharField(
        source="assignee.get_full_name", read_only=True
    )
    status_name = serializers.CharField(source="status.name", read_only=True)
    status_color = serializers.CharField(source="status.color", read_only=True)
    priority_name = serializers.CharField(source="priority.name", read_only=True)
    priority_color = serializers.CharField(source="priority.color", read_only=True)
    subtask_count = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id", "title", "project_name", "assignee_name",
            "status_name", "status_color", "priority_name", "priority_color",
            "deadline", "estimated_hours", "subtask_count", "created_at",
        ]

    def get_subtask_count(self, obj):
        return obj.subtasks.count()

    def get_project_name(self, obj):
        return obj.project.name if obj.project else None


class TaskDetailSerializer(serializers.ModelSerializer):
    project_name = serializers.SerializerMethodField()
    assignee_name = serializers.CharField(
        source="assignee.get_full_name", read_only=True
    )
    status_name = serializers.CharField(source="status.name", read_only=True)
    status_color = serializers.CharField(source="status.color", read_only=True)
    priority_name = serializers.CharField(source="priority.name", read_only=True)
    comment_count = serializers.SerializerMethodField()
    timer_total = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id", "parent_task", "project", "project_name",
            "title", "description", "assignee", "assignee_name",
            "reviewer", "status", "status_name", "status_color",
            "priority", "priority_name", "deadline",
            "estimated_hours", "actual_hours",
            "comment_count", "timer_total",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "actual_hours", "created_at", "updated_at"]

    def get_comment_count(self, obj):
        return obj.comments.count()

    def get_timer_total(self, obj):
        result = obj.timers.aggregate(
            total=Sum("duration_seconds")
        )
        return result["total"] or 0

    def get_project_name(self, obj):
        return obj.project.name if obj.project else None


class TaskCreateSerializer(serializers.ModelSerializer):
    # Optional on create: falls back to the first status by order.
    status = serializers.PrimaryKeyRelatedField(
        queryset=TaskStatus.objects.all(), required=False, allow_null=True
    )
    # Optional on create: falls back to the default ("Средний") priority.
    priority = serializers.PrimaryKeyRelatedField(
        queryset=TaskPriority.objects.all(), required=False, allow_null=True
    )

    # Nullable fields that clients may send as empty strings (e.g. an unset
    # date input); treat them as "not provided" instead of failing validation.
    EMPTY_AS_NULL_FIELDS = (
        "parent_task", "project", "assignee", "reviewer",
        "status", "priority", "deadline", "estimated_hours",
    )

    class Meta:
        model = Task
        fields = [
            "parent_task", "project", "title", "description",
            "assignee", "reviewer", "status", "priority",
            "deadline", "estimated_hours",
        ]

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = {
                key: (None if key in self.EMPTY_AS_NULL_FIELDS and value == "" else value)
                for key, value in data.items()
            }
        return super().to_internal_value(data)

    def validate(self, attrs):
        if not attrs.get("status"):
            default_status = TaskStatus.objects.order_by("order", "pk").first()
            if default_status is None:
                raise serializers.ValidationError(
                    {"status": "Не настроены статусы задач"}
                )
            attrs["status"] = default_status
        if not attrs.get("priority"):
            attrs["priority"] = (
                TaskPriority.objects.filter(name="Средний").first()
                or TaskPriority.objects.order_by("level", "pk").first()
            )
        return attrs
