import uuid

from django.core.validators import MinValueValidator
from django.db import models


class Invoice(models.Model):
    """Invoice for a client project."""
    STATUS_CHOICES = [
        ("draft", "Черновик"),
        ("sent", "Отправлен"),
        ("paid", "Оплачен"),
        ("overdue", "Просрочен"),
        ("cancelled", "Отменен"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=50, unique=True, verbose_name="Номер")
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, null=True, blank=True,
        related_name="invoices", verbose_name="Проект"
    )
    client = models.ForeignKey(
        "clients.Client", on_delete=models.CASCADE, related_name="invoices",
        verbose_name="Клиент"
    )
    amount = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(0)],
        verbose_name="Сумма"
    )
    paid_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name="Оплачено"
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="draft",
        verbose_name="Статус"
    )
    description = models.TextField(blank=True, verbose_name="Описание")
    issued_date = models.DateField(verbose_name="Дата выставления")
    due_date = models.DateField(verbose_name="Срок оплаты")
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name="Оплачен")
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True,
        verbose_name="Создал"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")

    class Meta:
        verbose_name = "Счет"
        verbose_name_plural = "Счета"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["client", "status"]),
            models.Index(fields=["status", "paid_at"]),
        ]

    def __str__(self):
        return f"{self.number} - {self.amount} ₽"


class InvoiceItem(models.Model):
    """Line items for an invoice."""
    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name="items",
        verbose_name="Счет"
    )
    description = models.CharField(max_length=255, verbose_name="Описание")
    quantity = models.DecimalField(
        max_digits=10, decimal_places=2, default=1, verbose_name="Количество"
    )
    unit_price = models.DecimalField(
        max_digits=12, decimal_places=2, verbose_name="Цена за единицу"
    )

    class Meta:
        verbose_name = "Позиция счета"
        verbose_name_plural = "Позиции счетов"

    @property
    def total_price(self):
        return self.quantity * self.unit_price

    def __str__(self):
        return f"{self.description} - {self.total_price} ₽"


class Payment(models.Model):
    """Payments received."""
    METHOD_CHOICES = [
        ("bank_transfer", "Банковский перевод"),
        ("cash", "Наличные"),
        ("card", "Карта"),
        ("crypto", "Криптовалюта"),
    ]

    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name="payments",
        verbose_name="Счет"
    )
    amount = models.DecimalField(
        max_digits=12, decimal_places=2, verbose_name="Сумма"
    )
    method = models.CharField(
        max_length=20, choices=METHOD_CHOICES, verbose_name="Способ"
    )
    paid_at = models.DateTimeField(auto_now_add=True, verbose_name="Оплачен")
    transaction_id = models.CharField(
        max_length=255, blank=True, verbose_name="ID транзакции"
    )
    notes = models.TextField(blank=True, verbose_name="Заметки")

    class Meta:
        verbose_name = "Платеж"
        verbose_name_plural = "Платежи"
        ordering = ["-paid_at"]

    def __str__(self):
        return f"{self.invoice.number} - {self.amount} ₽"


class ExpenseCategory(models.Model):
    """Categories for expenses."""
    name = models.CharField(max_length=100, unique=True, verbose_name="Название")
    description = models.TextField(blank=True, verbose_name="Описание")

    class Meta:
        verbose_name = "Категория расходов"
        verbose_name_plural = "Категории расходов"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Expense(models.Model):
    """Company expenses."""
    category = models.ForeignKey(
        ExpenseCategory, on_delete=models.PROTECT, related_name="expenses",
        verbose_name="Категория"
    )
    project = models.ForeignKey(
        "projects.Project", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="expenses", verbose_name="Проект"
    )
    amount = models.DecimalField(
        max_digits=12, decimal_places=2, verbose_name="Сумма"
    )
    description = models.TextField(verbose_name="Описание")
    expense_date = models.DateField(verbose_name="Дата расхода")
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True,
        verbose_name="Создал"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "Расход"
        verbose_name_plural = "Расходы"
        ordering = ["-expense_date"]

    def __str__(self):
        return f"{self.category} - {self.amount} ₽ ({self.expense_date})"


class Product(models.Model):
    """Products/services catalog."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Название")
    description = models.TextField(blank=True, verbose_name="Описание")
    price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        verbose_name="Цена"
    )
    is_active = models.BooleanField(default=True, verbose_name="Активен")
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True,
        verbose_name="Создал"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")

    class Meta:
        verbose_name = "Товар"
        verbose_name_plural = "Товары"
        ordering = ["name"]

    def __str__(self):
        return self.name


class ClientPurchase(models.Model):
    """Purchases of products by a client."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(
        "clients.Client", on_delete=models.CASCADE, related_name="purchases",
        verbose_name="Клиент"
    )
    product = models.ForeignKey(
        Product, on_delete=models.PROTECT, related_name="purchases",
        verbose_name="Товар"
    )
    invoice = models.ForeignKey(
        Invoice, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="purchases", verbose_name="Счет"
    )
    quantity = models.DecimalField(
        max_digits=10, decimal_places=2, default=1, verbose_name="Количество"
    )
    unit_price = models.DecimalField(
        max_digits=12, decimal_places=2, verbose_name="Цена за единицу"
    )
    purchased_at = models.DateTimeField(auto_now_add=True, verbose_name="Куплено")
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True,
        verbose_name="Создал"
    )

    class Meta:
        verbose_name = "Покупка"
        verbose_name_plural = "Покупки"
        ordering = ["-purchased_at"]
        indexes = [
            models.Index(fields=["client", "purchased_at"]),
        ]

    @property
    def total_price(self):
        return self.quantity * self.unit_price

    def __str__(self):
        return f"{self.product} x{self.quantity}"


class Salary(models.Model):
    """Employee salaries."""
    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, related_name="salaries",
        verbose_name="Сотрудник"
    )
    amount = models.DecimalField(
        max_digits=10, decimal_places=2, verbose_name="Сумма"
    )
    month = models.IntegerField(verbose_name="Месяц")
    year = models.IntegerField(verbose_name="Год")
    paid_at = models.DateField(verbose_name="Дата выплаты")
    paid_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True,
        related_name="paid_salaries", verbose_name="Выплатил"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "Зарплата"
        verbose_name_plural = "Зарплаты"
        unique_together = ("user", "month", "year")
        ordering = ["-year", "-month"]

    def __str__(self):
        return f"{self.user} - {self.amount} ₽ ({self.month}/{self.year})"
