import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer


class InboxConsumer(AsyncWebsocketConsumer):
    """Real-time inbox updates for one user.

    Connect: ``/ws/inbox/?token=<jwt>``
    Events: ``message.created``, ``message.status.updated``,
    ``conversation.created``, ``conversation.updated``.
    """

    async def connect(self):
        user = self.scope.get("user")
        if not user or not getattr(user, "is_authenticated", False):
            await self.close(code=4001)
            return
        if not await self._user_has_inbox_access(user):
            await self.close(code=4003)
            return

        self.user_id = str(user.id)
        self.room_group_name = f"inbox_{self.user_id}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name, self.channel_name
            )

    async def inbox_event(self, event):
        """Handler for group_send events from the realtime service."""
        await self.send(text_data=json.dumps({
            "event": event["event"],
            "data": event.get("data", {}),
        }, ensure_ascii=False))

    @database_sync_to_async
    def _user_has_inbox_access(self, user) -> bool:
        return (
            user.role is not None
            and user.role.name in {
                "superadmin", "owner", "project_manager", "marketer"
            }
        )
