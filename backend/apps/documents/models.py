import uuid

from django.db import models


class DocumentType(models.Model):
    """Types of documents."""

    name = models.CharField(max_length=100, verbose_name="Название")
    code = models.CharField(max_length=50, unique=True, verbose_name="Код")

    class Meta:
        verbose_name = "Тип документа"
        verbose_name_plural = "Типы документов"

    def __str__(self):
        return self.name


class Document(models.Model):
    """Document file stored in S3."""

    STATUS_CHOICES = [
        ("draft", "Черновик"),
        ("review", "На согласовании"),
        ("changes_requested", "Нужны правки"),
        ("approved", "Согласован"),
        ("signed", "Подписан"),
        ("archived", "Архив"),
    ]
    SOURCE_CHOICES = [("file", "Файл"), ("google_docs", "Google Docs")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document_type = models.ForeignKey(
        DocumentType,
        on_delete=models.PROTECT,
        related_name="documents",
        verbose_name="Тип документа",
    )
    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="documents",
        verbose_name="Клиент",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="documents",
        verbose_name="Проект",
    )
    deal = models.ForeignKey(
        "deals.Deal",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="documents",
        verbose_name="Сделка",
    )
    title = models.CharField(max_length=255, verbose_name="Название")
    file = models.FileField(
        upload_to="documents/%Y/%m/", null=True, blank=True, verbose_name="Файл"
    )
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="file")
    external_url = models.URLField(blank=True, verbose_name="Внешняя ссылка")
    file_name = models.CharField(max_length=255, verbose_name="Имя файла")
    mime_type = models.CharField(max_length=100, blank=True, verbose_name="MIME тип")
    file_size = models.IntegerField(default=0, verbose_name="Размер (байт)")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="draft", verbose_name="Статус"
    )
    approval_assignee = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents_to_approve",
        verbose_name="Ответственный за согласование",
    )
    approval_deadline = models.DateField(null=True, blank=True, verbose_name="Срок согласования")
    is_visible_to_client = models.BooleanField(default=False, verbose_name="Доступен клиенту")
    is_protected = models.BooleanField(default=False, verbose_name="Защищён от удаления")
    allowed_roles = models.JSONField(default=list, blank=True, verbose_name="Доступные роли")
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, verbose_name="Загрузил"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")

    class Meta:
        verbose_name = "Документ"
        verbose_name_plural = "Документы"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["client", "document_type"]),
            models.Index(fields=["project"]),
        ]

    def __str__(self):
        return self.title

    @property
    def preview_url(self):
        if self.source == "google_docs" and self.external_url:
            return self.external_url.replace("/edit", "/preview")
        return self.file.url if self.file else ""


class DocumentVersion(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="versions")
    version = models.PositiveIntegerField()
    file = models.FileField(upload_to="documents/versions/%Y/%m/")
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(default=0)
    comment = models.CharField(max_length=500, blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-version"]
        constraints = [
            models.UniqueConstraint(fields=["document", "version"], name="unique_document_version")
        ]


class DocumentComment(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class DocumentActivity(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="activities")
    user = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class DocumentTemplate(models.Model):
    """Templates for document generation."""

    document_type = models.ForeignKey(
        DocumentType,
        on_delete=models.CASCADE,
        related_name="templates",
        verbose_name="Тип документа",
    )
    name = models.CharField(max_length=255, verbose_name="Название")
    content_template = models.JSONField(default=dict, blank=True, verbose_name="Шаблон")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "Шаблон документа"
        verbose_name_plural = "Шаблоны документов"

    def __str__(self):
        return self.name
