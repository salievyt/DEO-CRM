import uuid

from django.conf import settings
from django.db import models


class EmployeeProfile(models.Model):
    """Extended employee information — contacts, skills, documents, photo."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="profile", verbose_name="Пользователь"
    )
    photo = models.ImageField(
        upload_to="employees/photos/", blank=True, verbose_name="Фотография"
    )
    bio = models.TextField(blank=True, verbose_name="О себе")
    skills = models.JSONField(default=list, blank=True, verbose_name="Навыки")
    social_links = models.JSONField(default=dict, blank=True, verbose_name="Социальные сети")
    birth_date = models.DateField(null=True, blank=True, verbose_name="Дата рождения")
    emergency_contact = models.CharField(
        max_length=255, blank=True, verbose_name="Контакт для экстренной связи"
    )
    notes = models.TextField(blank=True, verbose_name="Заметки")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлён")

    class Meta:
        verbose_name = "Профиль сотрудника"
        verbose_name_plural = "Профили сотрудников"

    def __str__(self):
        return f"Профиль: {self.user.get_full_name() or self.user.email}"


class EmployeeCertificate(models.Model):
    """Certificate / diploma uploaded for an employee."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        EmployeeProfile, on_delete=models.CASCADE, related_name="certificates",
        verbose_name="Профиль"
    )
    title = models.CharField(max_length=255, verbose_name="Название")
    issuer = models.CharField(max_length=255, blank=True, verbose_name="Организация")
    file = models.FileField(
        upload_to="employees/certificates/", verbose_name="Файл"
    )
    issued_date = models.DateField(null=True, blank=True, verbose_name="Дата выдачи")
    expires_date = models.DateField(null=True, blank=True, verbose_name="Срок действия")
    description = models.TextField(blank=True, verbose_name="Описание")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "Сертификат"
        verbose_name_plural = "Сертификаты"
        ordering = ["-issued_date", "-created_at"]

    def __str__(self):
        return self.title
