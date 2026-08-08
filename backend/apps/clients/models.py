import uuid

from django.db import models
from django.db.models import Sum

from common.mixins import TimestampMixin


class Client(models.Model):
    """Client card with full contact information and history."""
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
    user = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="client_profiles", verbose_name="Связанный пользователь"
    )
    company_name = models.CharField(max_length=255, blank=True, verbose_name="Компания")
    first_name = models.CharField(max_length=150, verbose_name="Имя")
    last_name = models.CharField(max_length=150, verbose_name="Фамилия")
    phone = models.CharField(max_length=20, verbose_name="Телефон")
    email = models.EmailField(blank=True, verbose_name="Email")
    telegram = models.CharField(max_length=100, blank=True, verbose_name="Telegram")
    whatsapp = models.CharField(max_length=100, blank=True, verbose_name="WhatsApp")
    address = models.TextField(blank=True, verbose_name="Адрес")
    source = models.CharField(
        max_length=50, choices=SOURCE_CHOICES, default="other",
        verbose_name="Источник"
    )
    notes = models.TextField(blank=True, verbose_name="Заметки")
    is_active = models.BooleanField(default=True, verbose_name="Активен")
    status = models.ForeignKey(
        "clients.ClientStatus", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="clients", verbose_name="Статус"
    )
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True,
        related_name="created_clients", verbose_name="Создал"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")

    class Meta:
        verbose_name = "Клиент"
        verbose_name_plural = "Клиенты"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["phone"]),
            models.Index(fields=["created_by"]),
            models.Index(fields=["source"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.last_name} {self.first_name}" + \
            (f" ({self.company_name})" if self.company_name else "")

    @property
    def full_name(self):
        return f"{self.last_name} {self.first_name}"

    @property
    def total_revenue(self):
        from apps.finance.models import Invoice
        result = Invoice.objects.filter(
            client=self, status="paid"
        ).aggregate(total=Sum("amount"))
        return result["total"] or 0

    @property
    def total_projects(self):
        from apps.projects.models import Project
        return Project.objects.filter(client=self).count()


class ClientTag(models.Model):
    """Tags for categorizing clients."""
    name = models.CharField(max_length=50, unique=True, verbose_name="Название")
    color = models.CharField(max_length=7, default="#6366f1", verbose_name="Цвет")

    class Meta:
        verbose_name = "Тег клиента"
        verbose_name_plural = "Теги клиентов"

    def __str__(self):
        return self.name


class ClientTagAssignment(models.Model):
    """Many-to-many: Client <-> Tag."""
    client = models.ForeignKey(
        Client, on_delete=models.CASCADE, related_name="tag_assignments"
    )
    tag = models.ForeignKey(
        ClientTag, on_delete=models.CASCADE, related_name="client_assignments"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("client", "tag")
        verbose_name = "Назначение тега"
        verbose_name_plural = "Назначения тегов"


class ClientInteraction(models.Model):
    """History of interactions with a client."""
    TYPE_CHOICES = [
        ("call", "Звонок"),
        ("email", "Email"),
        ("meeting", "Встреча"),
        ("note", "Заметка"),
        ("message", "Сообщение"),
        ("task", "Задача"),
    ]

    client = models.ForeignKey(
        Client, on_delete=models.CASCADE, related_name="interactions",
        verbose_name="Клиент"
    )
    user = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True,
        verbose_name="Сотрудник"
    )
    type = models.CharField(
        max_length=20, choices=TYPE_CHOICES, verbose_name="Тип"
    )
    description = models.TextField(verbose_name="Описание")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "Взаимодействие"
        verbose_name_plural = "Взаимодействия"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_type_display()} - {self.client} - {self.created_at:%d.%m.%Y}"


class ClientStatus(models.Model):
    """Configurable client statuses."""
    name = models.CharField(max_length=100, unique=True, verbose_name="Название")
    color = models.CharField(max_length=7, default="#6366f1", verbose_name="Цвет")
    order = models.IntegerField(default=0, verbose_name="Порядок")
    is_system = models.BooleanField(default=False, verbose_name="Системный")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "Статус клиента"
        verbose_name_plural = "Статусы клиентов"
        ordering = ["order"]

    def __str__(self):
        return self.name
