from django.contrib import admin

from .models import Partner, PartnerPayout, Referral


@admin.register(Partner)
class PartnerAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "email",
        "phone",
        "commission_rate",
        "active",
        "referral_count",
        "created_at",
    )
    list_filter = ("active", "created_at")
    search_fields = ("name", "email", "phone", "code")
    readonly_fields = ("code", "created_at")
    ordering = ("name",)

    @admin.display(description="Передано лидов")
    def referral_count(self, obj):
        return obj.referrals.count()


@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    list_display = ("partner", "lead", "project", "commission_rate", "created_at")
    list_filter = ("created_at", "partner")
    search_fields = (
        "partner__name",
        "partner__email",
        "lead__contact_name",
        "lead__company_name",
    )
    readonly_fields = ("public_request_id", "created_at")
    autocomplete_fields = ("partner", "lead", "project")


@admin.register(PartnerPayout)
class PartnerPayoutAdmin(admin.ModelAdmin):
    list_display = ("partner", "amount", "reference", "created_by", "paid_at")
    list_filter = ("paid_at", "partner")
    search_fields = ("partner__name", "reference", "created_by__email")
    readonly_fields = ("partner", "amount", "reference", "created_by", "paid_at")
    ordering = ("-paid_at",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
