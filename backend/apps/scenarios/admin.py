from django.contrib import admin

from .models import Scenario, ScenarioTrigger


@admin.register(Scenario)
class ScenarioAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "event_type",
        "action_type",
        "channel",
        "match_mode",
        "is_active",
        "trigger_count",
        "last_triggered_at",
    )
    list_filter = ("event_type", "action_type", "channel", "match_mode", "is_active")
    search_fields = ("name", "description", "reply_text")
    readonly_fields = ("trigger_count", "last_triggered_at", "created_at", "updated_at")


@admin.register(ScenarioTrigger)
class ScenarioTriggerAdmin(admin.ModelAdmin):
    list_display = (
        "scenario",
        "event_type",
        "entity_label",
        "client",
        "matched_keyword",
        "status",
        "created_at",
    )
    list_filter = ("status", "event_type", "created_at")
    search_fields = ("matched_keyword", "entity_label", "client__first_name", "client__last_name")
    readonly_fields = (
        "scenario",
        "event_type",
        "entity_type",
        "entity_id",
        "entity_label",
        "conversation",
        "message",
        "reply_message",
        "client",
        "matched_keyword",
        "status",
        "error_message",
        "created_at",
    )
