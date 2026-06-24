"""Celery configuration for DEO STUDIO CRM."""
import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

app = Celery("deo_crm")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
