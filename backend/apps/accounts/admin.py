from django.contrib import admin

from .models import Permission, Role, RolePermission, User, UserActivityLog


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("email", "get_full_name", "role", "is_active", "is_2fa_enabled", "date_joined")
    list_filter = ("role", "is_active", "is_2fa_enabled")
    search_fields = ("email", "first_name", "last_name", "phone")
    ordering = ("-date_joined",)


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "description", "created_at")


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ("codename", "name")


@admin.register(UserActivityLog)
class UserActivityLogAdmin(admin.ModelAdmin):
    list_display = ("user", "action", "entity_type", "created_at")
    list_filter = ("action", "entity_type", "created_at")
    readonly_fields = ("user", "action", "entity_type", "entity_id", "details", "ip_address")


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ("role", "permission")
