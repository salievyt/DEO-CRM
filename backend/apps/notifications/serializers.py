from rest_framework import serializers

from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    urgency_display = serializers.CharField(
        source="get_urgency_display", read_only=True
    )
    type_display = serializers.CharField(
        source="get_type_display", read_only=True
    )

    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "type_display",
            "urgency",
            "urgency_display",
            "title",
            "message",
            "related_project_id",
            "related_task_id",
            "read",
            "archived",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class MarkAllReadSerializer(serializers.Serializer):
    """Empty serializer for mark-all-read action."""
    pass


class ArchiveNotificationsSerializer(serializers.Serializer):
    """Serializer for archive action."""
    archive_read = serializers.BooleanField(default=False)
    archive_unread = serializers.BooleanField(default=False)
    days_older_than = serializers.IntegerField(default=0, min_value=0)


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            "task_assigned",
            "comment_added",
            "project_updated",
            "deadline_reminder",
            "message_received",
            "quiet_hours_enabled",
            "quiet_hours_start",
            "quiet_hours_end",
            "digest_enabled",
            "digest_frequency",
            "auto_archive_read_days",
            "auto_archive_unread_days",
        ]
