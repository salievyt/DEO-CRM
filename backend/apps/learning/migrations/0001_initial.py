import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Article",
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
                ("title", models.CharField(max_length=255, verbose_name="Название")),
                ("slug", models.SlugField(max_length=255, unique=True, verbose_name="Слаг")),
                ("summary", models.TextField(verbose_name="Краткое описание")),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("basics", "Основы"),
                            ("sales", "Продажи"),
                            ("channels", "Каналы связи"),
                            ("automation", "Автоматизация"),
                            ("analytics", "Аналитика"),
                            ("team", "Команда"),
                            ("tasks", "Задачи и напоминания"),
                        ],
                        default="basics",
                        max_length=20,
                        verbose_name="Категория",
                    ),
                ),
                (
                    "reading_time_minutes",
                    models.PositiveSmallIntegerField(
                        default=5, verbose_name="Время чтения (мин)"
                    ),
                ),
                ("sections", models.JSONField(default=list, verbose_name="Разделы")),
                ("order", models.PositiveIntegerField(default=0, verbose_name="Порядок")),
                (
                    "is_published",
                    models.BooleanField(default=True, verbose_name="Опубликован"),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Создан"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="Обновлён"),
                ),
            ],
            options={
                "verbose_name": "Статья",
                "verbose_name_plural": "Статьи",
                "ordering": ["order", "title"],
            },
        ),
        migrations.AddIndex(
            model_name="article",
            index=models.Index(
                fields=["category", "is_published"], name="learning_ar_categor_528671_idx"
            ),
        ),
    ]
