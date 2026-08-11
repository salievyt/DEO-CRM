from django.urls import path

from .telegram import TelegramWebhookView
from .whatsapp import WhatsAppWebhookView

urlpatterns = [
    path("whatsapp/", WhatsAppWebhookView.as_view(), name="whatsapp-webhook"),
    path(
        "telegram/<str:username>/",
        TelegramWebhookView.as_view(),
        name="telegram-webhook",
    ),
]
