from django.contrib import admin

from .models import ClientFeedback, ProjectMilestone, ProjectShareLink


@admin.register(ProjectMilestone)
class ProjectMilestoneAdmin(admin.ModelAdmin):
    list_display = ["name", "project", "status", "order", "due_date", "approved_at"]
    list_filter = ["status"]
    search_fields = ["name", "project__name"]


@admin.register(ProjectShareLink)
class ProjectShareLinkAdmin(admin.ModelAdmin):
    list_display = ["project", "is_active", "created_at"]
    list_filter = ["is_active"]


@admin.register(ClientFeedback)
class ClientFeedbackAdmin(admin.ModelAdmin):
    list_display = ["client", "project", "feedback_type", "rating", "created_at"]
    list_filter = ["feedback_type"]
