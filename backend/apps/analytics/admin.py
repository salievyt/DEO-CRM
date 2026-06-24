from django.contrib import admin

from .models import AnalyticsDashboard, AnalyticsMetric, Report


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
