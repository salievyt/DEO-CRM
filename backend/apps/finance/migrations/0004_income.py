import uuid

import django.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("finance", "0003_product_clientpurchase"),
    ]

    operations = [
        migrations.CreateModel(
            name="Income",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "amount",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=12,
                        validators=[django.core.validators.MinValueValidator(0)],
                        verbose_name="Сумма",
                    ),
                ),
                ("description", models.TextField(verbose_name="Описание")),
                (
                    "method",
                    models.CharField(
                        choices=[
                            ("bank_transfer", "Банковский перевод"),
                            ("cash", "Наличные"),
                            ("card", "Карта"),
                            ("crypto", "Криптовалюта"),
                        ],
                        default="bank_transfer",
                        max_length=20,
                        verbose_name="Способ оплаты",
                    ),
                ),
                ("income_date", models.DateField(verbose_name="Дата дохода")),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Создан"),
                ),
                (
                    "client",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="incomes",
                        to="clients.client",
                        verbose_name="Клиент",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="accounts.user",
                        verbose_name="Создал",
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="incomes",
                        to="projects.project",
                        verbose_name="Проект",
                    ),
                ),
            ],
            options={
                "verbose_name": "Доход",
                "verbose_name_plural": "Доходы",
                "ordering": ["-income_date"],
            },
        ),
        migrations.AddIndex(
            model_name="income",
            index=models.Index(
                fields=["income_date"], name="finance_inc_income__d32720_idx"
            ),
        ),
    ]
