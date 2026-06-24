from django.contrib import admin

from .models import Client, ClientInteraction, ClientTag, ClientTagAssignment


class ClientTagAssignmentInline(admin.TabularInline):
    model = ClientTagAssignment
    extra = 1


class ClientInteractionInline(admin.TabularInline):
    model = ClientInteraction
    extra = 0
    readonly_fields = ["created_at"]


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = [
        "full_name", "company_name", "phone", "email", "source",
        "is_active", "created_at"
    ]
    list_filter = ["is_active", "source", "created_at"]
    search_fields = ["first_name", "last_name", "company_name", "email", "phone"]
    inlines = [ClientTagAssignmentInline, ClientInteractionInline]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "created_at"


@admin.register(ClientTag)
class ClientTagAdmin(admin.ModelAdmin):
    list_display = ["name", "color"]


@admin.register(ClientInteraction)
class ClientInteractionAdmin(admin.ModelAdmin):
    list_display = ["client", "user", "type", "created_at"]
    list_filter = ["type", "created_at"]
