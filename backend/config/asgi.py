"""ASGI configuration for DEO STUDIO CRM with Channels support."""
import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.docker")

django_asgi_app = get_asgi_application()

import apps.messaging.routing  # noqa: E402
import apps.messaging.websocket_auth  # noqa: E402
import apps.messenger.routing  # noqa: E402

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    # JWTAuthMiddleware authenticates via ?token=<jwt> (frontend stores JWT in
    # localStorage); without a token it falls back to session cookies.
    "websocket": apps.messaging.websocket_auth.JWTAuthMiddleware(
        AuthMiddlewareStack(
            URLRouter(
                apps.messenger.routing.websocket_urlpatterns
                + apps.messaging.routing.websocket_urlpatterns
            )
        )
    ),
})
