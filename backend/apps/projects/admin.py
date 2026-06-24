from django.contrib import admin

from .models import Project, ProjectHistory, ProjectStatus, ProjectTeamMember, ServiceType


class ProjectTeamInline(admin.TabularInline):
    model = ProjectTeamMember
    extra = 1


class ProjectHistoryInline(admin.TabularInline):
    model = ProjectHistory
    extra = 0
    readonly_fields = ["created_at"]


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["name", "client", "status", "budget", "deadline", "progress"]
    list_filter = ["status", "service_type"]
    search_fields = ["name", "client__first_name", "client__last_name"]
    inlines = [ProjectTeamInline, ProjectHistoryInline]


@admin.register(ProjectStatus)
class ProjectStatusAdmin(admin.ModelAdmin):
    list_display = ["name", "order", "color"]
    list_editable = ["order"]


@admin.register(ServiceType)
class ServiceTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "description"]
