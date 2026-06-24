from rest_framework import serializers

from .models import AnalyticsDashboard, AnalyticsMetric, Report


class AnalyticsMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsMetric
        fields = [
            "id", "name", "metric_key", "category", "value",
            "period_date", "period_type", "breakdown",
        ]


class DashboardSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsDashboard
        fields = ["id", "name", "config", "is_public", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class ReportSerializer(serializers.ModelSerializer):
    generated_by_name = serializers.CharField(
        source="generated_by.get_full_name", read_only=True
    )

    class Meta:
        model = Report
        fields = [
            "id", "title", "type", "filters", "data", "format",
            "file_url", "generated_by", "generated_by_name", "generated_at",
        ]
        read_only_fields = ["id", "generated_at"]
