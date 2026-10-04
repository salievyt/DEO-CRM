from django.apps import AppConfig


class MessagingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.messaging"
    verbose_name = "Общение (Messaging)"

    def ready(self):
        from . import deal_link  # noqa: F401
