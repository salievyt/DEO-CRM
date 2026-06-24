from rest_framework import serializers

from .models import Project, ProjectHistory, ProjectStatus, ProjectTeamMember, ServiceType


class ProjectStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectStatus
        fields = ["id", "name", "order", "color"]


class ServiceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceType
        fields = ["id", "name", "description"]


class ProjectTeamMemberSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = ProjectTeamMember
        fields = [
            "id", "user", "user_name", "user_email",
            "role_in_project", "assigned_at",
        ]


class ProjectListSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    status_name = serializers.CharField(source="status.name", read_only=True)
    status_color = serializers.CharField(source="status.color", read_only=True)

    class Meta:
        model = Project
        fields = [
            "id", "name", "client_name", "budget", "deadline",
            "status_name", "status_color", "progress", "created_at",
        ]


class ProjectDetailSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    status_name = serializers.CharField(source="status.name", read_only=True)
    status_color = serializers.CharField(source="status.color", read_only=True)
    team_count = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id", "name", "client", "client_name", "service_type",
            "budget", "cost", "deadline", "status", "status_name",
            "status_color", "progress", "description",
            "team_count", "task_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_team_count(self, obj):
        return obj.team.count()

    def get_task_count(self, obj):
        return obj.tasks.count()


class ProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            "name", "client", "service_type", "budget", "cost",
            "deadline", "status", "progress", "description",
        ]
