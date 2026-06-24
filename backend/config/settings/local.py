from .base import *  # noqa: F403, F401

DEBUG = True

INSTALLED_APPS += [
    "django_extensions",
]

# SQLite for local development fallback
if not DATABASES["default"].get("NAME"):
    DATABASES["default"] = {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }

# Use local memory cache (no Redis required for local dev)
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "deo-crm-local",
    }
}

# Disable HTTPS redirect for local
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
