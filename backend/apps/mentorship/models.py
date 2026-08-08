import uuid

from django.conf import settings
from django.db import models


class MentorshipPair(models.Model):
    """Mentor ↔ Mentee pairing."""

    class StatusChoices(models.TextChoices):
        ACTIVE = "active", "Активен"
        COMPLETED = "completed", "Завершён"
        PAUSED = "paused", "Приостановлен"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mentor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="mentor_pairs", verbose_name="Наставник"
    )
    mentee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="mentee_pairs", verbose_name="Новичок"
    )
    status = models.CharField(
        max_length=20, choices=StatusChoices.choices,
        default=StatusChoices.ACTIVE, verbose_name="Статус"
    )
    started_at = models.DateField(verbose_name="Дата начала")
    completed_at = models.DateField(null=True, blank=True, verbose_name="Дата завершения")
    notes = models.TextField(blank=True, verbose_name="Заметки")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлён")

    class Meta:
        verbose_name = "Пара наставник-новичок"
        verbose_name_plural = "Пары наставник-новичок"
        ordering = ["-created_at"]
        unique_together = ("mentor", "mentee")

    def __str__(self):
        return f"{self.mentor.get_full_name()} → {self.mentee.get_full_name()}"


class Checklist(models.Model):
    """Adaptation checklist template."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, verbose_name="Название")
    description = models.TextField(blank=True, verbose_name="Описание")
    is_default = models.BooleanField(default=False, verbose_name="По умолчанию")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлён")

    class Meta:
        verbose_name = "Чек-лист адаптации"
        verbose_name_plural = "Чек-листы адаптации"
        ordering = ["title"]

    def __str__(self):
        return self.title


class ChecklistItem(models.Model):
    """Individual item in an adaptation checklist."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    checklist = models.ForeignKey(
        Checklist, on_delete=models.CASCADE, related_name="items",
        verbose_name="Чек-лист"
    )
    title = models.CharField(max_length=255, verbose_name="Название")
    description = models.TextField(blank=True, verbose_name="Описание")
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок")
    is_required = models.BooleanField(default=True, verbose_name="Обязательный")

    class Meta:
        verbose_name = "Пункт чек-листа"
        verbose_name_plural = "Пункты чек-листа"
        ordering = ["order"]

    def __str__(self):
        return self.title


class MenteeChecklistProgress(models.Model):
    """Tracks a mentee's progress on a checklist."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pair = models.ForeignKey(
        MentorshipPair, on_delete=models.CASCADE, related_name="checklist_progress",
        verbose_name="Пара"
    )
    checklist = models.ForeignKey(
        Checklist, on_delete=models.CASCADE, verbose_name="Чек-лист"
    )

    class Meta:
        verbose_name = "Прогресс чек-листа"
        verbose_name_plural = "Прогресс чек-листов"
        unique_together = ("pair", "checklist")

    def __str__(self):
        return f"{self.pair} — {self.checklist}"

    @property
    def total_items(self):
        return self.checklist.items.count()

    @property
    def completed_items(self):
        return self.items.filter(completed=True).count()

    @property
    def progress_percent(self):
        total = self.total_items
        if total == 0:
            return 100
        return int((self.completed_items / total) * 100)


class MenteeChecklistItemProgress(models.Model):
    """Tracks completion of individual checklist items for a mentee."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    progress = models.ForeignKey(
        MenteeChecklistProgress, on_delete=models.CASCADE,
        related_name="items", verbose_name="Прогресс"
    )
    item = models.ForeignKey(
        ChecklistItem, on_delete=models.CASCADE, verbose_name="Пункт"
    )
    completed = models.BooleanField(default=False, verbose_name="Выполнено")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="Дата выполнения")
    notes = models.TextField(blank=True, verbose_name="Заметки")

    class Meta:
        verbose_name = "Прогресс пункта"
        verbose_name_plural = "Прогресс пунктов"
        unique_together = ("progress", "item")

    def __str__(self):
        return f"{self.item.title}: {'✓' if self.completed else '○'}"


class MenteeTask(models.Model):
    """Task assigned to a mentee as part of adaptation."""

    class StatusChoices(models.TextChoices):
        PENDING = "pending", "Ожидает"
        IN_PROGRESS = "in_progress", "В работе"
        REVIEW = "review", "На проверке"
        DONE = "done", "Выполнено"
        OVERDUE = "overdue", "Просрочено"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pair = models.ForeignKey(
        MentorshipPair, on_delete=models.CASCADE, related_name="tasks",
        verbose_name="Пара"
    )
    title = models.CharField(max_length=255, verbose_name="Название")
    description = models.TextField(blank=True, verbose_name="Описание")
    status = models.CharField(
        max_length=20, choices=StatusChoices.choices,
        default=StatusChoices.PENDING, verbose_name="Статус"
    )
    deadline = models.DateField(null=True, blank=True, verbose_name="Срок")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="Дата выполнения")
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлён")

    class Meta:
        verbose_name = "Задача новичка"
        verbose_name_plural = "Задачи новичка"
        ordering = ["order", "created_at"]

    def __str__(self):
        return self.title


class MenteeEvaluation(models.Model):
    """Evaluation/rating of a mentee's progress."""

    class RatingChoices(models.IntegerChoices):
        ONE = 1, "1 — Требуется много работы"
        TWO = 2, "2 — Ниже ожиданий"
        THREE = 3, "3 — Удовлетворительно"
        FOUR = 4, "4 — Хорошо"
        FIVE = 5, "5 — Отлично"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pair = models.ForeignKey(
        MentorshipPair, on_delete=models.CASCADE, related_name="evaluations",
        verbose_name="Пара"
    )
    rating = models.IntegerField(choices=RatingChoices.choices, verbose_name="Оценка")
    comment = models.TextField(blank=True, verbose_name="Комментарий")
    evaluated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        verbose_name="Оценщик"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "Оценка новичка"
        verbose_name_plural = "Оценки новичков"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.pair.mentee.get_full_name()} — {self.rating}/5"
