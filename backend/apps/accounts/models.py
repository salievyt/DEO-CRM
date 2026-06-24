import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.accounts.choices import RoleChoices
from common.mixins import TimestampMixin


class Role(models.Model):
    """User roles."""
    name = models.CharField(
        max_length=50, choices=RoleChoices.choices, unique=True,
        verbose_name="Название"
    )
    description = models.TextField(blank=True, verbose_name="Описание")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "Роль"
        verbose_name_plural = "Роли"
        ordering = ["name"]

    def __str__(self):
        return self.get_name_display()


class Permission(models.Model):
    """Individual permissions."""
    codename = models.CharField(
        max_length=100, unique=True, verbose_name="Кодовое имя"
    )
    name = models.CharField(max_length=255, verbose_name="Название")
    description = models.TextField(blank=True, verbose_name="Описание")

    class Meta:
        verbose_name = "Разрешение"
        verbose_name_plural = "Разрешения"
        ordering = ["codename"]

    def __str__(self):
        return self.name


class User(AbstractUser):
    """Custom user model with UUID primary key and role."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, verbose_name="Email")
    phone = models.CharField(max_length=20, blank=True, verbose_name="Телефон")
    avatar = models.URLField(blank=True, verbose_name="Аватар (URL)")
    role = models.ForeignKey(
        Role, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="users", verbose_name="Роль"
    )
    is_2fa_enabled = models.BooleanField(default=False, verbose_name="2FA включен")
    two_factor_secret = models.CharField(
        max_length=255, blank=True, verbose_name="Секрет 2FA"
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"
        ordering = ["-date_joined"]

    def __str__(self):
        full = self.get_full_name()
        return f"{full} ({self.email})" if full else self.email

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = str(uuid.uuid4())[:30]
        super().save(*args, **kwargs)


class RolePermission(models.Model):
    """Many-to-many: Role <-> Permission."""
    role = models.ForeignKey(
        Role, on_delete=models.CASCADE, related_name="role_permissions",
        verbose_name="Роль"
    )
    permission = models.ForeignKey(
        Permission, on_delete=models.CASCADE, verbose_name="Разрешение"
    )

    class Meta:
        unique_together = ("role", "permission")
        verbose_name = "Разрешение роли"
        verbose_name_plural = "Разрешения ролей"

    def __str__(self):
        return f"{self.role} - {self.permission}"


class UserActivityLog(models.Model):
    """Audit log for user actions."""
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="activity_logs",
        verbose_name="Пользователь"
    )
    action = models.CharField(max_length=255, verbose_name="Действие")
    entity_type = models.CharField(max_length=50, verbose_name="Тип сущности")
    entity_id = models.UUIDField(null=True, blank=True, verbose_name="ID сущности")
    details = models.JSONField(default=dict, blank=True, verbose_name="Детали")
    ip_address = models.GenericIPAddressField(
        blank=True, null=True, verbose_name="IP адрес"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "Лог действия"
        verbose_name_plural = "Логи действий"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["entity_type", "entity_id"]),
        ]

    def __str__(self):
        return f"{self.user} - {self.action} - {self.created_at:%d.%m.%Y %H:%M}"
