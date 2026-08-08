"""Test settings: SQLite + in-memory cache + in-memory channel layer.

Run: pytest --ds=config.settings.test apps/messaging
"""
from .base import *  # noqa: F403, F401

DEBUG = False

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "test_db.sqlite3",
    }
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "deo-crm-test",
    }
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Rate limiting in tests: high thresholds, non-blocking anyway.
RATELIMIT_ENABLE = False

WHATSAPP_API_VERSION = "v21.0"
WHATSAPP_ACCESS_TOKEN = "test-access-token"
WHATSAPP_PHONE_NUMBER_ID = "1111222233334444"
WHATSAPP_BUSINESS_ACCOUNT_ID = "999888777"
WHATSAPP_WEBHOOK_VERIFY_TOKEN = "test-verify-token"
WHATSAPP_WEBHOOK_APP_SECRET = "test-app-secret"
