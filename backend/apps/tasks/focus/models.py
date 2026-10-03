import uuid
from django.conf import settings
from django.db import models


class FocusProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="focus_profile"
    )
    work_minutes = models.PositiveSmallIntegerField(default=25)
    short_break_minutes = models.PositiveSmallIntegerField(default=5)
    long_break_minutes = models.PositiveSmallIntegerField(default=15)
    cycles = models.PositiveSmallIntegerField(default=4)
    daily_goal = models.PositiveSmallIntegerField(default=4)
    theme = models.CharField(max_length=20, default="midnight")
    timer_style = models.CharField(max_length=20, default="digital")
    auto_advance = models.BooleanField(default=False)
    sound = models.CharField(max_length=20, default="none")
    pet = models.CharField(max_length=20, default="bee")
    coins = models.PositiveIntegerField(default=0)
    inventory = models.JSONField(default=list)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "tasks"


class FocusSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="focus_sessions"
    )
    task = models.ForeignKey(
        "tasks.Task",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="focus_sessions",
    )
    timer = models.OneToOneField(
        "tasks.TaskTimer", null=True, blank=True, on_delete=models.SET_NULL
    )
    phase = models.CharField(
        max_length=20,
        choices=[
            ("work", "Работа"),
            ("short_break", "Короткий перерыв"),
            ("long_break", "Длинный перерыв"),
        ],
    )
    status = models.CharField(
        max_length=20,
        default="running",
        choices=[
            ("running", "Идёт"),
            ("paused", "На паузе"),
            ("completed", "Завершена"),
            ("cancelled", "Остановлена"),
        ],
    )
    goal = models.CharField(max_length=300, blank=True)
    result = models.TextField(blank=True)
    planned_seconds = models.PositiveIntegerField()
    elapsed_seconds = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField()
    resumed_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = "tasks"
        ordering = ["-started_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(status__in=["running", "paused"]),
                name="one_active_focus_per_user",
            )
        ]
        indexes = [models.Index(fields=["user", "started_at"])]


class FocusNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="focus_notes"
    )
    task = models.ForeignKey("tasks.Task", null=True, blank=True, on_delete=models.SET_NULL)
    content = models.TextField(max_length=10000)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "tasks"
        ordering = ["-updated_at"]
