from django.urls import path

from . import views

urlpatterns = [
    path("dashboard/", views.DashboardListCreateView.as_view(), name="dashboard-list"),
    path("metrics/summary/", views.SummaryMetricsView.as_view(), name="metrics-summary"),
    path("metrics/sales/", views.SalesMetricsView.as_view(), name="metrics-sales"),
    path("metrics/tasks/", views.TaskMetricsView.as_view(), name="metrics-tasks"),
    path("reports/generate/", views.ReportGenerateView.as_view(), name="report-generate"),
    path("metrics/workload/", views.WorkloadMetricsView.as_view(), name="metrics-workload"),
]
