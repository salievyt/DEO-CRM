from django.contrib import admin

from .models import Lead, LeadFile, LeadHistory, LeadStage
from .website_models import WebsiteSubmission


class LeadHistoryInline(admin.TabularInline):
    model = LeadHistory
    extra = 0
    readonly_fields = ["created_at"]


class LeadFileInline(admin.TabularInline):
    model = LeadFile
    extra = 0


@admin.register(LeadStage)
class LeadStageAdmin(admin.ModelAdmin):
    list_display = ["name", "order", "probability", "color"]
    list_editable = ["order", "probability"]


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = [
        "contact_name",
        "company_name",
        "current_stage",
        "assigned_to",
        "budget",
        "is_active",
        "created_at",
    ]
    list_filter = ["current_stage", "source", "is_active"]
    search_fields = ["contact_name", "company_name", "phone", "email"]
    inlines = [LeadHistoryInline, LeadFileInline]
    date_hierarchy = "created_at"


@admin.register(WebsiteSubmission)
class WebsiteSubmissionAdmin(admin.ModelAdmin):
    list_display = [
        "request_id",
        "lead",
        "project_type",
        "budget_range",
        "attachment_complete",
        "created_at",
    ]
    readonly_fields = [field.name for field in WebsiteSubmission._meta.fields]
    search_fields = ["lead__contact_name", "lead__email", "request_id"]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
