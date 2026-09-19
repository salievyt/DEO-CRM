from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Permission, Role, RolePermission, User, UserActivityLog


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("email", "get_full_name", "role", "is_active", "is_2fa_enabled", "date_joined")
    list_filter = ("role", "is_active", "is_2fa_enabled")
    search_fields = ("email", "first_name", "last_name", "phone")
    ordering = ("-date_joined",)
    list_select_related = ("role",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Личные данные", {"fields": ("first_name", "last_name", "phone", "avatar")}),
        ("CRM", {"fields": ("role", "is_2fa_enabled")}),
        (
            "Доступ",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Важные даты", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "password1",
                    "password2",
                    "role",
                    "is_staff",
                    "is_active",
                ),
            },
        ),
    )


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
