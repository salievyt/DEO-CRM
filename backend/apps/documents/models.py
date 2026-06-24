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
        ("final", "Готов"),
        ("archived", "Архив"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document_type = models.ForeignKey(
        DocumentType, on_delete=models.PROTECT, related_name="documents",
        verbose_name="Тип документа"
    )
    client = models.ForeignKey(
        "clients.Client", on_delete=models.CASCADE, null=True, blank=True,
        related_name="documents", verbose_name="Клиент"
    )
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, null=True, blank=True,
        related_name="documents", verbose_name="Проект"
    )
    title = models.CharField(max_length=255, verbose_name="Название")
    file = models.FileField(
        upload_to="documents/%Y/%m/", verbose_name="Файл"
    )
    file_name = models.CharField(max_length=255, verbose_name="Имя файла")
    mime_type = models.CharField(max_length=100, blank=True, verbose_name="MIME тип")
    file_size = models.IntegerField(default=0, verbose_name="Размер (байт)")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="draft",
        verbose_name="Статус"
    )
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True,
        verbose_name="Загрузил"
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


class DocumentTemplate(models.Model):
    """Templates for document generation."""
    document_type = models.ForeignKey(
        DocumentType, on_delete=models.CASCADE, related_name="templates",
        verbose_name="Тип документа"
    )
    name = models.CharField(max_length=255, verbose_name="Название")
    content_template = models.JSONField(
        default=dict, blank=True, verbose_name="Шаблон"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "Шаблон документа"
        verbose_name_plural = "Шаблоны документов"

    def __str__(self):
        return self.name
