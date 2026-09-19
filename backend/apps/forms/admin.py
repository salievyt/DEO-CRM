from django.contrib import admin

from .models import FormInvitation, FormTemplate


@admin.register(FormTemplate)
class FormTemplateAdmin(admin.ModelAdmin):
    list_display = (
        "title", "entity_type", "is_active", "link_count",
        "created_by", "created_at",
    )
    list_filter = ("entity_type", "is_active", "created_at")
    search_fields = ("title", "description")

    def link_count(self, obj):
        return obj.invitations.count()

    link_count.short_description = "Ссылок"


@admin.register(FormInvitation)
class FormInvitationAdmin(admin.ModelAdmin):
    list_display = (
        "form", "recipient_name", "status", "expires_at",
        "submitted_at", "created_by", "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("recipient_name", "recipient_email", "token")
    readonly_fields = ("token", "response", "submitted_at")
    ordering = ("-created_at",)