import os
import uuid

from django.db import models


class AISettings(models.Model):
    """AI provider configuration (singleton row).

    Values fall back to environment variables (``AI_API_URL``,
    ``AI_API_KEY``, ``AI_MODEL``) when the corresponding field is empty,
    so secrets never have to live in the database or source code.
    """

    api_url = models.CharField(max_length=500, blank=True, default="", verbose_name="API URL")
    api_key = models.CharField(max_length=500, blank=True, default="", verbose_name="API ключ")
    model = models.CharField(max_length=200, blank=True, default="", verbose_name="Модель")
    temperature = models.DecimalField(
        max_digits=3, decimal_places=2, default=0.70, verbose_name="Температура"
    )
    max_tokens = models.IntegerField(default=2048, verbose_name="Макс. токенов")
    timeout = models.IntegerField(default=60, verbose_name="Таймаут (сек)")
    enabled = models.BooleanField(default=True, verbose_name="Включено")
    updated_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Изменил"
    )
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлено")

    class Meta:
        verbose_name = "Настройки AI"
        verbose_name_plural = "Настройки AI"

    def __str__(self):
        return "Настройки DEO AI"

    @property
    def configured(self):
        return bool(self.api_url and self.api_key and self.model)


def get_ai_settings():
    """Return the effective AI settings (DB row seeded from env on first use)."""
    obj = AISettings.objects.first()
    if obj is None:
        obj = AISettings.objects.create(
            api_url=os.environ.get("AI_API_URL", ""),
            api_key=os.environ.get("AI_API_KEY", ""),
            model=os.environ.get("AI_MODEL", ""),
        )
    # Empty DB fields fall back to environment variables at call time
    obj.api_url = obj.api_url or os.environ.get("AI_API_URL", "")
    obj.api_key = obj.api_key or os.environ.get("AI_API_KEY", "")
    obj.model = obj.model or os.environ.get("AI_MODEL", "")
    return obj


class AIPromptTemplate(models.Model):
    """Templates for AI prompts."""

    PROMPT_TYPE_CHOICES = [
        ("tz", "Техническое задание"),
        ("commercial_offer", "Коммерческое предложение"),
        ("contract", "Договор"),
        ("report", "Отчет"),
        ("summary", "Суммаризация"),
        ("estimate", "Оценка стоимости"),
        ("client_response", "Ответ клиенту"),
    ]

    name = models.CharField(max_length=255, verbose_name="Название")
    prompt_type = models.CharField(
        max_length=50, choices=PROMPT_TYPE_CHOICES, verbose_name="Тип промпта"
    )
    system_prompt = models.TextField(verbose_name="Системный промпт")
    user_prompt_template = models.TextField(verbose_name="Шаблон промпта пользователя")
    variables_schema = models.JSONField(default=dict, blank=True, verbose_name="Схема переменных")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")

    class Meta:
        verbose_name = "Шаблон промпта"
        verbose_name_plural = "Шаблоны промптов"

    def __str__(self):
        return f"{self.get_prompt_type_display()} - {self.name}"


class AIRequest(models.Model):
    """History of AI generation requests."""

    STATUS_CHOICES = [
        ("pending", "В обработке"),
        ("completed", "Готово"),
        ("failed", "Ошибка"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="ai_requests",
        verbose_name="Пользователь",
    )
    template = models.ForeignKey(
        AIPromptTemplate, on_delete=models.SET_NULL, null=True, verbose_name="Шаблон"
    )
    prompt_type = models.CharField(max_length=50, verbose_name="Тип запроса")
    input_data = models.JSONField(default=dict, verbose_name="Входные данные")
    output_data = models.TextField(blank=True, verbose_name="Результат")
    model = models.CharField(max_length=100, default="gpt-4", verbose_name="Модель")
    tokens_used = models.IntegerField(default=0, verbose_name="Токенов использовано")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending", verbose_name="Статус"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="Завершен")

    class Meta:
        verbose_name = "AI запрос"
        verbose_name_plural = "AI запросы"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_prompt_type_display()} - {self.created_at:%d.%m.%Y}"
