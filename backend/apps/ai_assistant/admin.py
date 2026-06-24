from django.contrib import admin

from .models import AIRequest, AIPromptTemplate


@admin.register(AIPromptTemplate)
class AIPromptTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "prompt_type", "created_at"]
    list_filter = ["prompt_type"]


@admin.register(AIRequest)
class AIRequestAdmin(admin.ModelAdmin):
    list_display = ["user", "prompt_type", "status", "model", "tokens_used", "created_at"]
    list_filter = ["status", "prompt_type", "model"]
