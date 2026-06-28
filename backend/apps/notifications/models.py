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

    class Urgency(models.TextChoices):
        CRITICAL = "critical", "🔴 Критично"
        IMPORTANT = "important", "🟡 Важно"
        INFO = "info", "🔵 Информация"

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
    urgency = models.CharField(
        max_length=20,
        choices=Urgency.choices,
        default=Urgency.INFO,
        verbose_name="Срочность",
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
    archived = models.BooleanField(default=False, verbose_name="В архиве")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создано")

    class Meta:
        verbose_name = "Уведомление"
        verbose_name_plural = "Уведомления"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["user", "read"]),
            models.Index(fields=["user", "archived"]),
        ]

    def __str__(self):
        urgency_icon = {
            self.Urgency.CRITICAL: "🔴",
            self.Urgency.IMPORTANT: "🟡",
            self.Urgency.INFO: "🔵",
        }.get(self.urgency, "")
        return f"{urgency_icon} {self.get_type_display()}: {self.title}"


class NotificationPreference(models.Model):
    """Per-user notification preferences."""

    class DigestFrequency(models.TextChoices):
        NEVER = "never", "Никогда"
        DAILY = "daily", "Раз в день"
        WEEKLY = "weekly", "Раз в неделю"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_prefs",
        verbose_name="Пользователь",
    )

    # Channel toggles (matching Notification.Types)
    task_assigned = models.BooleanField(default=True, verbose_name="Новые задачи")
    comment_added = models.BooleanField(default=True, verbose_name="Комментарии")
    project_updated = models.BooleanField(default=True, verbose_name="Изменения проектов")
    deadline_reminder = models.BooleanField(default=True, verbose_name="Дедлайны")
    message_received = models.BooleanField(default=True, verbose_name="Новые сообщения")

    # Quiet Hours
    quiet_hours_enabled = models.BooleanField(default=False, verbose_name="Тихие часы")
    quiet_hours_start = models.TimeField(
        null=True, blank=True, verbose_name="Начало тихих часов"
    )
    quiet_hours_end = models.TimeField(
        null=True, blank=True, verbose_name="Конец тихих часов"
    )

    # Digest
    digest_enabled = models.BooleanField(default=False, verbose_name="Дайджест")
    digest_frequency = models.CharField(
        max_length=10,
        choices=DigestFrequency.choices,
        default=DigestFrequency.NEVER,
        verbose_name="Частота дайджеста",
    )

    # Auto-Archive
    auto_archive_read_days = models.IntegerField(
        default=7,
        verbose_name="Архивировать прочитанные через (дней)",
        help_text="0 = не архивировать автоматически",
    )
    auto_archive_unread_days = models.IntegerField(
        default=30,
        verbose_name="Архивировать непрочитанные через (дней)",
        help_text="0 = не архивировать автоматически",
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создано")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлено")

    class Meta:
        verbose_name = "Настройки уведомлений"
        verbose_name_plural = "Настройки уведомлений"

    def __str__(self):
        return f"Настройки уведомлений: {self.user}"

    def is_in_quiet_hours(self) -> bool:
        """Check if current time falls within quiet hours."""
        from django.utils import timezone

        if not self.quiet_hours_enabled or not self.quiet_hours_start or not self.quiet_hours_end:
            return False

        now = timezone.localtime().time()
        if self.quiet_hours_start <= self.quiet_hours_end:
            return self.quiet_hours_start <= now <= self.quiet_hours_end
        else:
            # Overnight quiet hours (e.g., 22:00 - 08:00)
            return now >= self.quiet_hours_start or now <= self.quiet_hours_end

    def should_suppress(self, notification_type: str, urgency: str) -> bool:
        """Check if notification should be suppressed based on prefs."""
        # Check channel toggle
        channel_map = {
            "task_assigned": self.task_assigned,
            "task_updated": self.task_assigned,
            "comment_added": self.comment_added,
            "project_updated": self.project_updated,
            "deadline_reminder": self.deadline_reminder,
            "message_received": self.message_received,
            "team_change": self.project_updated,
        }
        if not channel_map.get(notification_type, True):
            return True

        # Quiet hours — only suppress non-critical notifications
        if self.is_in_quiet_hours() and urgency != Notification.Urgency.CRITICAL:
            return True

        return False

    @classmethod
    def get_or_create_for_user(cls, user):
        """Get or create preferences for a user."""
        prefs, _ = cls.objects.get_or_create(user=user)
        return prefs
