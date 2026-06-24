from django.contrib import admin

from .models import Document, DocumentTemplate, DocumentType


@admin.register(DocumentType)
class DocumentTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "code"]


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ["title", "document_type", "client", "project", "status", "created_at"]
    list_filter = ["document_type", "status"]
    search_fields = ["title", "file_name"]
    date_hierarchy = "created_at"


@admin.register(DocumentTemplate)
class DocumentTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "document_type"]
