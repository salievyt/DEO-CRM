"""Forms: shareable links for filling in questionnaires.

A :class:`FormTemplate` defines the structure of a questionnaire (client,
employee, other); a :class:`FormInvitation` is a single generated link that
can be opened and filled out without authentication.
"""

import uuid

from django.conf import settings
from django.db import models


class FormTemplate(models.Model):
    """A questionnaire definition with a JSON ``fields`` schema."""

    class EntityType(models.TextChoices):
        CLIENT = "client", "Анкета клиента"
        EMPLOYEE = "employee", "Анкета сотрудника"
        OTHER = "other", "Другое"

    # Supported field types for the JSON schema.
    FIELD_TYPES = ("text", "email", "phone", "textarea", "select")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, verbose_name="Название")
    description = models.TextField(blank=True, default="", verbose_name="Описание")
    entity_type = models.CharField(
        max_length=20,
        choices=EntityType.choices,
        default=EntityType.CLIENT,
        verbose_name="Тип анкеты",
    )
    form_fields = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Поля",
        help_text='Список полей: {"key","label","type","required","options"}',
    )
    is_active = models.BooleanField(default=True, verbose_name="Активна")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_form_templates",
        verbose_name="Создал",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создана")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлена")

    class Meta:
        verbose_name = "Шаблон анкеты"
        verbose_name_plural = "Шаблоны анкет"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class FormInvitation(models.Model):
    """One generated link (token) for filling in a form."""

    class Status(models.TextChoices):
        SENT = "sent", "Отправлена"
        FILLED = "filled", "Заполнена"
        EXPIRED = "expired", "Истекла"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token = models.UUIDField(
        default=uuid.uuid4, unique=True, editable=False, verbose_name="Токен"
    )
    form = models.ForeignKey(
        FormTemplate,
        on_delete=models.CASCADE,
        related_name="invitations",
        verbose_name="Анкета",
    )
    recipient_name = models.CharField(
        max_length=255, blank=True, default="", verbose_name="Имя получателя"
    )
    recipient_email = models.EmailField(
        blank=True, default="", verbose_name="Email получателя"
    )
    entity_type = models.CharField(
        max_length=20,
        choices=FormTemplate.EntityType.choices,
        default=FormTemplate.EntityType.CLIENT,
        verbose_name="Тип анкеты",
    )
    entity_id = models.UUIDField(
        null=True, blank=True, verbose_name="ID сущности (клиент/сотрудник)"
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SENT,
        verbose_name="Статус",
    )
    expires_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Ссылка действует до"
    )
    submitted_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Заполнена"
    )
    response = models.JSONField(default=dict, blank=True, verbose_name="Ответ")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_form_invitations",
        verbose_name="Создал",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создана")

    class Meta:
        verbose_name = "Ссылка анкеты"
        verbose_name_plural = "Ссылки анкет"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.form.title} — {self.token}"

    def is_expired(self):
        if not self.expires_at:
            return False
        from django.utils import timezone

        return timezone.now() > self.expires_at

    @property
    def answer_url(self):
        base = getattr(
            settings, "FORMS_PUBLIC_BASE_URL", None
        )
        if not base:
            base = None
        return f"{base.rstrip('/')}/forms/i/{self.token}/" if base else None