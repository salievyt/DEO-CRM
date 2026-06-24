from rest_framework import serializers

from .models import Lead, LeadFile, LeadHistory, LeadStage


class LeadStageSerializer(serializers.ModelSerializer):
    lead_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = LeadStage
        fields = ["id", "name", "order", "probability", "color", "lead_count"]


class LeadFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadFile
        fields = ["id", "file_url", "file_name", "created_at"]
        read_only_fields = ["id", "created_at"]


class LeadHistorySerializer(serializers.ModelSerializer):
    from_stage_name = serializers.CharField(source="from_stage.name", read_only=True)
    to_stage_name = serializers.CharField(source="to_stage.name", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = LeadHistory
        fields = [
            "id", "from_stage", "from_stage_name", "to_stage", "to_stage_name",
            "user", "user_name", "notes", "created_at",
        ]


class LeadListSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(
        source="assigned_to.get_full_name", read_only=True
    )
    stage_name = serializers.CharField(source="current_stage.name", read_only=True)
    stage_color = serializers.CharField(source="current_stage.color", read_only=True)

    class Meta:
        model = Lead
        fields = [
            "id", "contact_name", "company_name", "phone", "email",
            "source", "budget", "stage_name", "stage_color",
            "assigned_to_name", "is_active", "created_at",
        ]


class LeadDetailSerializer(serializers.ModelSerializer):
    stage_name = serializers.CharField(source="current_stage.name", read_only=True)
    assigned_to_name = serializers.CharField(
        source="assigned_to.get_full_name", read_only=True
    )
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )

    class Meta:
        model = Lead
        fields = [
            "id", "client", "contact_name", "company_name", "phone",
            "email", "telegram", "source", "budget", "current_stage",
            "stage_name", "assigned_to", "assigned_to_name",
            "created_by", "created_by_name", "notes", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class LeadCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = [
            "client", "contact_name", "company_name", "phone", "email",
            "telegram", "source", "budget", "current_stage",
            "assigned_to", "notes",
        ]


class LeadMoveSerializer(serializers.Serializer):
    stage_id = serializers.UUIDField()
    notes = serializers.CharField(required=False, allow_blank=True)
