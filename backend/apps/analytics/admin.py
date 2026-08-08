from django.contrib import admin

from .models import (
    AnalyticsDashboard,
    AnalyticsMetric,
    BusinessMetricsSnapshot,
    Report,
    SourceAcquisitionCost,
)


@admin.register(AnalyticsDashboard)
class DashboardAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "is_public", "created_at"]


@admin.register(AnalyticsMetric)
class MetricAdmin(admin.ModelAdmin):
    list_display = ["name", "metric_key", "category", "value", "period_date"]
    list_filter = ["category", "period_type"]
    date_hierarchy = "period_date"


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ["title", "type", "format", "generated_by", "generated_at"]
    list_filter = ["type", "format"]


@admin.register(BusinessMetricsSnapshot)
class BusinessMetricsSnapshotAdmin(admin.ModelAdmin):
    list_display = [
        "date",
        "revenue",
        "gross_profit",
        "net_profit",
        "new_leads",
        "won_deals",
        "lost_deals",
        "calculated_at",
    ]
    list_filter = ["date"]
    date_hierarchy = "date"


@admin.register(SourceAcquisitionCost)
class SourceAcquisitionCostAdmin(admin.ModelAdmin):
    list_display = ["source", "year", "month", "amount"]
    list_filter = ["source", "year", "month"]
