"""Deals: convert a lead into a sale with line items, payments and documents.

The deal pipeline (leads + stages) is NOT touched — a Deal is an optional
one-to-one extension of a Lead created through explicit conversion.
"""

import uuid
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Sum


class Deal(models.Model):
    """A sale converted from a lead, with itemized totals."""

    STATUS_DRAFT = "draft"
    STATUS_OPEN = "open"
    STATUS_WON = "won"
    STATUS_LOST = "lost"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_DRAFT, "Черновик"),
        (STATUS_OPEN, "В работе"),
        (STATUS_WON, "Выиграна"),
        (STATUS_LOST, "Проиграна"),
        (STATUS_CANCELLED, "Отменена"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=50, unique=True, blank=True, verbose_name="Номер")
    lead = models.OneToOneField(
        "leads.Lead", on_delete=models.CASCADE, related_name="deal", verbose_name="Лид"
    )
    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deals",
        verbose_name="Клиент",
    )
    title = models.CharField(max_length=255, verbose_name="Название")
    description = models.TextField(blank=True, verbose_name="Описание")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN, verbose_name="Статус"
    )
    assigned_to = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_deals",
        verbose_name="Ответственный",
    )
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_deals",
        verbose_name="Создал",
    )

    # --- order-level money (auto-recalculated, kept in sync with items) ---
    subtotal = models.DecimalField(
        max_digits=14, decimal_places=2, default=0, verbose_name="Подытог"
    )
    discount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Скидка (₽)",
    )
    tax = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Налог (₽)",
    )
    total = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name="Итого")
    total_cost = models.DecimalField(
        max_digits=14, decimal_places=2, default=0, verbose_name="Себестоимость"
    )
    profit = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name="Прибыль")
    margin = models.DecimalField(
        max_digits=7, decimal_places=2, default=0, verbose_name="Маржа (%)"
    )
    paid_amount = models.DecimalField(
        max_digits=14, decimal_places=2, default=0, verbose_name="Оплачено"
    )

    won_at = models.DateTimeField(null=True, blank=True, verbose_name="Выиграна")
    lost_at = models.DateTimeField(null=True, blank=True, verbose_name="Проиграна")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создана")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлена")

    class Meta:
        verbose_name = "Сделка"
        verbose_name_plural = "Сделки"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["client", "status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.number} — {self.title}"

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = f"D-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def recalculate(self):
        """Recompute all money fields from the line items (transactional)."""
        items = list(self.items.all())
        line_subtotal = sum((i.line_subtotal for i in items), 0)
        line_discount = sum((i.discount for i in items), 0)
        line_tax = sum((i.tax for i in items), 0)
        cost = sum((i.total_cost for i in items), 0)

        discount_total = line_discount + self.discount
        tax_total = line_tax + self.tax
        total = max(line_subtotal - discount_total + tax_total, 0)
        profit = total - cost
        margin = (profit / total * 100) if total else 0

        Deal.objects.filter(id=self.id).update(
            subtotal=line_subtotal,
            discount=self.discount,
            tax=self.tax,
            total=total,
            total_cost=cost,
            profit=profit,
            margin=margin,
        )
        self.refresh_from_db(
            fields=["subtotal", "discount", "tax", "total", "total_cost", "profit", "margin"]
        )


class DealItem(models.Model):
    """Line item of a deal (snapshot of catalog item at sale time)."""

    deal = models.ForeignKey(
        Deal, on_delete=models.CASCADE, related_name="items", verbose_name="Сделка"
    )
    item = models.ForeignKey(
        "catalog.CatalogItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deal_items",
        verbose_name="Позиция каталога",
    )
    name = models.CharField(max_length=255, verbose_name="Название")
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=1,
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Количество",
    )
    unit_price = models.DecimalField(
        max_digits=12, decimal_places=2, verbose_name="Цена за единицу"
    )
    discount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Скидка (₽)",
    )
    tax = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Налог (₽)",
    )
    cost_price = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, verbose_name="Себестоимость (снимок)"
    )

    class Meta:
        verbose_name = "Позиция сделки"
        verbose_name_plural = "Позиции сделок"

    def __str__(self):
        return f"{self.name} × {self.quantity}"

    @property
    def line_subtotal(self):
        return self.quantity * self.unit_price

    @property
    def line_total(self):
        return max(self.line_subtotal - self.discount + self.tax, 0)

    @property
    def total_cost(self):
        return self.quantity * self.cost_price


class DealPayment(models.Model):
    """Payment received against a deal."""

    METHOD_CHOICES = [
        ("bank_transfer", "Банковский перевод"),
        ("cash", "Наличные"),
        ("card", "Карта"),
        ("crypto", "Криптовалюта"),
    ]

    deal = models.ForeignKey(
        Deal, on_delete=models.CASCADE, related_name="payments", verbose_name="Сделка"
    )
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Сумма",
    )
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, verbose_name="Способ")
    transaction_id = models.CharField(max_length=255, blank=True, verbose_name="ID транзакции")
    notes = models.TextField(blank=True, verbose_name="Заметки")
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, verbose_name="Принял"
    )
    paid_at = models.DateTimeField(auto_now_add=True, verbose_name="Оплачен")

    class Meta:
        verbose_name = "Платеж сделки"
        verbose_name_plural = "Платежи сделок"
        ordering = ["-paid_at"]

    def __str__(self):
        return f"{self.deal.number} — {self.amount} ₽"


def sync_deal_paid_amount(deal):
    """Refresh a deal's paid amount from its payments."""
    total = DealPayment.objects.filter(deal=deal).aggregate(s=Sum("amount"))["s"] or 0
    Deal.objects.filter(id=deal.id).update(paid_amount=total)
    deal.refresh_from_db(fields=["paid_amount"])
