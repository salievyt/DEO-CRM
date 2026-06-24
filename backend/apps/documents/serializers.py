from rest_framework import serializers

from .models import Document, DocumentTemplate, DocumentType


class DocumentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentType
        fields = ["id", "name", "code"]


class DocumentListSerializer(serializers.ModelSerializer):
    document_type_name = serializers.CharField(
        source="document_type.name", read_only=True
    )
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )

    class Meta:
        model = Document
        fields = [
            "id", "title", "document_type", "document_type_name",
            "file_name", "mime_type", "file_size", "status",
            "created_by_name", "created_at",
        ]


class DocumentDetailSerializer(serializers.ModelSerializer):
    document_type_name = serializers.CharField(
        source="document_type.name", read_only=True
    )
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )

    class Meta:
        model = Document
        fields = [
            "id", "document_type", "document_type_name", "client", "project",
            "title", "file", "file_name", "mime_type", "file_size",
            "status", "created_by", "created_by_name",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "file_size", "mime_type", "created_at", "updated_at"]


class DocumentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = [
            "document_type", "client", "project", "title", "file", "status",
        ]

    def create(self, validated_data):
        file = validated_data.pop("file")
        validated_data["file_name"] = file.name
        validated_data["mime_type"] = file.content_type or ""
        validated_data["file_size"] = file.size or 0
        return Document.objects.create(**validated_data)


class DocumentTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentTemplate
        fields = ["id", "document_type", "name", "content_template"]
