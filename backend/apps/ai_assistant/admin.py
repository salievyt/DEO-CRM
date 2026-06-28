from django.contrib import admin

from .ab_testing import ABTestCampaign, ABTestConversion, CampaignVariant
from .models import AIRequest, AIPromptTemplate


@admin.register(AIPromptTemplate)
class AIPromptTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "prompt_type", "created_at"]
    list_filter = ["prompt_type"]


@admin.register(AIRequest)
class AIRequestAdmin(admin.ModelAdmin):
    list_display = ["user", "prompt_type", "status", "model", "tokens_used", "created_at"]
    list_filter = ["status", "prompt_type", "model"]


@admin.register(ABTestCampaign)
class ABTestCampaignAdmin(admin.ModelAdmin):
    list_display = ["name", "status", "created_by", "created_at"]
    list_filter = ["status"]
    search_fields = ["name", "created_by__email"]


@admin.register(CampaignVariant)
class CampaignVariantAdmin(admin.ModelAdmin):
    list_display = ["name", "campaign", "focus", "sent_count", "converted_count"]
    list_filter = ["focus"]


@admin.register(ABTestConversion)
class ABTestConversionAdmin(admin.ModelAdmin):
    list_display = ["variant", "lead", "sent", "converted", "created_at"]
    list_filter = ["sent", "converted"]
