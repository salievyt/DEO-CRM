import uuid

from django.db import models


class LeadStage(models.Model):
    """Sales pipeline stages."""
    name = models.CharField(max_length=100, verbose_name="Название")
    order = models.IntegerField(default=0, verbose_name="Порядок")
    probability = models.IntegerField(default=0, verbose_name="Вероятность (%)")
    color = models.CharField(max_length=7, default="#6366f1", verbose_name="Цвет")

    class Meta:
        verbose_name = "Этап воронки"
        verbose_name_plural = "Этапы воронки"
        ordering = ["order"]

    def __str__(self):
        return self.name


class Lead(models.Model):
    """Sales lead card."""
    SOURCE_CHOICES = [
        ("website", "Сайт"),
        ("referral", "Рекомендация"),
        ("instagram", "Instagram"),
        ("facebook", "Facebook"),
        ("telegram", "Telegram"),
        ("call", "Звонок"),
        ("other", "Другое"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(
        "clients.Client", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="leads", verbose_name="Клиент"
    )
    contact_name = models.CharField(max_length=255, verbose_name="Контактное имя")
    company_name = models.CharField(max_length=255, blank=True, verbose_name="Компания")
    phone = models.CharField(max_length=20, verbose_name="Телефон")
    email = models.EmailField(blank=True, verbose_name="Email")
    telegram = models.CharField(max_length=100, blank=True, verbose_name="Telegram")
    source = models.CharField(
        max_length=50, choices=SOURCE_CHOICES, default="other",
        verbose_name="Источник"
    )
    budget = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        verbose_name="Бюджет"
    )
    current_stage = models.ForeignKey(
        LeadStage, on_delete=models.PROTECT, related_name="leads",
        verbose_name="Текущий этап"
    )
    assigned_to = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="assigned_leads", verbose_name="Ответственный"
    )
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True,
        related_name="created_leads", verbose_name="Создал"
    )
    notes = models.TextField(blank=True, verbose_name="Заметки")
    is_active = models.BooleanField(default=True, verbose_name="Активен")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")

    class Meta:
        verbose_name = "Лид"
        verbose_name_plural = "Лиды"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["current_stage", "is_active"]),
            models.Index(fields=["assigned_to"]),
        ]

    def __str__(self):
        return f"{self.contact_name} - {self.current_stage}"


class LeadHistory(models.Model):
    """History of lead stage changes."""
    lead = models.ForeignKey(
        Lead, on_delete=models.CASCADE, related_name="history",
        verbose_name="Лид"
    )
    from_stage = models.ForeignKey(
        LeadStage, on_delete=models.SET_NULL, null=True,
        related_name="+", verbose_name="С этапа"
    )
    to_stage = models.ForeignKey(
        LeadStage, on_delete=models.SET_NULL, null=True,
        related_name="+", verbose_name="На этап"
    )
    user = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True,
        verbose_name="Пользователь"
    )
    notes = models.TextField(blank=True, verbose_name="Заметки")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "История лида"
        verbose_name_plural = "История лидов"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.lead} - {self.from_stage} → {self.to_stage}"


class LeadFile(models.Model):
    """Files attached to a lead."""
    lead = models.ForeignKey(
        Lead, on_delete=models.CASCADE, related_name="files", verbose_name="Лид"
    )
    file_url = models.URLField(verbose_name="URL файла")
    file_name = models.CharField(max_length=255, verbose_name="Имя файла")
    uploaded_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True,
        verbose_name="Загрузил"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "Файл лида"
        verbose_name_plural = "Файлы лидов"
