from rest_framework import serializers

from .ab_testing import ABTestCampaign, ABTestConversion, CampaignVariant


class CampaignVariantSerializer(serializers.ModelSerializer):
    conversion_rate = serializers.FloatField(read_only=True)
    total_sent = serializers.IntegerField(read_only=True)
    total_converted = serializers.IntegerField(read_only=True)
    focus_display = serializers.CharField(
        source="get_focus_display", read_only=True
    )

    class Meta:
        model = CampaignVariant
        fields = [
            "id",
            "campaign",
            "name",
            "focus",
            "focus_display",
            "content",
            "ai_request",
            "style_tags",
            "sent_count",
            "viewed_count",
            "converted_count",
            "conversion_rate",
            "total_sent",
            "total_converted",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "sent_count",
            "viewed_count",
            "converted_count",
            "created_at",
        ]


class ABTestConversionSerializer(serializers.ModelSerializer):
    lead_name = serializers.CharField(
        source="lead.contact_name", read_only=True
    )
    invoice_number = serializers.CharField(
        source="invoice.number", read_only=True
    )

    class Meta:
        model = ABTestConversion
        fields = [
            "id",
            "variant",
            "lead",
            "lead_name",
            "invoice",
            "invoice_number",
            "sent",
            "converted",
            "sent_at",
            "converted_at",
            "notes",
        ]
        read_only_fields = ["id", "sent_at", "converted_at"]


class ABTestCampaignSerializer(serializers.ModelSerializer):
    variants = CampaignVariantSerializer(many=True, read_only=True)
    variant_count = serializers.SerializerMethodField()
    winner_variant_id = serializers.UUIDField(
        source="winner_variant_id", read_only=True
    )
    winner_name = serializers.CharField(
        source="winner_variant.name", read_only=True, default=None
    )
    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )

    class Meta:
        model = ABTestCampaign
        fields = [
            "id",
            "name",
            "description",
            "lead",
            "client",
            "status",
            "status_display",
            "variants",
            "variant_count",
            "winner_variant",
            "winner_variant_id",
            "winner_name",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "created_at",
            "updated_at",
            "winner_variant",
        ]

    def get_variant_count(self, obj):
        return obj.variants.count()

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class ABTestStatsSerializer(serializers.Serializer):
    """Aggregated A/B test statistics."""
    total_campaigns = serializers.IntegerField()
    active_campaigns = serializers.IntegerField()
    total_variants = serializers.IntegerField()
    total_sent = serializers.IntegerField()
    total_conversions = serializers.IntegerField()
    overall_conversion_rate = serializers.FloatField()
    top_variant = serializers.DictField(read_only=True)
    best_focus = serializers.CharField()


class GenerateProposalVariantsSerializer(serializers.Serializer):
    """Create multiple proposal variants for A/B testing."""
    campaign_id = serializers.UUIDField(required=False)
    campaign_name = serializers.CharField(max_length=255)
    lead_id = serializers.UUIDField(required=False)
    client_id = serializers.UUIDField(required=False)
    project_name = serializers.CharField(max_length=255)
    client_name = serializers.CharField(max_length=255)
    focuses = serializers.ListField(
        child=serializers.ChoiceField(choices=CampaignVariant.FOCUS_CHOICES),
        min_length=2,
        max_length=5,
    )


class TrackVariantEventSerializer(serializers.Serializer):
    """Track sent/viewed/converted events for a variant."""
    event_type = serializers.ChoiceField(
        choices=["sent", "viewed", "converted"]
    )
    lead_id = serializers.UUIDField(required=False)
    invoice_id = serializers.UUIDField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
