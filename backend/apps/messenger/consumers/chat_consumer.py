import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer


class ChatConsumer(AsyncWebsocketConsumer):
    """Realtime chat socket (``/ws/chat/<chat_id>/?token=<jwt>``).

    Receives ``chat.message`` / ``chat.typing`` / ``chat.read`` events from the
    channel layer and forwards them to the connected client. Client frames:

    - ``{"type": "typing", "is_typing": true}``
    - ``{"type": "read"}``

    Messages themselves are created through the REST API, which persists them
    and broadcasts to the same group.
    """

    async def connect(self):
        user = self.scope.get("user")
        if not user or not getattr(user, "is_authenticated", False):
            await self.close(code=4001)
            return

        self.chat_id = self.scope["url_route"]["kwargs"]["chat_id"]
        if not await self._is_participant(user, self.chat_id):
            await self.close(code=4003)
            return

        self.room_group_name = f"chat_{self.chat_id}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name, self.channel_name
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except (TypeError, ValueError):
            return

        user = self.scope["user"]
        message_type = data.get("type", "")

        if message_type == "typing":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat.typing",
                    "user_id": str(user.id),
                    "user_name": user.get_full_name(),
                    "is_typing": bool(data.get("is_typing", True)),
                },
            )
        elif message_type == "read":
            last_read_at = await self._mark_read(user, self.chat_id)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat.read",
                    "user_id": str(user.id),
                    "last_read_at": last_read_at.isoformat() if last_read_at else None,
                },
            )

    async def chat_message(self, event):
        await self.send(
            text_data=json.dumps(
                {"type": "message", "message": event["message"]},
                ensure_ascii=False,
            )
        )

    async def chat_typing(self, event):
        # Don't echo the typing indicator back to its author.
        if event.get("user_id") == str(self.scope["user"].id):
            return
        await self.send(
            text_data=json.dumps(
                {
                    "type": "typing",
                    "user_id": event["user_id"],
                    "user_name": event.get("user_name", ""),
                    "is_typing": event.get("is_typing", True),
                },
                ensure_ascii=False,
            )
        )

    async def chat_read(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "read",
                    "user_id": event["user_id"],
                    "last_read_at": event.get("last_read_at"),
                },
                ensure_ascii=False,
            )
        )

    @database_sync_to_async
    def _is_participant(self, user, chat_id) -> bool:
        from apps.messenger.models import ChatParticipant

        return ChatParticipant.objects.filter(chat_id=chat_id, user=user).exists()

    @database_sync_to_async
    def _mark_read(self, user, chat_id):
        from django.utils import timezone

        from apps.messenger.models import ChatParticipant

        now = timezone.now()
        ChatParticipant.objects.filter(chat_id=chat_id, user=user).update(
            last_read_at=now
        )
        return now
