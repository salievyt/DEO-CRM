import uuid

from django.db import models
from django.db.models import Q

from .account import WhatsAppAccount
from .enums import Channel, ConversationStatus
from .telegram import TelegramAccount


class Conversation(models.Model):
    """A chat thread between a client (contact) and the studio on one channel.

    One client may have several conversations across channels (and even across
    WhatsApp business numbers), hence the unique constraint includes the
    channel and (for WhatsApp) the business account.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contact = models.ForeignKey(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="messaging_conversations",
        verbose_name="Клиент",
    )
    channel = models.CharField(
        max_length=20, choices=Channel.choices, default=Channel.WHATSAPP,
        verbose_name="Канал",
    )
    whatsapp_account = models.ForeignKey(
        WhatsAppAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conversations",
        verbose_name="WhatsApp аккаунт",
    )
    telegram_account = models.ForeignKey(
        TelegramAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conversations",
        verbose_name="Telegram бот",
    )
    telegram_chat_id = models.CharField(
        max_length=100, blank=True, default="", verbose_name="Telegram chat_id"
    )
    assigned_user = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="messaging_conversations",
        verbose_name="Ответственный менеджер",
    )
    status = models.CharField(
        max_length=20,
        choices=ConversationStatus.choices,
        default=ConversationStatus.OPEN,
        verbose_name="Статус",
    )
    # WhatsApp 24h customer-service window heuristic: the window is open while
    # the customer's last message is younger than 24 hours.
    last_customer_message_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Последнее сообщение клиента"
    )
    last_message_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Последнее сообщение"
    )
    last_message_preview = models.CharField(
        max_length=255, blank=True, default="", verbose_name="Превью последнего"
    )
    unread_count = models.IntegerField(default=0, verbose_name="Непрочитанные")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")

    class Meta:
        verbose_name = "Диалог"
        verbose_name_plural = "Диалоги"
        ordering = ["-last_message_at", "-created_at"]
        indexes = [
            models.Index(fields=["contact", "channel"]),
            models.Index(fields=["assigned_user", "status"]),
            models.Index(fields=["channel", "status"]),
            models.Index(fields=["-last_message_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["contact", "channel", "whatsapp_account"],
                condition=Q(whatsapp_account__isnull=False, telegram_account__isnull=True),
                name="uniq_contact_channel_account",
            ),
            models.UniqueConstraint(
                fields=["contact", "channel", "telegram_account"],
                condition=Q(telegram_account__isnull=False, whatsapp_account__isnull=True),
                name="uniq_contact_channel_telegram_account",
            ),
            models.UniqueConstraint(
                fields=["contact", "channel"],
                condition=Q(whatsapp_account__isnull=True, telegram_account__isnull=True),
                name="uniq_contact_channel_no_account",
            ),
        ]

    def __str__(self):
        return f"{self.contact} ({self.get_channel_display()})"

    # ------------------------------------------------------------- helpers
    def conversation_window_open(self) -> bool:
        """24h customer-service window heuristic for WhatsApp."""
        if self.channel != Channel.WHATSAPP:
            return True
        if not self.last_customer_message_at:
            return False
        from django.utils import timezone

        return timezone.now() - self.last_customer_message_at <= timezone.timedelta(
            hours=24
        )
