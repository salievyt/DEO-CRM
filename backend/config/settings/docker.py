from .base import *  # noqa: F403, F401

DEBUG = os.environ.get("DJANGO_DEBUG", "False").lower() == "true"  # noqa: F405

# PostgreSQL from env
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "deo_crm"),  # noqa: F405
        "USER": os.environ.get("POSTGRES_USER", "deo_crm_user"),  # noqa: F405
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "deo_crm_pass"),  # noqa: F405
        "HOST": os.environ.get("POSTGRES_HOST", "postgres"),  # noqa: F405
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),  # noqa: F405
    }
}

# Security
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
