from rest_framework import serializers

from .models import (
    AnalyticsDashboard,
    AnalyticsMetric,
    Report,
    SourceAcquisitionCost,
)


class AnalyticsMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsMetric
        fields = [
            "id",
            "name",
            "metric_key",
            "category",
            "value",
            "period_date",
            "period_type",
            "breakdown",
        ]


class DashboardSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsDashboard
        fields = ["id", "name", "config", "is_public", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class SourceAcquisitionCostSerializer(serializers.ModelSerializer):
    source_display = serializers.CharField(source="get_source_display", read_only=True)

    class Meta:
        model = SourceAcquisitionCost
        fields = [
            "id",
            "source",
            "source_display",
            "year",
            "month",
            "amount",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        queryset = SourceAcquisitionCost.objects.filter(
            source=attrs.get("source", self.instance.source if self.instance else None),
            year=attrs.get("year", self.instance.year if self.instance else None),
            month=attrs.get("month", self.instance.month if self.instance else None),
        )
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Стоимость для этого источника и месяца уже указана")
        return attrs


class ReportSerializer(serializers.ModelSerializer):
    generated_by_name = serializers.CharField(source="generated_by.get_full_name", read_only=True)

    class Meta:
        model = Report
        fields = [
            "id",
            "title",
            "type",
            "filters",
            "data",
            "format",
            "file_url",
            "generated_by",
            "generated_by_name",
            "generated_at",
        ]
        read_only_fields = ["id", "generated_at"]
