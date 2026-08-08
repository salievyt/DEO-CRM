"""Catalog: Products / Services / Packages / Subscriptions."""

import uuid
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class CatalogCategory(models.Model):
    """Category for catalog items (e.g. «Веб-разработка», «Обучение»)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, verbose_name="Название")
    color = models.CharField(max_length=7, default="#6366f1", verbose_name="Цвет")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создана")

    class Meta:
        verbose_name = "Категория каталога"
        verbose_name_plural = "Категории каталога"
        ordering = ["name"]

    def __str__(self):
        return self.name


class CatalogItem(models.Model):
    """A product / service / package / subscription in the catalog.

    Fields marked «per type» are only meaningful for the matching ``type``:
    - product:       sku, stock, unit, cost_price
    - service:       duration_minutes, cost_price
    - package:       linked items via ``PackageItem``; price is auto-computed
    - subscription:  billing_period, next_billing_date
    """

    TYPE_PRODUCT = "product"
    TYPE_SERVICE = "service"
    TYPE_PACKAGE = "package"
    TYPE_SUBSCRIPTION = "subscription"
    TYPE_CHOICES = [
        (TYPE_PRODUCT, "Товар"),
        (TYPE_SERVICE, "Услуга"),
        (TYPE_PACKAGE, "Пакет"),
        (TYPE_SUBSCRIPTION, "Подписка"),
    ]

    STATUS_ACTIVE = "active"
    STATUS_INACTIVE = "inactive"
    STATUS_ARCHIVED = "archived"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Активен"),
        (STATUS_INACTIVE, "Неактивен"),
        (STATUS_ARCHIVED, "В архиве"),
    ]

    BILLING_MONTHLY = "monthly"
    BILLING_QUARTERLY = "quarterly"
    BILLING_YEARLY = "yearly"
    BILLING_CHOICES = [
        (BILLING_MONTHLY, "Ежемесячно"),
        (BILLING_QUARTERLY, "Ежеквартально"),
        (BILLING_YEARLY, "Ежегодно"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Название")
    description = models.TextField(blank=True, verbose_name="Описание")
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name="Тип")
    category = models.ForeignKey(
        CatalogCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="items",
        verbose_name="Категория",
    )
    sku = models.CharField(
        max_length=100, unique=True, null=True, blank=True, verbose_name="Артикул"
    )
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Цена",
    )
    cost_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Себестоимость",
    )
    tax = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Налог (%)",
    )
    discount = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Скидка (%)",
    )

    # --- product only ---
    stock = models.IntegerField(default=0, verbose_name="Остаток")
    low_stock_threshold = models.IntegerField(default=5, verbose_name="Порог низкого остатка")
    unit = models.CharField(max_length=50, default="шт.", verbose_name="Ед. изм.")

    # --- service only ---
    duration_minutes = models.IntegerField(null=True, blank=True, verbose_name="Длительность (мин)")

    # --- subscription only ---
    billing_period = models.CharField(
        max_length=20, choices=BILLING_CHOICES, null=True, blank=True, verbose_name="Период оплаты"
    )
    next_billing_date = models.DateField(null=True, blank=True, verbose_name="Следующая оплата")

    image = models.ImageField(
        upload_to="catalog/%Y/%m/", null=True, blank=True, verbose_name="Изображение"
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE, verbose_name="Статус"
    )
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, verbose_name="Создал"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")

    class Meta:
        verbose_name = "Позиция каталога"
        verbose_name_plural = "Позиции каталога"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["type", "status"]),
            models.Index(fields=["category", "type"]),
            models.Index(fields=["sku"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return self.name

    @property
    def price_after_discount(self):
        value = self.price * (1 - self.discount / 100)
        return max(value, 0)

    @property
    def stock_status(self):
        """Inventory alert: ``out`` / ``low`` / ``ok`` (products only)."""
        if self.type != self.TYPE_PRODUCT:
            return "ok"
        if self.stock <= 0:
            return "out"
        if self.stock <= self.low_stock_threshold:
            return "low"
        return "ok"


class PackageItem(models.Model):
    """Products/services included in a package."""

    package = models.ForeignKey(
        CatalogItem, on_delete=models.CASCADE, related_name="package_items", verbose_name="Пакет"
    )
    item = models.ForeignKey(
        CatalogItem,
        on_delete=models.CASCADE,
        related_name="included_in_packages",
        verbose_name="Позиция",
    )
    quantity = models.DecimalField(
        max_digits=10, decimal_places=2, default=1, verbose_name="Количество"
    )

    class Meta:
        verbose_name = "Позиция пакета"
        verbose_name_plural = "Позиции пакетов"
        unique_together = ("package", "item")

    def __str__(self):
        return f"{self.package} ← {self.item} × {self.quantity}"

    @property
    def total_price(self):
        return self.item.price * self.quantity


class PriceHistory(models.Model):
    """History of price / cost changes for a catalog item."""

    item = models.ForeignKey(
        CatalogItem, on_delete=models.CASCADE, related_name="price_history", verbose_name="Позиция"
    )
    old_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Старая цена"
    )
    new_price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Новая цена")
    old_cost = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Старая себестоимость"
    )
    new_cost = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Новая себестоимость"
    )
    reason = models.CharField(max_length=255, blank=True, verbose_name="Причина")
    changed_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, verbose_name="Изменил"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Когда")

    class Meta:
        verbose_name = "История цены"
        verbose_name_plural = "Истории цен"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.item} — {self.old_price} → {self.new_price}"


class InventoryMovement(models.Model):
    """Audit trail for stock changes of a product."""

    TYPE_SALE = "sale"
    TYPE_RESTOCK = "restock"
    TYPE_ADJUSTMENT = "adjustment"
    TYPE_REFUND = "refund"
    TYPE_CHOICES = [
        (TYPE_SALE, "Продажа"),
        (TYPE_RESTOCK, "Приход"),
        (TYPE_ADJUSTMENT, "Корректировка"),
        (TYPE_REFUND, "Возврат"),
    ]

    item = models.ForeignKey(
        CatalogItem,
        on_delete=models.CASCADE,
        related_name="inventory_movements",
        verbose_name="Позиция",
    )
    movement_type = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name="Тип")
    quantity = models.IntegerField(verbose_name="Количество (+/-)")
    balance_after = models.IntegerField(verbose_name="Остаток после")
    reference = models.CharField(max_length=255, blank=True, verbose_name="Ссылка (сделка и т.п.)")
    note = models.TextField(blank=True, verbose_name="Примечание")
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, verbose_name="Автор"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Когда")

    class Meta:
        verbose_name = "Движение остатков"
        verbose_name_plural = "Движения остатков"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["item", "created_at"])]

    def __str__(self):
        return f"{self.item} {self.movement_type} {self.quantity:+d}"
