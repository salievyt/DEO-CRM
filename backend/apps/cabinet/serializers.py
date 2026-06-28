from rest_framework import serializers

from .models import ClientFeedback, ProjectMilestone, ProjectShareLink


class ClientDashboardSerializer(serializers.Serializer):
    """Dashboard data for client cabinet."""
    active_projects = serializers.IntegerField()
    total_documents = serializers.IntegerField()
    open_invoices = serializers.IntegerField()
    unread_messages = serializers.IntegerField()
    pending_approvals = serializers.IntegerField(default=0)


class ClientProjectProgressSerializer(serializers.Serializer):
    """Project progress for client."""
    id = serializers.UUIDField()
    name = serializers.CharField()
    status_name = serializers.CharField()
    status_color = serializers.CharField()
    progress = serializers.IntegerField()
    deadline = serializers.DateField()
    milestones = serializers.DictField(required=False)


class ProjectMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMilestone
        fields = [
            "id", "project", "name", "description", "status",
            "order", "due_date", "completed_date",
            "approved_by", "approved_at", "rejection_reason",
            "deliverable_url", "created_at",
        ]
        read_only_fields = [
            "id", "approved_by", "approved_at", "created_at",
        ]


class ClientFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientFeedback
        fields = [
            "id", "project", "milestone", "client",
            "feedback_type", "content", "rating",
            "attachment_url", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ProjectShareLinkSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ProjectShareLink
        fields = ["id", "project", "token", "url", "is_active", "expires_at", "created_at"]
        read_only_fields = ["id", "token", "created_at"]

    def get_url(self, obj):
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(f"/cabinet/shared/{obj.token}")
        return f"/cabinet/shared/{obj.token}"
