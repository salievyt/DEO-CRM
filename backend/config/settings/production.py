from .base import *  # noqa: F403, F401

DEBUG = False

ALLOWED_HOSTS = os.environ.get(  # noqa: F405
    "DJANGO_ALLOWED_HOSTS",
    "crm.backend.deo-core.codes,.vercel.app",
).split(",")

CORS_ALLOWED_ORIGINS = os.environ.get(  # noqa: F405
    "CORS_ALLOWED_ORIGINS",
    "https://crm.deo-core.codes",
).split(",")
CSRF_TRUSTED_ORIGINS = os.environ.get(  # noqa: F405
    "CSRF_TRUSTED_ORIGINS",
    "https://crm.deo-core.codes,https://crm.backend.deo-core.codes",
).split(",")

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Shareable form links point to the deployed frontend by default.
FORMS_PUBLIC_BASE_URL = os.environ.get(  # noqa: F405
    "FORMS_PUBLIC_BASE_URL",
    "https://crm.deo-core.codes",
).rstrip("/")
