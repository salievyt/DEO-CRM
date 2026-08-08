from django.contrib import admin

from .models import Reminder, ReminderLog, ReminderRule


@admin.register(ReminderRule)
class ReminderRuleAdmin(admin.ModelAdmin):
    list_display = ["name", "type", "priority", "enabled", "updated_at"]
    list_filter = ["type", "priority", "enabled"]
    search_fields = ["name", "type"]


@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = [
        "title", "user", "priority", "status", "due_at", "created_at"
    ]
    list_filter = ["priority", "status", "created_at"]
    search_fields = ["title", "description", "user__email"]
    date_hierarchy = "created_at"
    raw_id_fields = ["user", "client", "deal", "task", "invoice", "rule"]


@admin.register(ReminderLog)
class ReminderLogAdmin(admin.ModelAdmin):
    list_display = ["reminder", "actor", "action", "created_at"]
    list_filter = ["action", "created_at"]
    search_fields = ["reminder__title", "actor__email"]
    raw_id_fields = ["reminder", "actor"]
