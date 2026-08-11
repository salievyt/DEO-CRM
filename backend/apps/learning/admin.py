from django.contrib import admin

from .models import Article


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "category",
        "reading_time_minutes",
        "section_count",
        "is_published",
        "order",
    )
    list_filter = ("category", "is_published")
    search_fields = ("title", "summary")
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("created_at", "updated_at")
