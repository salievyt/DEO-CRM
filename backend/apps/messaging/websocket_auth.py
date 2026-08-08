"""Channels middleware that authenticates WebSocket users via a JWT token
passed in the query string (the frontend stores JWT in localStorage, not in
session cookies).

Usage in ``config/asgi.py``:

    websocket: JWTAuthMiddleware(AuthMiddlewareStack(URLRouter(urlpatterns)))

If no ``?token=`` is present the inner AuthMiddlewareStack behavior
(session cookies) is preserved for the existing chat/notification consumers.
"""
import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger("messaging.websocket")


class JWTAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query = parse_qs(scope.get("query_string", b"").decode())
        token = (query.get("token") or [None])[0]
        if token:
            scope["user"] = await self._user_from_token(token)
        elif "user" not in scope:
            scope["user"] = AnonymousUser()
        return await self.inner(scope, receive, send)

    @staticmethod
    @database_sync_to_async
    def _user_from_token(token):
        from django.contrib.auth import get_user_model

        from rest_framework_simplejwt.tokens import AccessToken

        try:
            access = AccessToken(token)
            User = get_user_model()
            return User.objects.get(pk=access["user_id"], is_active=True)
        except Exception:
            return AnonymousUser()
