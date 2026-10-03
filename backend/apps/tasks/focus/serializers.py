from rest_framework import serializers
from .models import FocusNote, FocusProfile, FocusSession

THEMES = ["lavender", "midnight", "ocean", "forest", "sunset"]
SOUNDS = ["none", "rain", "ocean", "forest"]
PETS = ["bee", "fox", "cat"]


class FocusProfileSerializer(serializers.ModelSerializer):
    work_minutes = serializers.IntegerField(min_value=1, max_value=180, required=False)
    short_break_minutes = serializers.IntegerField(min_value=1, max_value=60, required=False)
    long_break_minutes = serializers.IntegerField(min_value=1, max_value=120, required=False)
    cycles = serializers.IntegerField(min_value=2, max_value=12, required=False)
    daily_goal = serializers.IntegerField(min_value=1, max_value=24, required=False)
    timer_style = serializers.ChoiceField(choices=["digital", "ring", "flip"], required=False)
    theme = serializers.ChoiceField(choices=THEMES, required=False)
    sound = serializers.ChoiceField(choices=SOUNDS, required=False)
    pet = serializers.ChoiceField(choices=PETS, required=False)

    class Meta:
        model = FocusProfile
        exclude = ["id", "user"]
        read_only_fields = ["coins", "inventory", "updated_at"]


class FocusSessionSerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(source="task.title", read_only=True, default="")

    class Meta:
        model = FocusSession
        exclude = ["user", "timer"]
        read_only_fields = [
            "id",
            "task_title",
            "status",
            "elapsed_seconds",
            "started_at",
            "resumed_at",
            "ends_at",
            "finished_at",
        ]


class FocusStartSerializer(serializers.Serializer):
    task = serializers.UUIDField(required=False, allow_null=True)
    phase = serializers.ChoiceField(choices=["work", "short_break", "long_break"], default="work")
    goal = serializers.CharField(max_length=300, required=False, allow_blank=True)
    duration_minutes = serializers.IntegerField(min_value=1, max_value=180, required=False)


class FocusNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = FocusNote
        exclude = ["user"]
        read_only_fields = ["id", "created_at", "updated_at"]
