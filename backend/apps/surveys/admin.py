from django.contrib import admin

from .models import Answer, Question, QuestionOption, Survey, SurveyResponse, SurveySection


class SurveySectionInline(admin.TabularInline):
    model = SurveySection
    extra = 0
    fields = ("order", "title", "description")
    show_change_link = True


class QuestionInline(admin.StackedInline):
    model = Question
    extra = 0
    fields = (
        ("order", "code", "type", "required"),
        "text",
        "help_text",
        ("scale_min", "scale_max", "scale_labels"),
        ("max_choices", "has_other", "other_label"),
        ("min_value", "max_value", "max_length"),
        "identifies_respondent",
    )
    show_change_link = True


class QuestionOptionInline(admin.TabularInline):
    model = QuestionOption
    extra = 0
    fields = ("order", "text", "is_exclusive")


@admin.register(Survey)
class SurveyAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "is_anonymous",
        "is_active",
        "starts_at",
        "ends_at",
        "response_count",
        "created_at",
    )
    list_filter = ("is_anonymous", "is_active")
    search_fields = ("title", "slug")
    readonly_fields = (
        "public_token",
        "first_activated_at",
        "created_by",
        "created_at",
        "updated_at",
    )
    inlines = [SurveySectionInline]

    @admin.display(description="Ответов")
    def response_count(self, obj):
        return obj.responses.count()

    def save_model(self, request, obj, form, change):
        if not change and obj.created_by_id is None:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(SurveySection)
class SurveySectionAdmin(admin.ModelAdmin):
    list_display = ("title", "survey", "order")
    list_filter = ("survey",)
    inlines = [QuestionInline]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("code", "text", "type", "required", "section")
    list_filter = ("type", "required", "section__survey")
    search_fields = ("text", "code")
    inlines = [QuestionOptionInline]


class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 0
    fields = ("question", "number_value", "text_value", "selected")
    readonly_fields = fields
    can_delete = False

    @admin.display(description="Варианты")
    def selected(self, obj):
        return "; ".join(o.text for o in obj.options.all())

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(SurveyResponse)
class SurveyResponseAdmin(admin.ModelAdmin):
    """Read-only: responses come only from the public form."""

    list_display = ("survey", "submitted_date", "respondent_name")
    list_filter = ("survey",)
    readonly_fields = ("survey", "submitted_date", "submitted_at", "respondent_name", "user")
    inlines = [AnswerInline]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
