from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.messaging.permissions import IsInboxStaff

from .models import Scenario, ScenarioTrigger, TriggerStatus
from .serializers import (
    ScenarioSerializer,
    ScenarioStatsSerializer,
    ScenarioTestSerializer,
    ScenarioTriggerSerializer,
    list_scenario_templates,
)
from .services import match_keywords


class ScenarioListCreateView(generics.ListCreateAPIView):
    """GET — scenarios (with stats); POST — create a new scenario."""

    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]
    serializer_class = ScenarioSerializer

    def get_queryset(self):
        qs = Scenario.objects.all().select_related("created_by")
        status_filter = self.request.query_params.get("status")
        if status_filter == "active":
            qs = qs.filter(is_active=True)
        elif status_filter == "inactive":
            qs = qs.filter(is_active=False)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ScenarioDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET / PATCH / DELETE a single scenario."""

    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]
    serializer_class = ScenarioSerializer
    queryset = Scenario.objects.all().select_related("created_by")


class ScenarioTemplateListView(APIView):
    """Preset scenario templates for the "Создать из шаблона" flow."""

    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]

    def get(self, request):
        return Response({"results": list_scenario_templates()})


class ScenarioTestView(APIView):
    """Dry-run a scenario against a sample client message."""

    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]

    def post(self, request, pk):
        scenario = Scenario.objects.filter(pk=pk).first()
        if not scenario:
            return Response({"error": "Сценарий не найден"}, status=404)

        serializer = ScenarioTestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        matched = match_keywords(
            serializer.validated_data["text"],
            scenario.keywords,
            scenario.match_mode,
        )
        return Response(
            {
                "matched": matched is not None,
                "keyword": matched,
                "active": scenario.is_active,
            }
        )


class ScenarioTriggerListView(generics.ListAPIView):
    """Recent scenario auto-response log."""

    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]
    serializer_class = ScenarioTriggerSerializer
    pagination_class = None

    def get_queryset(self):
        qs = (
            ScenarioTrigger.objects.all()
            .select_related("scenario", "client", "conversation", "message")
            .order_by("-created_at")
        )
        scenario_id = self.request.query_params.get("scenario")
        if scenario_id:
            qs = qs.filter(scenario_id=scenario_id)
        status_filter = self.request.query_params.get("status")
        if status_filter in TriggerStatus.values:
            qs = qs.filter(status=status_filter)
        limit = self.request.query_params.get("limit")
        if limit and limit.isdigit():
            qs = qs[: min(int(limit), 100)]
        return qs[:50]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({"results": serializer.data})


class ScenarioStatsView(APIView):
    """Aggregate counts for the scenarios page header."""

    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]

    def get(self, request):
        today = timezone.now().date()
        data = {
            "total": Scenario.objects.count(),
            "active": Scenario.objects.filter(is_active=True).count(),
            "total_triggers": ScenarioTrigger.objects.count(),
            "responded_today": ScenarioTrigger.objects.filter(
                status=TriggerStatus.RESPONDED, created_at__date=today
            ).count(),
            "failed": ScenarioTrigger.objects.filter(status=TriggerStatus.FAILED).count(),
        }
        return Response(ScenarioStatsSerializer(data).data)


class ScenarioTopView(APIView):
    """Top scenarios by trigger count (for the empty-state hint)."""

    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]

    def get(self, request):
        rows = (
            Scenario.objects.filter(trigger_count__gt=0)
            .values("name", "trigger_count")
            .order_by("-trigger_count")[:5]
        )
        return Response({"results": list(rows)})
