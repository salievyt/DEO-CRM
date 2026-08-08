import uuid

from django.conf import settings
from django.db import models


class Team(models.Model):
    """Studio team/department with hierarchical structure."""

    class TeamType(models.TextChoices):
        DEPARTMENT = "department", "Отдел"
        TEAM = "team", "Команда"
        GROUP = "group", "Группа"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Название")
    description = models.TextField(blank=True, verbose_name="Описание")
    team_type = models.CharField(
        max_length=20, choices=TeamType.choices,
        default=TeamType.TEAM, verbose_name="Тип"
    )
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True,
        related_name="children", verbose_name="Вышестоящее подразделение"
    )
    head = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="headed_teams", verbose_name="Руководитель"
    )
    color = models.CharField(max_length=7, default="#6366f1", verbose_name="Цвет")
    is_active = models.BooleanField(default=True, verbose_name="Активна")
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлён")

    class Meta:
        verbose_name = "Подразделение"
        verbose_name_plural = "Подразделения"
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class TeamMembership(models.Model):
    """User membership in a team."""

    class RoleChoices(models.TextChoices):
        HEAD = "head", "Руководитель"
        DEPUTY = "deputy", "Заместитель"
        MEMBER = "member", "Участник"
        TRAINEE = "trainee", "Стажёр"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(
        Team, on_delete=models.CASCADE, related_name="memberships",
        verbose_name="Подразделение"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="team_memberships", verbose_name="Сотрудник"
    )
    role = models.CharField(
        max_length=20, choices=RoleChoices.choices,
        default=RoleChoices.MEMBER, verbose_name="Роль в команде"
    )
    position = models.CharField(
        max_length=255, blank=True, verbose_name="Должность"
    )
    joined_at = models.DateField(null=True, blank=True, verbose_name="Дата вступления")
    is_active = models.BooleanField(default=True, verbose_name="Активно")

    class Meta:
        verbose_name = "Член команды"
        verbose_name_plural = "Члены команды"
        unique_together = ("team", "user")
        ordering = ["team", "role", "user__first_name"]

    def __str__(self):
        return f"{self.user.get_full_name()} — {self.team.name} ({self.get_role_display()})"
