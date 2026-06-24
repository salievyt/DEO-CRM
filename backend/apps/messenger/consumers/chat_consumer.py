import json

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class ChatConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time chat."""

    async def connect(self):
        self.chat_id = self.scope["url_route"]["kwargs"]["chat_id"]
        self.room_group_name = f"chat_{self.chat_id}"

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name,
        )

    async def receive(self, text_data):
        """Receive message from WebSocket."""
        data = json.loads(text_data)
        message_type = data.get("type", "message")

        if message_type == "message":
            # Save message to database and broadcast
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat.message",
                    "message": data["message"],
                    "sender_id": self.scope["user"].id,
                    "sender_name": self.scope["user"].get_full_name(),
                },
            )
        elif message_type == "typing":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat.typing",
                    "user_id": str(self.scope["user"].id),
                    "user_name": self.scope["user"].get_full_name(),
                },
            )

    async def chat_message(self, event):
        """Broadcast message to chat group."""
        await self.send(text_data=json.dumps({
            "type": "message",
            "message": event["message"],
            "sender_id": event["sender_id"],
            "sender_name": event["sender_name"],
        }))

    async def chat_typing(self, event):
        """Broadcast typing indicator."""
        await self.send(text_data=json.dumps({
            "type": "typing",
            "user_id": event["user_id"],
            "user_name": event["user_name"],
        }))
