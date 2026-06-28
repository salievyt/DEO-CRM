import uuid

from django.db import models


class ABTestCampaign(models.Model):
    """A/B test campaign for commercial proposals."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        RUNNING = "running", "Запущен"
        COMPLETED = "completed", "Завершен"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Название кампании")
    description = models.TextField(blank=True, verbose_name="Описание")
    lead = models.ForeignKey(
        "leads.Lead",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ab_tests",
        verbose_name="Лид",
    )
    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ab_tests",
        verbose_name="Клиент",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        verbose_name="Статус",
    )
    winner_variant = models.ForeignKey(
        "CampaignVariant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="won_campaigns",
        verbose_name="Вариант-победитель",
    )
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="ab_campaigns",
        verbose_name="Создал",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")

    class Meta:
        verbose_name = "A/B тест кампания"
        verbose_name_plural = "A/B тест кампании"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    def determine_winner(self):
        """Auto-determine the winning variant based on conversion rate."""
        variants = self.variants.all()
        if not variants:
            return None

        best = max(
            variants,
            key=lambda v: v.conversion_rate if v.total_sent > 0 else 0,
        )
        if best.conversion_rate > 0:
            self.winner_variant = best
            self.status = self.Status.COMPLETED
            self.save(update_fields=["winner_variant", "status"])
            return best
        return None


class CampaignVariant(models.Model):
    """A variant within an A/B test campaign."""

    FOCUS_CHOICES = [
        ("price", "Акцент на цену"),
        ("timeline", "Акцент на сроки"),
        ("quality", "Акцент на качество"),
        ("features", "Акцент на функционал"),
        ("support", "Акцент на поддержку"),
        ("roi", "Акцент на окупаемость"),
        ("cases", "Акцент на кейсы"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(
        ABTestCampaign,
        on_delete=models.CASCADE,
        related_name="variants",
        verbose_name="Кампания",
    )
    name = models.CharField(max_length=255, verbose_name="Название варианта")
    focus = models.CharField(
        max_length=50,
        choices=FOCUS_CHOICES,
        default="price",
        verbose_name="Акцент",
    )
    content = models.TextField(verbose_name="Содержание КП")
    ai_request = models.ForeignKey(
        "AIRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="AI запрос",
    )
    style_tags = models.JSONField(
        default=list, blank=True, verbose_name="Теги стиля"
    )
    sent_count = models.IntegerField(default=0, verbose_name="Отправлено")
    viewed_count = models.IntegerField(default=0, verbose_name="Просмотрено")
    converted_count = models.IntegerField(default=0, verbose_name="Конверсий")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "Вариант КП"
        verbose_name_plural = "Варианты КП"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.name} ({self.campaign.name})"

    @property
    def total_sent(self):
        return self.conversions.filter(sent=True).count()

    @property
    def total_converted(self):
        return self.conversions.filter(converted=True).count()

    @property
    def conversion_rate(self):
        sent = self.total_sent
        if sent == 0:
            return 0.0
        return round(self.total_converted / sent * 100, 1)


class ABTestConversion(models.Model):
    """Track conversions for A/B test variants."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создано")
    variant = models.ForeignKey(
        CampaignVariant,
        on_delete=models.CASCADE,
        related_name="conversions",
        verbose_name="Вариант",
    )
    lead = models.ForeignKey(
        "leads.Lead",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ab_conversions",
        verbose_name="Лид",
    )
    invoice = models.ForeignKey(
        "finance.Invoice",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ab_conversions",
        verbose_name="Счет",
    )
    sent = models.BooleanField(default=False, verbose_name="Отправлено клиенту")
    converted = models.BooleanField(default=False, verbose_name="Конвертировано")
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name="Отправлено")
    converted_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Конвертировано"
    )
    notes = models.TextField(blank=True, verbose_name="Заметки")

    class Meta:
        verbose_name = "Конверсия A/B теста"
        verbose_name_plural = "Конверсии A/B тестов"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.variant} - {'✅' if self.converted else '❌'}"
