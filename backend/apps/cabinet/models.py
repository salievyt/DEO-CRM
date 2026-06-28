import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class ProjectMilestone(models.Model):
    """Project milestone for approval flow."""

    class Status(models.TextChoices):
        PENDING = "pending", "Ожидает согласования"
        APPROVED = "approved", "Согласован"
        REJECTED = "rejected", "Отклонен"
        IN_PROGRESS = "in_progress", "В работе"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="milestones",
        verbose_name="Проект",
    )
    name = models.CharField(max_length=255, verbose_name="Название этапа")
    description = models.TextField(blank=True, verbose_name="Описание")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.IN_PROGRESS,
        verbose_name="Статус",
    )
    order = models.IntegerField(default=0, verbose_name="Порядок")
    due_date = models.DateField(null=True, blank=True, verbose_name="Срок")
    completed_date = models.DateField(
        null=True, blank=True, verbose_name="Дата завершения"
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_milestones",
        verbose_name="Согласовал",
    )
    approved_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Согласовано"
    )
    rejection_reason = models.TextField(
        blank=True, verbose_name="Причина отклонения"
    )
    deliverable_url = models.URLField(
        blank=True, verbose_name="URL результата"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")

    class Meta:
        verbose_name = "Этап проекта"
        verbose_name_plural = "Этапы проекта"
        ordering = ["order", "created_at"]

    def __str__(self):
        return f"{self.project.name} - {self.name}"


class ProjectShareLink(models.Model):
    """Shareable link for project status (public, no auth required)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="share_links",
        verbose_name="Проект",
    )
    token = models.CharField(
        max_length=64, unique=True, verbose_name="Токен",
        default=uuid.uuid4,
    )
    is_active = models.BooleanField(default=True, verbose_name="Активен")
    expires_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Истекает"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_share_links",
        verbose_name="Создал",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "Ссылка для шаринга"
        verbose_name_plural = "Ссылки для шаринга"

    def __str__(self):
        return f"{self.project.name} - {self.token[:8]}..."

    def is_valid(self):
        if not self.is_active:
            return False
        if self.expires_at and timezone.now() > self.expires_at:
            return False
        return True


class ClientFeedback(models.Model):
    """Client feedback on project deliverable."""

    class FeedbackType(models.TextChoices):
        GENERAL = "general", "Общий отзыв"
        APPROVAL = "approval", "Согласование"
        REVISION = "revision", "Правки"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="feedback",
        verbose_name="Проект",
    )
    milestone = models.ForeignKey(
        ProjectMilestone,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feedback",
        verbose_name="Этап",
    )
    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="feedback",
        verbose_name="Клиент",
    )
    feedback_type = models.CharField(
        max_length=20,
        choices=FeedbackType.choices,
        default=FeedbackType.GENERAL,
        verbose_name="Тип отзыва",
    )
    content = models.TextField(verbose_name="Содержание")
    rating = models.IntegerField(
        null=True, blank=True, verbose_name="Оценка (1-5)"
    )
    attachment_url = models.URLField(
        blank=True, verbose_name="URL вложения"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "Отзыв клиента"
        verbose_name_plural = "Отзывы клиентов"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.client} - {self.project.name}"
