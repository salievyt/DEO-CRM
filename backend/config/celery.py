"""Celery configuration for DEO STUDIO CRM."""
import os

from celery import Celery

default_settings = (
    "config.settings.production" if os.environ.get("VERCEL") else "config.settings.local"
)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", default_settings)

app = Celery("deo_crm")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
