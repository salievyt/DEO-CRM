import uuid

from django.conf import settings
from django.db import models


class Notification(models.Model):
    """System notification for a user."""

    class Types(models.TextChoices):
        TASK_ASSIGNED = "task_assigned", "Назначена задача"
        TASK_UPDATED = "task_updated", "Задача обновлена"
        PROJECT_UPDATED = "project_updated", "Проект обновлён"
        DEADLINE_REMINDER = "deadline_reminder", "Напоминание о дедлайне"
        MESSAGE_RECEIVED = "message_received", "Новое сообщение"
        COMMENT_ADDED = "comment_added", "Новый комментарий"
        TEAM_CHANGE = "team_change", "Изменение в команде"
        SYSTEM = "system", "Системное"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name="Пользователь",
    )
    type = models.CharField(
        max_length=50,
        choices=Types.choices,
        default=Types.SYSTEM,
        verbose_name="Тип",
    )
    title = models.CharField(max_length=255, verbose_name="Заголовок")
    message = models.TextField(blank=True, verbose_name="Сообщение")
    related_project_id = models.UUIDField(
        null=True, blank=True, verbose_name="ID проекта"
    )
    related_task_id = models.UUIDField(
        null=True, blank=True, verbose_name="ID задачи"
    )
    read = models.BooleanField(default=False, verbose_name="Прочитано")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создано")

    class Meta:
        verbose_name = "Уведомление"
        verbose_name_plural = "Уведомления"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["user", "read"]),
        ]

    def __str__(self):
        return f"{self.get_type_display()}: {self.title}"
