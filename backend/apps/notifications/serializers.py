from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "title",
            "message",
            "related_project_id",
            "related_task_id",
            "read",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class MarkAllReadSerializer(serializers.Serializer):
    """Empty serializer for mark-all-read action."""
    pass
