from rest_framework import serializers

from .models import (
    Checklist,
    ChecklistItem,
    MenteeChecklistItemProgress,
    MenteeChecklistProgress,
    MenteeEvaluation,
    MenteeTask,
    MentorshipPair,
)


class ChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistItem
        fields = "__all__"


class ChecklistSerializer(serializers.ModelSerializer):
    items = ChecklistItemSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Checklist
        fields = "__all__"

    def get_item_count(self, obj):
        return obj.items.count()


class MentorshipPairSerializer(serializers.ModelSerializer):
    mentor_name = serializers.SerializerMethodField()
    mentee_name = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()
    completed_task_count = serializers.SerializerMethodField()

    class Meta:
        model = MentorshipPair
        fields = "__all__"

    def get_mentor_name(self, obj):
        return obj.mentor.get_full_name() or obj.mentor.email

    def get_mentee_name(self, obj):
        return obj.mentee.get_full_name() or obj.mentee.email

    def get_progress_percent(self, obj):
        progresses = obj.checklist_progress.all()
        if not progresses:
            return 0
        return sum(p.progress_percent for p in progresses) // len(progresses)

    def get_task_count(self, obj):
        return obj.tasks.count()

    def get_completed_task_count(self, obj):
        return obj.tasks.filter(status="done").count()


class MenteeTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenteeTask
        fields = "__all__"


class MenteeChecklistProgressSerializer(serializers.ModelSerializer):
    checklist_title = serializers.SerializerMethodField()
    checklist_description = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()
    total_items = serializers.SerializerMethodField()
    completed_items = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = MenteeChecklistProgress
        fields = "__all__"

    def get_checklist_title(self, obj):
        return obj.checklist.title

    def get_checklist_description(self, obj):
        return obj.checklist.description

    def get_total_items(self, obj):
        return obj.total_items

    def get_completed_items(self, obj):
        return obj.completed_items

    def get_progress_percent(self, obj):
        return obj.progress_percent

    def get_items(self, obj):
        items_data = []
        for item_progress in obj.items.select_related("item").order_by("item__order"):
            items_data.append({
                "id": item_progress.id,
                "item_id": item_progress.item_id,
                "title": item_progress.item.title,
                "description": item_progress.item.description,
                "is_required": item_progress.item.is_required,
                "completed": item_progress.completed,
                "completed_at": item_progress.completed_at,
                "notes": item_progress.notes,
            })
        return items_data


class MenteeEvaluationSerializer(serializers.ModelSerializer):
    evaluator_name = serializers.SerializerMethodField()

    class Meta:
        model = MenteeEvaluation
        fields = "__all__"
        read_only_fields = ["evaluated_by"]

    def get_evaluator_name(self, obj):
        return obj.evaluated_by.get_full_name() or obj.evaluated_by.email


class MentorshipDashboardSerializer(serializers.Serializer):
    total_pairs = serializers.IntegerField()
    active_pairs = serializers.IntegerField()
    completed_pairs = serializers.IntegerField()
    pending_review_tasks = serializers.IntegerField()
    avg_rating = serializers.FloatField()
