import uuid

from django.db import models


class TaskStatus(models.Model):
    """Task statuses."""
    name = models.CharField(max_length=100, verbose_name="Название")
    order = models.IntegerField(default=0, verbose_name="Порядок")
    color = models.CharField(max_length=7, default="#6366f1", verbose_name="Цвет")

    class Meta:
        verbose_name = "Статус задачи"
        verbose_name_plural = "Статусы задач"
        ordering = ["order"]

    def __str__(self):
        return self.name


class TaskPriority(models.Model):
    """Task priorities."""
    name = models.CharField(max_length=50, verbose_name="Название")
    level = models.IntegerField(default=0, verbose_name="Уровень")
    color = models.CharField(max_length=7, default="#6366f1", verbose_name="Цвет")

    class Meta:
        verbose_name = "Приоритет"
        verbose_name_plural = "Приоритеты"
        ordering = ["level"]

    def __str__(self):
        return self.name


class Task(models.Model):
    """Task with subtask support."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    parent_task = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True,
        related_name="subtasks", verbose_name="Родительская задача"
    )
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="tasks",
        verbose_name="Проект"
    )
    title = models.CharField(max_length=255, verbose_name="Название")
    description = models.TextField(blank=True, verbose_name="Описание")
    assignee = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="assigned_tasks", verbose_name="Исполнитель"
    )
    reviewer = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="reviewed_tasks", verbose_name="Проверяющий"
    )
    status = models.ForeignKey(
        TaskStatus, on_delete=models.PROTECT, related_name="tasks",
        verbose_name="Статус"
    )
    priority = models.ForeignKey(
        TaskPriority, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="tasks", verbose_name="Приоритет"
    )
    deadline = models.DateField(null=True, blank=True, verbose_name="Срок")
    estimated_hours = models.DecimalField(
        max_digits=6, decimal_places=1, null=True, blank=True,
        verbose_name="Оценка (часы)"
    )
    actual_hours = models.DecimalField(
        max_digits=6, decimal_places=1, null=True, blank=True,
        verbose_name="Факт (часы)"
    )
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True,
        related_name="created_tasks", verbose_name="Создал"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")

    class Meta:
        verbose_name = "Задача"
        verbose_name_plural = "Задачи"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["project", "status"]),
            models.Index(fields=["assignee", "status"]),
            models.Index(fields=["deadline"]),
        ]

    def __str__(self):
        return self.title


class TaskAttachment(models.Model):
    """Files attached to a task."""
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name="attachments",
        verbose_name="Задача"
    )
    file_url = models.URLField(verbose_name="URL файла")
    file_name = models.CharField(max_length=255, verbose_name="Имя файла")
    uploaded_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True,
        verbose_name="Загрузил"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "Вложение"
        verbose_name_plural = "Вложения"


class TaskComment(models.Model):
    """Comments on a task."""
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name="comments",
        verbose_name="Задача"
    )
    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, verbose_name="Пользователь"
    )
    content = models.TextField(verbose_name="Содержание")
    parent_comment = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True,
        related_name="replies", verbose_name="Ответ на"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")

    class Meta:
        verbose_name = "Комментарий"
        verbose_name_plural = "Комментарии"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.user}: {self.content[:50]}..."


class TaskHistory(models.Model):
    """History of task changes."""
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name="history",
        verbose_name="Задача"
    )
    user = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True,
        verbose_name="Пользователь"
    )
    field_changed = models.CharField(max_length=100, verbose_name="Поле")
    old_value = models.TextField(blank=True, verbose_name="Старое значение")
    new_value = models.TextField(blank=True, verbose_name="Новое значение")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "История задачи"
        verbose_name_plural = "Истории задач"
        ordering = ["-created_at"]


class TaskTimer(models.Model):
    """Time tracking for tasks."""
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name="timers",
        verbose_name="Задача"
    )
    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, verbose_name="Пользователь"
    )
    start_time = models.DateTimeField(verbose_name="Начало")
    end_time = models.DateTimeField(null=True, blank=True, verbose_name="Конец")
    duration_seconds = models.IntegerField(default=0, verbose_name="Длительность (сек)")
    note = models.TextField(blank=True, verbose_name="Заметка")
    is_running = models.BooleanField(default=False, verbose_name="Активен")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Таймер"
        verbose_name_plural = "Таймеры"
        ordering = ["-start_time"]
