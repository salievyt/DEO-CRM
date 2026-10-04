from django.apps import AppConfig


class ClientsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.clients"
    verbose_name = "Клиенты (CRM)"

    def ready(self):
        from auditlog.registry import auditlog
        from .models import Client
        if not auditlog.contains(Client):
            auditlog.register(Client)
