import uuid

from django.db import models
from django.db.models import Q

from .conversation import Conversation
from .enums import Channel, Direction, MessageStatus, MessageType


class Message(models.Model):
    """A single message inside a conversation.

    ``external_message_id`` is the provider-side message ID (wamid for
    WhatsApp). It is unique (when present) and is the idempotency key that
    protects the webhook from creating duplicates.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name="Диалог",
    )
    contact = models.ForeignKey(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="messaging_messages",
        verbose_name="Клиент",
    )
    channel = models.CharField(
        max_length=20, choices=Channel.choices, default=Channel.WHATSAPP,
        verbose_name="Канал",
    )
    direction = models.CharField(
        max_length=10, choices=Direction.choices, verbose_name="Направление"
    )
    type = models.CharField(
        max_length=20, choices=MessageType.choices, default=MessageType.TEXT,
        verbose_name="Тип",
    )
    text = models.TextField(blank=True, default="", verbose_name="Текст")
    media_url = models.URLField(max_length=2048, blank=True, verbose_name="URL медиа")
    media_name = models.CharField(max_length=255, blank=True, verbose_name="Имя медиа")
    media_mime = models.CharField(max_length=100, blank=True, verbose_name="MIME")
    external_message_id = models.CharField(
        max_length=255, blank=True, default="", db_index=True,
        verbose_name="ID сообщения (провайдер)",
    )
    status = models.CharField(
        max_length=20,
        choices=MessageStatus.choices,
        default=MessageStatus.PENDING,
        verbose_name="Статус",
    )
    sender = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_messaging_messages",
        verbose_name="Отправитель (сотрудник)",
    )
    error_code = models.CharField(max_length=50, blank=True, default="", verbose_name="Код ошибки")
    error_message = models.TextField(blank=True, default="", verbose_name="Ошибка")
    metadata = models.JSONField(default=dict, blank=True, verbose_name="Метаданные")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")

    class Meta:
        verbose_name = "Сообщение"
        verbose_name_plural = "Сообщения"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["conversation", "created_at"]),
            models.Index(fields=["contact", "created_at"]),
            models.Index(fields=["channel"]),
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["external_message_id"],
                condition=~Q(external_message_id=""),
                name="uniq_external_message_id",
            ),
        ]

    def __str__(self):
        preview = (self.text or self.get_type_display())[:50]
        return f"[{self.get_direction_display()}] {preview}"
