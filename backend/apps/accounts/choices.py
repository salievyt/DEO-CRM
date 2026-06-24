from django.db import models


class RoleChoices(models.TextChoices):
    SUPERADMIN = "superadmin", "Super Admin"
    OWNER = "owner", "Владелец компании"
    PROJECT_MANAGER = "project_manager", "Менеджер проекта"
    DEVELOPER = "developer", "Разработчик"
    DESIGNER = "designer", "Дизайнер"
    MARKETER = "marketer", "Маркетолог"
    CLIENT = "client", "Клиент"
