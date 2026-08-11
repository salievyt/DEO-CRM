from django.contrib import admin

from .models import Scenario, ScenarioTrigger


@admin.register(Scenario)
class ScenarioAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "channel",
        "match_mode",
        "is_active",
        "trigger_count",
        "last_triggered_at",
    )
    list_filter = ("channel", "match_mode", "is_active")
    search_fields = ("name", "description", "reply_text")


@admin.register(ScenarioTrigger)
class ScenarioTriggerAdmin(admin.ModelAdmin):
    list_display = ("scenario", "client", "matched_keyword", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("matched_keyword", "client__first_name", "client__last_name")
    readonly_fields = (
        "scenario",
        "conversation",
        "message",
        "reply_message",
        "client",
        "matched_keyword",
        "status",
        "error_message",
        "created_at",
    )
