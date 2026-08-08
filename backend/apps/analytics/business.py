"""API views for the Business Analytics module.

Permission model:
- Admins (superadmin/owner) can request ``scope=company`` (default) or
  ``scope=manager&manager_id=<id>``.
- Other staff are always scoped to their own data (``scope=manager`` with
  their own user id) — they never see company-wide figures.
"""

import uuid
from datetime import timedelta

from django.http import HttpResponse
from rest_framework import generics, permissions, views
from rest_framework.response import Response

from common.permissions import IsAnalyticsAdmin, IsAnalyticsViewer

from . import services
from .constants import PeriodKeys, resolve_period
from .export import build_csv, build_pdf
from .serializers import SourceAcquisitionCostSerializer
from .services import AnalyticsScope, Period


def _resolve_scope(request):
    user = request.user
    is_admin = user.role is not None and user.role.name in ("superadmin", "owner")
    if is_admin:
        if request.query_params.get("scope") == "manager":
            manager_id = request.query_params.get("manager_id")
            if manager_id:
                try:
                    return AnalyticsScope("manager", uuid.UUID(manager_id))
                except ValueError:
                    pass
        return AnalyticsScope("company")
    return AnalyticsScope("manager", user.id)


def _resolve_period(request):
    period_key = request.query_params.get("period", PeriodKeys.DAYS_30)
    start_date = request.query_params.get("start_date")
    end_date = request.query_params.get("end_date")

    from datetime import date as date_cls

    start = end = None
    try:
        start = date_cls.fromisoformat(start_date) if start_date else None
        end = date_cls.fromisoformat(end_date) if end_date else None
    except ValueError:
        pass

    start_dt, end_dt = resolve_period(period_key, start, end)
    return Period(start_dt, end_dt, label=period_key)


class BusinessBaseView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsAnalyticsViewer]

    @property
    def scope(self):
        return _resolve_scope(self.request)

    @property
    def period(self):
        return _resolve_period(self.request)


class BusinessSummaryView(BusinessBaseView):
    """All main KPIs: Revenue, Profit, Conversion, LTV, CAC, Churn, ..."""

    def get(self, request):
        return Response(services.get_summary(self.scope, self.period))


class BusinessRevenueView(BusinessBaseView):
    """Revenue total, dynamics and breakdowns by manager/product/source."""

    def get(self, request):
        return Response(services.get_revenue_breakdown(self.scope, self.period))


class BusinessFunnelView(BusinessBaseView):
    """Lead → Qualified → Deal → Won funnel with step conversions."""

    def get(self, request):
        return Response(services.get_funnel(self.scope, self.period))


class BusinessManagersView(BusinessBaseView):
    """Efficiency per sales manager."""

    def get(self, request):
        return Response(services.get_managers(self.scope, self.period))


class BusinessSourcesView(BusinessBaseView):
    """Efficiency per lead source: leads, won, revenue, CAC, ROI."""

    def get(self, request):
        return Response(services.get_sources(self.scope, self.period))


class BusinessLtvView(BusinessBaseView):
    """Customer LTV from purchase history (all-time)."""

    def get(self, request):
        return Response(services.get_ltv(self.scope))


class BusinessChurnView(BusinessBaseView):
    """Churn for the requested period."""

    def get(self, request):
        return Response(services.get_churn(self.scope, self.period))


class BusinessRetentionView(BusinessBaseView):
    """Cohort retention table."""

    def get(self, request):
        return Response(services.get_retention(self.scope))


class BusinessStageConfigView(BusinessBaseView):
    """Funnel stage classification — lets admins verify configuration."""

    def get(self, request):
        return Response(services.get_stage_config())


class BusinessExportView(BusinessBaseView):
    """Export the report as CSV or PDF (?format=csv|pdf)."""

    def get(self, request):
        # Note: `format` is reserved by DRF for renderer negotiation — use `export`.
        fmt = request.query_params.get("export", "csv").lower()
        scope, period = self.scope, self.period
        label = period.label or "custom"
        end_date = (period.end - timedelta(microseconds=1)).date().isoformat()
        filename = f"business_analytics_{label}_{period.start.date().isoformat()}_{end_date}"

        if fmt == "pdf":
            content = build_pdf(scope, period)
            return HttpResponse(
                content,
                content_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="{filename}.pdf"'},
            )

        content = build_csv(scope, period)
        response = HttpResponse(
            content,
            content_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}.csv"'},
        )
        return response


class AcquisitionCostListCreateView(generics.ListCreateAPIView):
    """Marketing spend per source per month (admin only)."""

    permission_classes = [permissions.IsAuthenticated, IsAnalyticsAdmin]
    serializer_class = SourceAcquisitionCostSerializer
    filterset_fields = ["source", "year", "month"]

    def get_queryset(self):
        from .models import SourceAcquisitionCost

        qs = SourceAcquisitionCost.objects.all()
        source = self.request.query_params.get("source")
        year = self.request.query_params.get("year")
        month = self.request.query_params.get("month")
        if source:
            qs = qs.filter(source=source)
        if year:
            qs = qs.filter(year=year)
        if month:
            qs = qs.filter(month=month)
        return qs


class AcquisitionCostDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAnalyticsAdmin]
    serializer_class = SourceAcquisitionCostSerializer

    def get_queryset(self):
        from .models import SourceAcquisitionCost

        return SourceAcquisitionCost.objects.all()
