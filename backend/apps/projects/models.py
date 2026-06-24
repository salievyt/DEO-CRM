import uuid

from django.db import models


class ProjectStatus(models.Model):
    """Project statuses."""
    name = models.CharField(max_length=100, verbose_name="Название")
    order = models.IntegerField(default=0, verbose_name="Порядок")
    color = models.CharField(max_length=7, default="#6366f1", verbose_name="Цвет")

    class Meta:
        verbose_name = "Статус проекта"
        verbose_name_plural = "Статусы проектов"
        ordering = ["order"]

    def __str__(self):
        return self.name


class ServiceType(models.Model):
    """Types of services offered."""
    name = models.CharField(max_length=255, verbose_name="Название")
    description = models.TextField(blank=True, verbose_name="Описание")

    class Meta:
        verbose_name = "Тип услуги"
        verbose_name_plural = "Типы услуг"

    def __str__(self):
        return self.name


class Project(models.Model):
    """Project card."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Название")
    client = models.ForeignKey(
        "clients.Client", on_delete=models.CASCADE, related_name="projects",
        verbose_name="Клиент"
    )
    service_type = models.ForeignKey(
        ServiceType, on_delete=models.SET_NULL, null=True,
        related_name="projects", verbose_name="Тип услуги"
    )
    budget = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        verbose_name="Бюджет"
    )
    cost = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        verbose_name="Себестоимость"
    )
    deadline = models.DateField(null=True, blank=True, verbose_name="Срок")
    status = models.ForeignKey(
        ProjectStatus, on_delete=models.PROTECT, related_name="projects",
        verbose_name="Статус"
    )
    progress = models.IntegerField(default=0, verbose_name="Прогресс (%)")
    description = models.TextField(blank=True, verbose_name="Описание")
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True,
        related_name="created_projects", verbose_name="Создал"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")

    class Meta:
        verbose_name = "Проект"
        verbose_name_plural = "Проекты"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "progress"]),
            models.Index(fields=["client"]),
        ]

    def __str__(self):
        return self.name


class ProjectTeamMember(models.Model):
    """Team member assignment to a project."""
    ROLE_CHOICES = [
        ("pm", "Project Manager"),
        ("developer", "Разработчик"),
        ("designer", "Дизайнер"),
        ("tester", "Тестировщик"),
        ("marketer", "Маркетолог"),
        ("seo", "SEO специалист"),
    ]

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="team",
        verbose_name="Проект"
    )
    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, related_name="project_team_memberships",
        verbose_name="Пользователь"
    )
    role_in_project = models.CharField(
        max_length=50, choices=ROLE_CHOICES, verbose_name="Роль в проекте"
    )
    assigned_at = models.DateTimeField(auto_now_add=True, verbose_name="Назначен")

    class Meta:
        unique_together = ("project", "user")
        verbose_name = "Участник проекта"
        verbose_name_plural = "Участники проекта"

    def __str__(self):
        return f"{self.user} - {self.get_role_in_project_display()}"


class ProjectHistory(models.Model):
    """History of project changes."""
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="history",
        verbose_name="Проект"
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
        verbose_name = "История проекта"
        verbose_name_plural = "Истории проектов"
        ordering = ["-created_at"]
