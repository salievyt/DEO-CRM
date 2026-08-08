import uuid

from django.conf import settings
from django.core import signing
from django.db import models

from .enums import WhatsAppAccountStatus


class WhatsAppAccount(models.Model):
    """A connected WhatsApp Business account (WABA + phone number).

    The Graph API access token is encrypted at rest with ``signing`` using the
    project ``SECRET_KEY``. It is **never** exposed through the API.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Название")
    business_account_id = models.CharField(
        max_length=64, verbose_name="Business Account ID (WABA)"
    )
    phone_number_id = models.CharField(max_length=64, verbose_name="Phone Number ID")
    display_phone_number = models.CharField(
        max_length=32, verbose_name="Номер телефона"
    )
    access_token_encrypted = models.TextField(
        blank=True, default="", verbose_name="Access token (зашифрован)"
    )
    webhook_verify_token = models.CharField(
        max_length=255, blank=True, default="", verbose_name="Webhook verify token"
    )
    status = models.CharField(
        max_length=32,
        choices=WhatsAppAccountStatus.choices,
        default=WhatsAppAccountStatus.ACTIVE,
        verbose_name="Статус",
    )
    is_default = models.BooleanField(
        default=False, verbose_name="Использовать по умолчанию"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")

    class Meta:
        verbose_name = "WhatsApp аккаунт"
        verbose_name_plural = "WhatsApp аккаунты"
        ordering = ["-is_default", "-created_at"]

    def __str__(self):
        return self.name or self.display_phone_number

    # ------------------------------------------------------------------ token
    @property
    def access_token(self) -> str:
        """Decrypted access token; falls back to the env var for the default account."""
        if self.access_token_encrypted:
            try:
                return signing.loads(
                    self.access_token_encrypted,
                    salt="messaging.whatsapp.access_token",
                )
            except signing.BadSignature:
                return ""
        if settings.WHATSAPP_ACCESS_TOKEN:
            return settings.WHATSAPP_ACCESS_TOKEN
        return ""

    def set_access_token(self, value: str):
        if value:
            self.access_token_encrypted = signing.dumps(
                value, salt="messaging.whatsapp.access_token"
            )
        else:
            self.access_token_encrypted = ""

    # ------------------------------------------------------------- lifecycle
    def save(self, *args, **kwargs):
        if self.is_default:
            WhatsAppAccount.objects.filter(is_default=True).exclude(
                pk=self.pk
            ).update(is_default=False)
        super().save(*args, **kwargs)

    @classmethod
    def get_default(cls, active_only=True):
        qs = cls.objects.all()
        if active_only:
            qs = qs.filter(status=WhatsAppAccountStatus.ACTIVE)
        return qs.order_by("-is_default", "-created_at").first()

    @classmethod
    def from_env(cls) -> "WhatsAppAccount | None":
        """Unsaved account built from environment variables (fallback when no
        DB row matches the webhook's phone number)."""
        if not settings.WHATSAPP_ACCESS_TOKEN:
            return None
        account = cls(
            name="Default (env)",
            business_account_id=settings.WHATSAPP_BUSINESS_ACCOUNT_ID,
            phone_number_id=settings.WHATSAPP_PHONE_NUMBER_ID,
            display_phone_number=settings.WHATSAPP_PHONE_NUMBER_ID,
            webhook_verify_token=settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
            status=WhatsAppAccountStatus.ACTIVE,
            is_default=True,
        )
        return account
