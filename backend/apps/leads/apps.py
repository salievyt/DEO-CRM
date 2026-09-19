from django.apps import AppConfig


class LeadsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.leads"
    verbose_name = "Лиды и продажи"

    def ready(self):
        from apps.leads import signals  # noqa: F401
