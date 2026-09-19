from rest_framework import serializers

from .models import (Document, DocumentActivity, DocumentComment,
                     DocumentTemplate, DocumentType, DocumentVersion)


class DocumentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentType
        fields = ["id", "name", "code"]


class DocumentListSerializer(serializers.ModelSerializer):
    document_type_name = serializers.CharField(source="document_type.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    deal_name = serializers.CharField(source="deal.title", read_only=True)
    preview_url = serializers.CharField(read_only=True)
    version_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "document_type",
            "document_type_name",
            "file",
            "source",
            "external_url",
            "preview_url",
            "file_name",
            "mime_type",
            "file_size",
            "status",
            "client",
            "client_name",
            "project",
            "project_name",
            "deal",
            "deal_name",
            "created_by",
            "created_by_name",
            "created_at",
            "approval_assignee",
            "approval_deadline",
            "is_visible_to_client",
            "is_protected",
            "allowed_roles",
            "version_count",
        ]


class DocumentDetailSerializer(serializers.ModelSerializer):
    document_type_name = serializers.CharField(source="document_type.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    deal_name = serializers.CharField(source="deal.title", read_only=True)
    approval_assignee_name = serializers.CharField(
        source="approval_assignee.get_full_name", read_only=True
    )
    preview_url = serializers.CharField(read_only=True)

    class Meta:
        model = Document
        fields = [
            "id",
            "document_type",
            "document_type_name",
            "client",
            "client_name",
            "project",
            "project_name",
            "deal",
            "deal_name",
            "title",
            "file",
            "source",
            "external_url",
            "preview_url",
            "file_name",
            "mime_type",
            "file_size",
            "status",
            "created_by",
            "created_by_name",
            "approval_assignee",
            "approval_assignee_name",
            "approval_deadline",
            "is_visible_to_client",
            "is_protected",
            "allowed_roles",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "file_size", "mime_type", "created_at", "updated_at"]


class DocumentUploadSerializer(serializers.ModelSerializer):
    file = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = Document
        fields = [
            "document_type",
            "client",
            "project",
            "deal",
            "title",
            "file",
            "source",
            "external_url",
            "status",
            "approval_assignee",
            "approval_deadline",
            "is_visible_to_client",
            "is_protected",
            "allowed_roles",
        ]

    def validate(self, attrs):
        source = attrs.get("source", "file")
        if source == "file" and not attrs.get("file"):
            raise serializers.ValidationError({"file": "Выберите файл"})
        if source == "google_docs" and "docs.google.com" not in attrs.get("external_url", ""):
            raise serializers.ValidationError({"external_url": "Укажите ссылку Google Docs"})
        return attrs

    def create(self, validated_data):
        file = validated_data.get("file")
        if file:
            validated_data["file_name"] = file.name
            validated_data["mime_type"] = file.content_type or ""
            validated_data["file_size"] = file.size or 0
        else:
            validated_data["file_name"] = "Google Docs"
            validated_data["mime_type"] = "application/vnd.google-apps.document"
        document = Document.objects.create(**validated_data)
        if file:
            DocumentVersion.objects.create(
                document=document,
                version=1,
                file=file,
                file_name=file.name,
                file_size=file.size or 0,
                created_by=self.context["request"].user,
                comment="Первая версия",
            )
        return document


class DocumentVersionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = DocumentVersion
        fields = [
            "id",
            "version",
            "file",
            "file_name",
            "file_size",
            "comment",
            "created_by_name",
            "created_at",
        ]


class DocumentCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)

    class Meta:
        model = DocumentComment
        fields = ["id", "text", "author_name", "created_at"]
        read_only_fields = ["id", "author_name", "created_at"]


class DocumentActivitySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = DocumentActivity
        fields = ["id", "action", "details", "user_name", "created_at"]


class DocumentTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentTemplate
        fields = ["id", "document_type", "name", "content_template"]
