"""Knowledge base: training articles about working with DEO CRM."""

import uuid

from django.conf import settings
from django.db import models


class ArticleCategory(models.TextChoices):
    """Article groups shown as filters on the learning hub page."""

    BASICS = "basics", "Основы"
    SALES = "sales", "Продажи"
    CHANNELS = "channels", "Каналы связи"
    AUTOMATION = "automation", "Автоматизация"
    ANALYTICS = "analytics", "Аналитика"
    TEAM = "team", "Команда"
    TASKS = "tasks", "Задачи и напоминания"


class Article(models.Model):
    """One training article with ordered sections of content blocks.

    ``sections`` is a list of ``{"heading": str, "blocks": [...]}`` where each
    block is one of:

    * ``{"type": "paragraph", "text": str}``
    * ``{"type": "list", "items": [str, ...]}``      — bullet list
    * ``{"type": "steps", "items": [str, ...]}``     — numbered steps
    * ``{"type": "callout", "tone": "info|tip|success|warning", "text": str}``

    The tones are stable string values so the frontend can style them.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, verbose_name="Название")
    slug = models.SlugField(max_length=255, unique=True, verbose_name="Слаг")
    summary = models.TextField(verbose_name="Краткое описание")
    category = models.CharField(
        max_length=20,
        choices=ArticleCategory.choices,
        default=ArticleCategory.BASICS,
        verbose_name="Категория",
    )
    reading_time_minutes = models.PositiveSmallIntegerField(
        default=5, verbose_name="Время чтения (мин)"
    )
    sections = models.JSONField(default=list, verbose_name="Разделы")
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок")
    is_published = models.BooleanField(default=True, verbose_name="Опубликован")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлён")

    class Meta:
        verbose_name = "Статья"
        verbose_name_plural = "Статьи"
        ordering = ["order", "title"]
        indexes = [
            models.Index(fields=["category", "is_published"]),
        ]

    def __str__(self):
        return self.title

    @property
    def section_count(self) -> int:
        return len(self.sections or [])


class ArticleRead(models.Model):
    """Per-user record that an article was opened/read.

    Keeps the reading progress of each user on the backend instead of the
    browser's localStorage — progress follows the user across devices.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="learning_reads",
        verbose_name="Пользователь",
    )
    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name="reads",
        verbose_name="Статья",
    )
    read_at = models.DateTimeField(auto_now_add=True, verbose_name="Прочитана")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлена")

    class Meta:
        verbose_name = "Прочитанная статья"
        verbose_name_plural = "Прочитанные статьи"
        unique_together = ("user", "article")
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["user", "updated_at"]),
        ]

    def __str__(self):
        return f"{self.user} → {self.article}"
