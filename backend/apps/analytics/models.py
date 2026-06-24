import uuid

from django.db import models


class AnalyticsDashboard(models.Model):
    """Custom analytics dashboards."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Название")
    config = models.JSONField(default=dict, blank=True, verbose_name="Конфигурация")
    owner = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, related_name="dashboards",
        verbose_name="Владелец"
    )
    is_public = models.BooleanField(default=False, verbose_name="Публичный")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")

    class Meta:
        verbose_name = "Дашборд"
        verbose_name_plural = "Дашборды"

    def __str__(self):
        return self.name


class AnalyticsMetric(models.Model):
    """Pre-calculated metrics for dashboards."""
    CATEGORY_CHOICES = [
        ("sales", "Продажи"),
        ("finance", "Финансы"),
        ("projects", "Проекты"),
        ("tasks", "Задачи"),
        ("clients", "Клиенты"),
    ]
    PERIOD_CHOICES = [
        ("day", "День"),
        ("week", "Неделя"),
        ("month", "Месяц"),
        ("quarter", "Квартал"),
        ("year", "Год"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Название")
    metric_key = models.CharField(
        max_length=100, unique=True, verbose_name="Ключ метрики"
    )
    category = models.CharField(
        max_length=50, choices=CATEGORY_CHOICES, verbose_name="Категория"
    )
    value = models.DecimalField(
        max_digits=15, decimal_places=2, verbose_name="Значение"
    )
    period_date = models.DateField(verbose_name="Дата периода")
    period_type = models.CharField(
        max_length=20, choices=PERIOD_CHOICES, verbose_name="Тип периода"
    )
    breakdown = models.JSONField(default=dict, blank=True, verbose_name="Детали")

    class Meta:
        verbose_name = "Метрика"
        verbose_name_plural = "Метрики"
        indexes = [
            models.Index(fields=["metric_key", "period_date"]),
            models.Index(fields=["category"]),
        ]

    def __str__(self):
        return f"{self.name}: {self.value} ({self.period_date})"


class Report(models.Model):
    """Generated reports."""
    TYPE_CHOICES = [
        ("financial", "Финансовый"),
        ("project", "По проектам"),
        ("sales", "По продажам"),
        ("performance", "По производительности"),
        ("custom", "Кастомный"),
    ]
    FORMAT_CHOICES = [
        ("pdf", "PDF"),
        ("xlsx", "Excel"),
        ("csv", "CSV"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, verbose_name="Название")
    type = models.CharField(max_length=50, choices=TYPE_CHOICES, verbose_name="Тип")
    filters = models.JSONField(default=dict, blank=True, verbose_name="Фильтры")
    data = models.JSONField(default=dict, blank=True, verbose_name="Данные")
    format = models.CharField(
        max_length=10, choices=FORMAT_CHOICES, default="pdf",
        verbose_name="Формат"
    )
    file_url = models.URLField(blank=True, verbose_name="URL файла")
    generated_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True,
        verbose_name="Сгенерировал"
    )
    generated_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "Отчет"
        verbose_name_plural = "Отчеты"
        ordering = ["-generated_at"]
