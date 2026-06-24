from datetime import datetime, timedelta

from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import generics, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.permissions import IsAdmin, IsOwner

from .models import AnalyticsDashboard, AnalyticsMetric, Report
from .serializers import AnalyticsMetricSerializer, DashboardSerializer, ReportSerializer


class DashboardListCreateView(generics.ListCreateAPIView):
    """List or create dashboards."""
    permission_classes = [IsAuthenticated]
    serializer_class = DashboardSerializer

    def get_queryset(self):
        return AnalyticsDashboard.objects.filter(
            owner=self.request.user
        ).all()


class SummaryMetricsView(views.APIView):
    """Get summary metrics for main dashboard."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.clients.models import Client
        from apps.projects.models import Project
        from apps.finance.models import Invoice
        from apps.tasks.models import Task

        now = timezone.now()
        start_month = now.replace(day=1, hour=0, minute=0, second=0)

        return Response({
            "total_clients": Client.objects.count(),
            "active_projects": Project.objects.exclude(
                status__name__in=["Завершен", "Приостановлен"]
            ).count(),
            "monthly_revenue": float(
                Invoice.objects.filter(
                    status="paid", paid_at__gte=start_month
                ).aggregate(total=Sum("amount"))["total"] or 0
            ),
            "open_tasks": Task.objects.exclude(
                status__name__in=["Выполнена", "Отклонена"]
            ).count(),
        })


class SalesMetricsView(views.APIView):
    """Sales pipeline metrics."""
    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request):
        from apps.leads.models import Lead, LeadStage

        stages = LeadStage.objects.annotate(
            lead_count=Count("leads")
        ).order_by("order")
        total_budget = Lead.objects.filter(
            is_active=True
        ).aggregate(total=Sum("budget"))["total"] or 0

        return Response({
            "total_leads": Lead.objects.count(),
            "active_leads": Lead.objects.filter(is_active=True).count(),
            "total_pipeline_value": float(total_budget),
            "stages": [
                {"name": s.name, "count": s.lead_count, "color": s.color}
                for s in stages
            ],
        })


class TaskMetricsView(views.APIView):
    """Task completion metrics."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.tasks.models import Task

        total = Task.objects.count()
        completed = Task.objects.filter(status__name="Выполнена").count()
        overdue = Task.objects.filter(
            deadline__lt=timezone.now().date(),
        ).exclude(status__name__in=["Выполнена", "Отклонена"]).count()

        return Response({
            "total": total,
            "completed": completed,
            "completion_rate": round(completed / total * 100, 1) if total else 0,
            "overdue": overdue,
        })


class ReportGenerateView(views.APIView):
    """Generate and save a report."""
    permission_classes = [IsAuthenticated, IsOwner]

    def post(self, request):
        from .models import Report
        report = Report.objects.create(
            title=request.data.get("title", "Отчет"),
            type=request.data.get("type", "custom"),
            filters=request.data.get("filters", {}),
            data=request.data.get("data", {}),
            format=request.data.get("format", "pdf"),
            generated_by=request.user,
        )
        return Response(ReportSerializer(report).data)
