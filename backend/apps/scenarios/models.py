"""Automation scenarios: keyword-based auto-responders for messaging channels."""

import uuid

from django.conf import settings
from django.db import models


class Channel(models.TextChoices):
    """Channels a scenario may listen on (``all`` = every channel)."""

    ALL = "all", "Все каналы"
    WHATSAPP = "whatsapp", "WhatsApp"
    TELEGRAM = "telegram", "Telegram"
    EMAIL = "email", "Email"


class MatchMode(models.TextChoices):
    """How keywords are matched against an incoming message."""

    ANY = "any", "Любое из слов"
    ALL = "all", "Все слова"


class EventType(models.TextChoices):
    """CRM events a scenario may react to (not only inbound messages)."""

    MESSAGE = "message", "Входящее сообщение"
    LEAD_CREATED = "lead_created", "Лид создан"
    DEAL_WON = "deal_won", "Сделка выиграна"
    INVOICE_UNPAID = "invoice_unpaid", "Счёт не оплачен"
    PROJECT_CREATED = "project_created", "Проект создан"


class ActionType(models.TextChoices):
    """What the engine does when a scenario fires."""

    REPLY = "reply", "Ответить клиенту"
    CREATE_TASK = "create_task", "Создать задачу"
    CREATE_REMINDER = "create_reminder", "Создать напоминание"
    CREATE_PROJECT_DEMO = "create_project_demo", "Создать проект и демо-доступ"


class TriggerStatus(models.TextChoices):
    """Outcome of a scenario auto-response attempt."""

    RESPONDED = "responded", "Отправлен"
    FAILED = "failed", "Ошибка"
    SKIPPED = "skipped", "Пропущен"


class Scenario(models.Model):
    """An automation rule reacting to a CRM event.

    Message scenarios match ``keywords`` on an inbound message (channel,
    ``match_mode``, ``reply_text``, cooldown). Event scenarios react to CRM
    events such as a created lead or a won deal and run a business action
    (:attr:`action_type`) configured via :attr:`action_config`.

    Scenarios with the same priority are ordered by creation time; the first
    matching active scenario wins.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150, verbose_name="Название")
    description = models.TextField(blank=True, default="", verbose_name="Описание")
    event_type = models.CharField(
        max_length=30,
        choices=EventType.choices,
        default=EventType.MESSAGE,
        verbose_name="Событие",
    )
    action_type = models.CharField(
        max_length=30,
        choices=ActionType.choices,
        default=ActionType.REPLY,
        verbose_name="Действие",
    )
    action_config = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Конфигурация действия",
        help_text="Параметры действия, например {\"days\": 3} для неоплаченных счетов",
    )
    channel = models.CharField(
        max_length=20,
        choices=Channel.choices,
        default=Channel.ALL,
        verbose_name="Канал",
    )
    match_mode = models.CharField(
        max_length=10,
        choices=MatchMode.choices,
        default=MatchMode.ANY,
        verbose_name="Условие совпадения",
    )
    keywords = models.JSONField(default=list, verbose_name="Ключевые слова")
    reply_text = models.TextField(blank=True, default="", verbose_name="Ответ клиенту")
    cooldown_minutes = models.PositiveIntegerField(
        default=0, verbose_name="Пауза между ответами (мин)"
    )
    priority = models.PositiveIntegerField(default=0, verbose_name="Приоритет (меньше — раньше)")
    is_active = models.BooleanField(default=True, verbose_name="Активен")
    trigger_count = models.PositiveIntegerField(default=0, verbose_name="Срабатываний")
    last_triggered_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Последнее срабатывание"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_scenarios",
        verbose_name="Создал",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")

    class Meta:
        verbose_name = "Сценарий"
        verbose_name_plural = "Сценарии"
        ordering = ["priority", "created_at"]
        indexes = [
            models.Index(fields=["is_active", "channel"]),
        ]

    def __str__(self):
        return self.name


class ScenarioTrigger(models.Model):
    """One trigger attempt: which event fired which scenario and why.

    Message scenarios also reference the conversation/message; event-driven
    scenarios instead carry an entity (lead, deal, invoice...) via
    ``entity_type`` / ``entity_id`` / ``entity_label``.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scenario = models.ForeignKey(
        Scenario,
        on_delete=models.CASCADE,
        related_name="triggers",
        verbose_name="Сценарий",
    )
    event_type = models.CharField(
        max_length=30, blank=True, default="", verbose_name="Событие"
    )
    entity_type = models.CharField(
        max_length=30, blank=True, default="", verbose_name="Тип сущности"
    )
    entity_id = models.UUIDField(null=True, blank=True, verbose_name="ID сущности")
    entity_label = models.CharField(
        max_length=255, blank=True, default="", verbose_name="Сущность"
    )
    conversation = models.ForeignKey(
        "messaging.Conversation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="scenario_triggers",
        verbose_name="Диалог",
    )
    message = models.ForeignKey(
        "messaging.Message",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="scenario_triggers",
        verbose_name="Входящее сообщение",
    )
    reply_message = models.ForeignKey(
        "messaging.Message",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="scenario_replies",
        verbose_name="Ответ",
    )
    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="scenario_triggers",
        verbose_name="Клиент",
    )
    matched_keyword = models.CharField(
        max_length=255, blank=True, default="", verbose_name="Совпавшее слово"
    )
    status = models.CharField(
        max_length=20,
        choices=TriggerStatus.choices,
        default=TriggerStatus.RESPONDED,
        verbose_name="Статус",
    )
    error_message = models.TextField(blank=True, default="", verbose_name="Ошибка")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "Срабатывание сценария"
        verbose_name_plural = "Срабатывания сценариев"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["scenario", "created_at"]),
            models.Index(fields=["conversation", "created_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.scenario} → {self.get_status_display()}"
