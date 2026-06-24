from django.contrib import admin

from .models import Lead, LeadFile, LeadHistory, LeadStage


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
        "contact_name", "company_name", "current_stage", "assigned_to",
        "budget", "is_active", "created_at"
    ]
    list_filter = ["current_stage", "source", "is_active"]
    search_fields = ["contact_name", "company_name", "phone", "email"]
    inlines = [LeadHistoryInline, LeadFileInline]
    date_hierarchy = "created_at"
