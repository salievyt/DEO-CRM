import uuid

from django.db import models


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
    variables_schema = models.JSONField(
        default=dict, blank=True, verbose_name="Схема переменных"
    )
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
        "accounts.User", on_delete=models.CASCADE, related_name="ai_requests",
        verbose_name="Пользователь"
    )
    template = models.ForeignKey(
        AIPromptTemplate, on_delete=models.SET_NULL, null=True,
        verbose_name="Шаблон"
    )
    prompt_type = models.CharField(
        max_length=50, verbose_name="Тип запроса"
    )
    input_data = models.JSONField(default=dict, verbose_name="Входные данные")
    output_data = models.TextField(blank=True, verbose_name="Результат")
    model = models.CharField(max_length=100, default="gpt-4", verbose_name="Модель")
    tokens_used = models.IntegerField(default=0, verbose_name="Токенов использовано")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending",
        verbose_name="Статус"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="Завершен")

    class Meta:
        verbose_name = "AI запрос"
        verbose_name_plural = "AI запросы"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_prompt_type_display()} - {self.created_at:%d.%m.%Y}"
