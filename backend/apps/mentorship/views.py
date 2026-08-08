from django.db.models import Avg, Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from common.permissions import IsProjectManager

from .models import (
    Checklist,
    MenteeChecklistItemProgress,
    MenteeChecklistProgress,
    MenteeEvaluation,
    MenteeTask,
    MentorshipPair,
)
from .serializers import (
    ChecklistSerializer,
    MenteeChecklistProgressSerializer,
    MenteeEvaluationSerializer,
    MenteeTaskSerializer,
    MentorshipDashboardSerializer,
    MentorshipPairSerializer,
)


class MentorshipPairViewSet(viewsets.ModelViewSet):
    queryset = MentorshipPair.objects.select_related("mentor", "mentee").all()
    serializer_class = MentorshipPairSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectManager]
    search_fields = ["mentor__email", "mentee__email", "mentor__first_name", "mentee__first_name"]
    ordering_fields = ["created_at", "started_at", "status"]

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        qs = self.get_queryset()
        total = qs.count()
        active = qs.filter(status=MentorshipPair.StatusChoices.ACTIVE).count()
        completed = qs.filter(status=MentorshipPair.StatusChoices.COMPLETED).count()
        pending_review = MenteeTask.objects.filter(
            pair__in=qs, status=MenteeTask.StatusChoices.REVIEW
        ).count()
        avg_rating = MenteeEvaluation.objects.filter(
            pair__in=qs
        ).aggregate(avg=Avg("rating"))["avg"] or 0

        data = MentorshipDashboardSerializer({
            "total_pairs": total,
            "active_pairs": active,
            "completed_pairs": completed,
            "pending_review_tasks": pending_review,
            "avg_rating": round(avg_rating, 1),
        }).data
        return Response(data)

    @action(detail=True, methods=["post"])
    def assign_checklist(self, request, pk=None):
        pair = self.get_object()
        checklist_id = request.data.get("checklist_id")
        if not checklist_id:
            return Response({"error": "checklist_id required"}, status=400)

        try:
            checklist = Checklist.objects.get(id=checklist_id)
        except Checklist.DoesNotExist:
            return Response({"error": "Checklist not found"}, status=404)

        progress, created = MenteeChecklistProgress.objects.get_or_create(
            pair=pair, checklist=checklist
        )

        if created:
            # Create progress entries for each checklist item
            for item in checklist.items.all():
                MenteeChecklistItemProgress.objects.create(
                    progress=progress, item=item
                )

        serializer = MenteeChecklistProgressSerializer(progress)
        return Response(serializer.data, status=201 if created else 200)


class MenteeTaskViewSet(viewsets.ModelViewSet):
    queryset = MenteeTask.objects.select_related("pair__mentor", "pair__mentee").all()
    serializer_class = MenteeTaskSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectManager]
    search_fields = ["title", "description"]
    ordering_fields = ["order", "created_at", "deadline", "status"]

    def get_queryset(self):
        qs = super().get_queryset()
        pair_id = self.request.query_params.get("pair")
        status_filter = self.request.query_params.get("status")
        if pair_id:
            qs = qs.filter(pair_id=pair_id)
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class MenteeChecklistProgressViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MenteeChecklistProgress.objects.select_related(
        "pair", "checklist"
    ).prefetch_related("items__item")
    serializer_class = MenteeChecklistProgressSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectManager]

    def get_queryset(self):
        qs = super().get_queryset()
        pair_id = self.request.query_params.get("pair")
        if pair_id:
            qs = qs.filter(pair_id=pair_id)
        return qs

    @action(detail=True, methods=["post"])
    def complete_item(self, request, pk=None):
        progress = self.get_object()
        item_progress_id = request.data.get("item_progress_id")
        if not item_progress_id:
            return Response({"error": "item_progress_id required"}, status=400)

        try:
            item_progress = progress.items.get(id=item_progress_id)
        except MenteeChecklistItemProgress.DoesNotExist:
            return Response({"error": "Item progress not found"}, status=404)

        item_progress.completed = True
        item_progress.completed_at = request.data.get("completed_at")
        item_progress.notes = request.data.get("notes", "")
        item_progress.save()

        serializer = self.get_serializer(progress)
        return Response(serializer.data)


class MenteeEvaluationViewSet(viewsets.ModelViewSet):
    queryset = MenteeEvaluation.objects.select_related("pair", "evaluated_by").all()
    serializer_class = MenteeEvaluationSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectManager]
    ordering_fields = ["created_at", "rating"]

    def get_queryset(self):
        qs = super().get_queryset()
        pair_id = self.request.query_params.get("pair")
        if pair_id:
            qs = qs.filter(pair_id=pair_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(evaluated_by=self.request.user)


class ChecklistViewSet(viewsets.ModelViewSet):
    queryset = Checklist.objects.prefetch_related("items").all()
    serializer_class = ChecklistSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectManager]
    search_fields = ["title", "description"]
    ordering_fields = ["title", "created_at"]
