from django.urls import path

from . import views
from .business import (
    AcquisitionCostDetailView,
    AcquisitionCostListCreateView,
    BusinessChurnView,
    BusinessExportView,
    BusinessFunnelView,
    BusinessLtvView,
    BusinessManagersView,
    BusinessRetentionView,
    BusinessRevenueView,
    BusinessSourcesView,
    BusinessStageConfigView,
    BusinessSummaryView,
)

urlpatterns = [
    path("dashboard/", views.DashboardListCreateView.as_view(), name="dashboard-list"),
    path("metrics/summary/", views.SummaryMetricsView.as_view(), name="metrics-summary"),
    path("metrics/sales/", views.SalesMetricsView.as_view(), name="metrics-sales"),
    path("metrics/tasks/", views.TaskMetricsView.as_view(), name="metrics-tasks"),
    path("reports/generate/", views.ReportGenerateView.as_view(), name="report-generate"),
    path("metrics/workload/", views.WorkloadMetricsView.as_view(), name="metrics-workload"),
    # ---- Business Analytics ----
    path("business/summary/", BusinessSummaryView.as_view(), name="business-summary"),
    path("business/revenue/", BusinessRevenueView.as_view(), name="business-revenue"),
    path("business/funnel/", BusinessFunnelView.as_view(), name="business-funnel"),
    path("business/managers/", BusinessManagersView.as_view(), name="business-managers"),
    path("business/sources/", BusinessSourcesView.as_view(), name="business-sources"),
    path("business/ltv/", BusinessLtvView.as_view(), name="business-ltv"),
    path("business/churn/", BusinessChurnView.as_view(), name="business-churn"),
    path("business/retention/", BusinessRetentionView.as_view(), name="business-retention"),
    path("business/config/", BusinessStageConfigView.as_view(), name="business-config"),
    path("business/export/", BusinessExportView.as_view(), name="business-export"),
    path(
        "business/acquisition-costs/",
        AcquisitionCostListCreateView.as_view(),
        name="business-acquisition-costs",
    ),
    path(
        "business/acquisition-costs/<int:pk>/",
        AcquisitionCostDetailView.as_view(),
        name="business-acquisition-cost-detail",
    ),
]
