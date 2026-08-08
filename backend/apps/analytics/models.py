import uuid

from django.db import models


class AnalyticsDashboard(models.Model):
    """Custom analytics dashboards."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Название")
    config = models.JSONField(default=dict, blank=True, verbose_name="Конфигурация")
    owner = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="dashboards",
        verbose_name="Владелец",
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
    metric_key = models.CharField(max_length=100, unique=True, verbose_name="Ключ метрики")
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, verbose_name="Категория")
    value = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="Значение")
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


class BusinessMetricsSnapshot(models.Model):
    """Materialized daily company-level business metrics.

    Filled by a periodic Celery task (see apps.analytics.tasks) or the
    `refresh_analytics` management command. Additive metrics can be summed
    across days; complex metrics (conversion, LTV, churn, retention) are
    computed on demand and cached.
    """

    date = models.DateField(unique=True, verbose_name="Дата")

    revenue = models.DecimalField(
        max_digits=15, decimal_places=2, default=0, verbose_name="Выручка"
    )
    cogs = models.DecimalField(
        max_digits=15, decimal_places=2, default=0, verbose_name="Себестоимость"
    )
    gross_profit = models.DecimalField(
        max_digits=15, decimal_places=2, default=0, verbose_name="Валовая прибыль"
    )
    expenses = models.DecimalField(
        max_digits=15, decimal_places=2, default=0, verbose_name="Расходы"
    )
    salaries = models.DecimalField(
        max_digits=15, decimal_places=2, default=0, verbose_name="Зарплаты"
    )
    net_profit = models.DecimalField(
        max_digits=15, decimal_places=2, default=0, verbose_name="Чистая прибыль"
    )

    new_clients = models.PositiveIntegerField(default=0, verbose_name="Новые клиенты")
    new_leads = models.PositiveIntegerField(default=0, verbose_name="Новые лиды")
    qualified_leads = models.PositiveIntegerField(default=0, verbose_name="Квалифицированные")
    deals = models.PositiveIntegerField(default=0, verbose_name="Сделки")
    won_deals = models.PositiveIntegerField(default=0, verbose_name="Выигранные сделки")
    lost_deals = models.PositiveIntegerField(default=0, verbose_name="Проигранные сделки")
    won_revenue = models.DecimalField(
        max_digits=15, decimal_places=2, default=0, verbose_name="Выручка по сделкам"
    )
    active_clients = models.PositiveIntegerField(default=0, verbose_name="Активные клиенты")
    churned_clients = models.PositiveIntegerField(default=0, verbose_name="Отток клиентов")

    calculated_at = models.DateTimeField(auto_now=True, verbose_name="Рассчитано")

    class Meta:
        verbose_name = "Снапшот бизнес-метрик"
        verbose_name_plural = "Снапшоты бизнес-метрик"
        ordering = ["date"]

    def __str__(self):
        return f"{self.date} — revenue={self.revenue}"


class SourceAcquisitionCost(models.Model):
    """Marketing/acquisition spend per lead source per month.

    Entered by the admin; feeds CAC and ROI calculations.
    """

    SOURCE_CHOICES = [
        ("website", "Сайт"),
        ("referral", "Рекомендация"),
        ("instagram", "Instagram"),
        ("facebook", "Facebook"),
        ("telegram", "Telegram"),
        ("call", "Звонок"),
        ("other", "Другое"),
    ]

    source = models.CharField(max_length=50, choices=SOURCE_CHOICES, verbose_name="Источник")
    year = models.PositiveIntegerField(verbose_name="Год")
    month = models.PositiveIntegerField(verbose_name="Месяц")
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Сумма затрат")
    notes = models.TextField(blank=True, verbose_name="Заметки")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")

    class Meta:
        verbose_name = "Стоимость привлечения"
        verbose_name_plural = "Стоимости привлечения"
        ordering = ["-year", "-month", "source"]
        unique_together = ("source", "year", "month")
        indexes = [models.Index(fields=["source", "year", "month"])]

    def __str__(self):
        return f"{self.get_source_display()} {self.month:02d}/{self.year} — {self.amount} ₽"


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
        max_length=10, choices=FORMAT_CHOICES, default="pdf", verbose_name="Формат"
    )
    file_url = models.URLField(blank=True, verbose_name="URL файла")
    generated_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, verbose_name="Сгенерировал"
    )
    generated_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "Отчет"
        verbose_name_plural = "Отчеты"
        ordering = ["-generated_at"]
