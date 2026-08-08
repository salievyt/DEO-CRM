from django.contrib import admin

from .models import Team, TeamMembership


class TeamMembershipInline(admin.TabularInline):
    model = TeamMembership
    extra = 1
    autocomplete_fields = ["user"]


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ["name", "team_type", "parent", "head", "is_active", "order"]
    list_filter = ["team_type", "is_active"]
    search_fields = ["name"]
    inlines = [TeamMembershipInline]
    autocomplete_fields = ["parent", "head"]


@admin.register(TeamMembership)
class TeamMembershipAdmin(admin.ModelAdmin):
    list_display = ["user", "team", "role", "position", "is_active"]
    list_filter = ["role", "is_active"]
    search_fields = ["user__email", "user__first_name", "user__last_name"]
