import uuid

from django.conf import settings
from django.db import models


class ReminderRuleType(models.TextChoices):
    CLIENT_NO_RESPONSE = "client_no_response", "Клиент не отвечает"
    DEAL_STAGE_TIMEOUT = "deal_stage_timeout", "Сделка долго на этапе"
    TASK_OVERDUE = "task_overdue", "Просроченная задача"
    TASK_DEADLINE_SOON = "task_deadline_soon", "Близкий дедлайн задачи"
    DEAL_NO_NEXT_ACTION = "deal_no_next_action", "Нет следующего действия по сделке"
    LEAD_UNPROCESSED = "lead_unprocessed", "Лид не обработан"
    CLIENT_NO_CONTACT = "client_no_contact", "Клиент давно не контактировал"
    DEAL_NO_CHANGES = "deal_no_changes", "Сделка без изменений"
    CLIENT_OPEN_DEALS_NO_CONTACT = "client_open_deals_no_contact", "Клиент с открытыми сделками без контакта"
    FINANCE_DEADLINE_SOON = "finance_deadline_soon", "Дедлайн счёта близко"


class ReminderPriority(models.TextChoices):
    LOW = "low", "Низкий"
    MEDIUM = "medium", "Средний"
    HIGH = "high", "Высокий"
    CRITICAL = "critical", "Критический"


class ReminderStatus(models.TextChoices):
    PENDING = "pending", "Ожидает"
    VIEWED = "viewed", "Просмотрено"
    COMPLETED = "completed", "Выполнено"
    DISMISSED = "dismissed", "Отклонено"
    EXPIRED = "expired", "Истекло"


class ReminderRule(models.Model):
    """Business rule that produces reminders for managers.

    Each rule describes a CRM condition (rule type) plus configuration
    stored in ``conditions`` (JSON). Rules are evaluated asynchronously by
    the Celery beat task ``apps.reminders.tasks.process_reminders``.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Название")
    type = models.CharField(
        max_length=60,
        choices=ReminderRuleType.choices,
        verbose_name="Тип правила",
    )
    enabled = models.BooleanField(default=True, verbose_name="Включено")
    conditions = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Условия",
        help_text="Конфигурация правила, например {\"days\": 3}",
    )
    priority = models.CharField(
        max_length=20,
        choices=ReminderPriority.choices,
        default=ReminderPriority.MEDIUM,
        verbose_name="Приоритет",
    )
    target_roles = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Целевые роли",
        help_text="Роли пользователей, которым создаются напоминания. Пусто — все роли.",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создано")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлено")

    class Meta:
        verbose_name = "Правило напоминания"
        verbose_name_plural = "Правила напоминаний"
        ordering = ["type", "name"]
        indexes = [
            models.Index(fields=["type", "enabled"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"

    @property
    def default_priority(self):
        """Fallback priority if the rule priority is not set explicitly."""
        if self.priority:
            return self.priority
        from .services import DEFAULT_PRIORITIES

        return DEFAULT_PRIORITIES.get(self.type, ReminderPriority.MEDIUM)


class Reminder(models.Model):
    """A single actionable reminder shown in the Notification Center."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reminders",
        verbose_name="Пользователь",
    )
    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reminders",
        verbose_name="Клиент",
    )
    deal = models.ForeignKey(
        "leads.Lead",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reminders",
        verbose_name="Сделка",
    )
    task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reminders",
        verbose_name="Задача",
    )
    invoice = models.ForeignKey(
        "finance.Invoice",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reminders",
        verbose_name="Счёт",
    )
    rule = models.ForeignKey(
        ReminderRule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reminders",
        verbose_name="Правило",
    )
    title = models.CharField(max_length=255, verbose_name="Заголовок")
    description = models.TextField(blank=True, verbose_name="Описание")
    priority = models.CharField(
        max_length=20,
        choices=ReminderPriority.choices,
        default=ReminderPriority.MEDIUM,
        verbose_name="Приоритет",
    )
    status = models.CharField(
        max_length=20,
        choices=ReminderStatus.choices,
        default=ReminderStatus.PENDING,
        verbose_name="Статус",
    )
    due_at = models.DateTimeField(verbose_name="Когда")
    snoozed_until = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Отложено до",
    )
    dedup_key = models.CharField(
        max_length=255,
        blank=True,
        default="",
        db_index=True,
        verbose_name="Ключ дедупликации",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создано")
    dismissed_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Отклонено в"
    )
    completed_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Выполнено в"
    )

    class Meta:
        verbose_name = "Напоминание"
        verbose_name_plural = "Напоминания"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status", "due_at"]),
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["dedup_key"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"


class ReminderLog(models.Model):
    """Audit log of reminder lifecycle events."""

    class Actions(models.TextChoices):
        CREATED = "created", "Создано"
        VIEWED = "viewed", "Просмотрено"
        COMPLETED = "completed", "Выполнено"
        DISMISSED = "dismissed", "Отклонено"
        SNOOZED = "snoozed", "Отложено"
        EXPIRED = "expired", "Истекло"
        SYSTEM = "system", "Система"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reminder = models.ForeignKey(
        Reminder,
        on_delete=models.CASCADE,
        related_name="logs",
        verbose_name="Напоминание",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reminder_logs",
        verbose_name="Кто выполнил",
    )
    action = models.CharField(
        max_length=20,
        choices=Actions.choices,
        verbose_name="Действие",
    )
    details = models.JSONField(default=dict, blank=True, verbose_name="Детали")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создано")

    class Meta:
        verbose_name = "Журнал напоминания"
        verbose_name_plural = "Журналы напоминаний"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["reminder", "-created_at"]),
            models.Index(fields=["actor", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.get_action_display()} — {self.reminder.title}"
