from django.contrib import admin

from .models import Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "type", "urgency", "read", "archived", "created_at"]
    list_filter = ["type", "urgency", "read", "archived", "created_at"]
    search_fields = ["title", "message", "user__email"]
    date_hierarchy = "created_at"


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "quiet_hours_enabled",
        "digest_enabled",
        "auto_archive_read_days",
        "auto_archive_unread_days",
    ]
    list_filter = ["quiet_hours_enabled", "digest_enabled"]
    search_fields = ["user__email", "user__first_name", "user__last_name"]
