from django.contrib import admin

from .models import (
    Checklist,
    ChecklistItem,
    MenteeChecklistItemProgress,
    MenteeChecklistProgress,
    MenteeEvaluation,
    MenteeTask,
    MentorshipPair,
)


class ChecklistItemInline(admin.TabularInline):
    model = ChecklistItem
    extra = 1


@admin.register(MentorshipPair)
class MentorshipPairAdmin(admin.ModelAdmin):
    list_display = ["mentor", "mentee", "status", "started_at"]
    list_filter = ["status"]
    search_fields = ["mentor__email", "mentee__email"]


@admin.register(Checklist)
class ChecklistAdmin(admin.ModelAdmin):
    list_display = ["title", "is_default", "item_count"]
    inlines = [ChecklistItemInline]

    def item_count(self, obj):
        return obj.items.count()
    item_count.short_description = "Пунктов"


@admin.register(MenteeTask)
class MenteeTaskAdmin(admin.ModelAdmin):
    list_display = ["title", "pair", "status", "deadline"]
    list_filter = ["status"]


@admin.register(MenteeChecklistProgress)
class MenteeChecklistProgressAdmin(admin.ModelAdmin):
    list_display = ["pair", "checklist", "progress_percent"]


@admin.register(MenteeEvaluation)
class MenteeEvaluationAdmin(admin.ModelAdmin):
    list_display = ["pair", "rating", "evaluated_by", "created_at"]
    list_filter = ["rating"]
