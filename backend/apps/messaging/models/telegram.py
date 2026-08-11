import uuid

from django.core import signing
from django.db import models

from .enums import TelegramAccountStatus


class TelegramAccount(models.Model):
    """A connected Telegram bot (created via @BotFather, linked by token).

    The bot token is encrypted at rest with ``signing`` using the project
    ``SECRET_KEY``. It is **never** exposed through the API. ``webhook_secret``
    is a per-bot random value used to authenticate incoming webhook updates
    via the ``X-Telegram-Bot-Api-Secret-Token`` header.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Название")
    bot_token_encrypted = models.TextField(
        blank=True, default="", verbose_name="Bot token (зашифрован)"
    )
    bot_username = models.CharField(
        max_length=64, blank=True, default="", verbose_name="Username бота",
        db_index=True,
    )
    bot_name = models.CharField(
        max_length=255, blank=True, default="", verbose_name="Имя бота"
    )
    webhook_secret = models.CharField(
        max_length=64, blank=True, default="", verbose_name="Webhook secret token"
    )
    status = models.CharField(
        max_length=32,
        choices=TelegramAccountStatus.choices,
        default=TelegramAccountStatus.ACTIVE,
        verbose_name="Статус",
    )
    is_default = models.BooleanField(
        default=False, verbose_name="Использовать по умолчанию"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")

    class Meta:
        verbose_name = "Telegram бот"
        verbose_name_plural = "Telegram боты"
        ordering = ["-is_default", "-created_at"]

    def __str__(self):
        return self.name or self.bot_username or f"Бот {self.pk}"

    # ------------------------------------------------------------------ token
    @property
    def bot_token(self) -> str:
        """Decrypted bot token."""
        if not self.bot_token_encrypted:
            return ""
        try:
            return signing.loads(
                self.bot_token_encrypted,
                salt="messaging.telegram.bot_token",
            )
        except signing.BadSignature:
            return ""

    def set_bot_token(self, value: str):
        if value:
            self.bot_token_encrypted = signing.dumps(
                value, salt="messaging.telegram.bot_token"
            )
        else:
            self.bot_token_encrypted = ""

    # ------------------------------------------------------------- lifecycle
    def save(self, *args, **kwargs):
        if self.is_default:
            TelegramAccount.objects.filter(is_default=True).exclude(
                pk=self.pk
            ).update(is_default=False)
        super().save(*args, **kwargs)

    @classmethod
    def get_default(cls, active_only=True):
        qs = cls.objects.all()
        if active_only:
            qs = qs.filter(status=TelegramAccountStatus.ACTIVE)
        return qs.order_by("-is_default", "-created_at").first()
