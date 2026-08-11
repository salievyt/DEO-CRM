import uuid

from django.conf import settings
from django.core import signing
from django.db import models

from .enums import (
    CallDirection,
    CallRecordStatus,
    CallRecordType,
    PBXConnectionStatus,
    PBXProvider,
)


class PBXConnection(models.Model):
    """A connected PBX (АТС) that feeds the CRM with call records (CDR).

    Credentials (API key, AMI password) are encrypted at rest with ``signing``
    using the project ``SECRET_KEY`` and are never exposed through the API.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Название")
    provider = models.CharField(
        max_length=32, choices=PBXProvider.choices, default=PBXProvider.OTHER,
        verbose_name="Провайдер",
    )
    api_url = models.URLField(max_length=512, blank=True, default="",
                              verbose_name="URL API АТС")
    api_key_encrypted = models.TextField(
        blank=True, default="", verbose_name="API ключ (зашифрован)"
    )
    ami_host = models.CharField(max_length=255, blank=True, default="",
                                verbose_name="AMI хост")
    ami_port = models.PositiveIntegerField(default=5038, verbose_name="AMI порт")
    ami_user = models.CharField(max_length=64, blank=True, default="",
                                verbose_name="AMI пользователь")
    ami_password_encrypted = models.TextField(
        blank=True, default="", verbose_name="AMI пароль (зашифрован)"
    )
    ws_url = models.URLField(max_length=512, blank=True, default="",
                             verbose_name="WebSocket URL (WSS)")
    sip_domain = models.CharField(max_length=255, blank=True, default="",
                                  verbose_name="SIP домен")
    status = models.CharField(
        max_length=32,
        choices=PBXConnectionStatus.choices,
        default=PBXConnectionStatus.DISABLED,
        verbose_name="Статус",
    )
    is_default = models.BooleanField(
        default=False, verbose_name="Использовать по умолчанию"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создано")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлено")

    class Meta:
        verbose_name = "Подключение АТС"
        verbose_name_plural = "Подключения АТС"
        ordering = ["-is_default", "-created_at"]

    def __str__(self):
        return self.name or self.api_url or f"АТС {self.pk}"

    # ------------------------------------------------------------ credentials
    @property
    def api_key(self) -> str:
        return self._decrypt("messaging.calls.api_key", self.api_key_encrypted)

    def set_api_key(self, value: str):
        self.api_key_encrypted = self._encrypt("messaging.calls.api_key", value)

    @property
    def ami_password(self) -> str:
        return self._decrypt("messaging.calls.ami_password", self.ami_password_encrypted)

    def set_ami_password(self, value: str):
        self.ami_password_encrypted = self._encrypt("messaging.calls.ami_password", value)

    @staticmethod
    def _encrypt(salt: str, value: str) -> str:
        if not value:
            return ""
        return signing.dumps(value, salt=salt)

    @staticmethod
    def _decrypt(salt: str, encrypted: str) -> str:
        if not encrypted:
            return ""
        try:
            return signing.loads(encrypted, salt=salt)
        except signing.BadSignature:
            return ""

    # ------------------------------------------------------------- lifecycle
    def save(self, *args, **kwargs):
        if self.is_default:
            PBXConnection.objects.filter(is_default=True).exclude(
                pk=self.pk
            ).update(is_default=False)
        super().save(*args, **kwargs)

    @classmethod
    def get_default(cls, active_only=True):
        qs = cls.objects.all()
        if active_only:
            qs = qs.filter(status=PBXConnectionStatus.CONNECTED)
        return qs.order_by("-is_default", "-created_at").first()


class SipAccount(models.Model):
    """A quick SIP registration (внутренний номер + пароль) for a user/phone."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    connection = models.ForeignKey(
        PBXConnection, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="sip_accounts", verbose_name="Подключение АТС",
    )
    extension = models.CharField(max_length=32, verbose_name="Внутренний номер")
    password_encrypted = models.TextField(
        blank=True, default="", verbose_name="Пароль (зашифрован)"
    )
    name = models.CharField(max_length=255, blank=True, default="",
                            verbose_name="Имя")
    user = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="sip_accounts", verbose_name="Сотрудник",
    )
    is_active = models.BooleanField(default=True, verbose_name="Активен")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "SIP аккаунт"
        verbose_name_plural = "SIP аккаунты"
        ordering = ["extension"]

    def __str__(self):
        return f"{self.extension} — {self.name or 'без имени'}"

    @property
    def password(self) -> str:
        if not self.password_encrypted:
            return ""
        try:
            return signing.loads(
                self.password_encrypted, salt="messaging.calls.sip_password"
            )
        except signing.BadSignature:
            return ""

    def set_password(self, value: str):
        if value:
            self.password_encrypted = signing.dumps(
                value, salt="messaging.calls.sip_password"
            )
        else:
            self.password_encrypted = ""


class CallRecord(models.Model):
    """A single call from the PBX CDR (call log)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    connection = models.ForeignKey(
        PBXConnection, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="call_records", verbose_name="Подключение АТС",
    )
    external_call_id = models.CharField(
        max_length=128, blank=True, default="", db_index=True,
        verbose_name="ID звонка (АТС)",
    )
    direction = models.CharField(
        max_length=16, choices=CallDirection.choices,
        default=CallDirection.INCOMING, verbose_name="Направление",
    )
    status = models.CharField(
        max_length=16, choices=CallRecordStatus.choices,
        default=CallRecordStatus.ANSWERED, verbose_name="Статус",
    )
    call_type = models.CharField(
        max_length=16, choices=CallRecordType.choices,
        default=CallRecordType.EXTERNAL, verbose_name="Тип",
    )
    phone_number = models.CharField(max_length=32, blank=True, default="",
                                    verbose_name="Номер")
    client = models.ForeignKey(
        "clients.Client", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="call_records", verbose_name="Клиент",
    )
    employee = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="call_records", verbose_name="Сотрудник",
    )
    duration_seconds = models.PositiveIntegerField(
        default=0, verbose_name="Длительность (сек)"
    )
    started_at = models.DateTimeField(null=True, blank=True, verbose_name="Начало")
    ended_at = models.DateTimeField(null=True, blank=True, verbose_name="Конец")
    metadata = models.JSONField(default=dict, blank=True, verbose_name="Метаданные")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создано")

    class Meta:
        verbose_name = "Звонок"
        verbose_name_plural = "Звонки"
        ordering = ["-started_at", "-created_at"]
        indexes = [
            models.Index(fields=["direction", "status"]),
            models.Index(fields=["-started_at"]),
            models.Index(fields=["phone_number"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["connection", "external_call_id"],
                condition=models.Q(external_call_id__gt=""),
                name="uniq_connection_external_call",
            ),
        ]

    def __str__(self):
        return f"{self.get_direction_display()} {self.phone_number} ({self.duration_seconds}с)"
