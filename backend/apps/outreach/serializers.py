from rest_framework import serializers
from .models import CallAttempt, Contact


class AttemptSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    recording_parts = serializers.IntegerField(source="recording.parts", read_only=True, default=0)
    recording_name = serializers.CharField(source="recording.name", read_only=True, default="")

    def get_employee_name(self, obj):
        return (obj.employee.get_full_name() or obj.employee.email) if obj.employee else "—"

    class Meta:
        model = CallAttempt
        fields = [
            "id",
            "employee_name",
            "outcome",
            "notes",
            "recording",
            "recording_parts",
            "recording_name",
            "next_call_at",
            "created_at",
        ]


class ContactSerializer(serializers.ModelSerializer):
    assigned_name = serializers.SerializerMethodField()
    calls = AttemptSerializer(many=True, read_only=True)

    def get_assigned_name(self, obj):
        return (
            (obj.assigned_to.get_full_name() or obj.assigned_to.email)
            if obj.assigned_to
            else "Не назначен"
        )

    class Meta:
        model = Contact
        fields = [
            "id",
            "company",
            "phone",
            "industry",
            "offer",
            "usp",
            "script",
            "objections",
            "assigned_to",
            "assigned_name",
            "status",
            "next_call_at",
            "missed_attempts",
            "lead",
            "calls",
        ]


class OutcomeSerializer(serializers.Serializer):
    outcome = serializers.ChoiceField(
        choices=["no_answer", "callback", "rejected", "wrong_number", "interested"]
    )
    notes = serializers.CharField(required=False, allow_blank=True, max_length=10000, default="")
    next_call_at = serializers.DateTimeField(required=False, allow_null=True)
    recording = serializers.UUIDField(required=False, allow_null=True)
    request_id = serializers.UUIDField()
