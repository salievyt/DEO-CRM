"""ASGI configuration for DEO STUDIO CRM with Channels support."""
import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

django_asgi_app = get_asgi_application()

import apps.messaging.routing  # noqa: E402
import apps.messenger.routing  # noqa: E402

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            apps.messenger.routing.websocket_urlpatterns
            + apps.messaging.routing.websocket_urlpatterns
        )
    ),
})
