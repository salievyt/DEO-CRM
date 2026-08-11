import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("learning", "0002_seed_articles"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ArticleRead",
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
                    "read_at",
                    models.DateTimeField(
                        auto_now_add=True, verbose_name="Прочитана"
                    ),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="Обновлена"),
                ),
                (
                    "article",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="reads",
                        to="learning.article",
                        verbose_name="Статья",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="learning_reads",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Пользователь",
                    ),
                ),
            ],
            options={
                "verbose_name": "Прочитанная статья",
                "verbose_name_plural": "Прочитанные статьи",
                "ordering": ["-updated_at"],
                "unique_together": {("user", "article")},
            },
        ),
        migrations.AddIndex(
            model_name="articleread",
            index=models.Index(
                fields=["user", "updated_at"],
                name="learning_ar_user_id_b8e2f3_idx",
            ),
        ),
    ]
