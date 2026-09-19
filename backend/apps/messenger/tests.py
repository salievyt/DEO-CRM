import json
from unittest import mock

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import Role
from apps.messenger.models import Chat, ChatParticipant, Message

User = get_user_model()


@pytest.fixture
def roles(db):
    def make(name):
        return Role.objects.get_or_create(name=name)[0]

    return {
        "superadmin": make("superadmin"),
        "project_manager": make("project_manager"),
        "developer": make("developer"),
    }


def _user(role, email, first="Имя", last="Фамилия"):
    return User.objects.create_user(
        username=email, email=email, password="pass1234",
        first_name=first, last_name=last, role=role,
    )


@pytest.fixture
def manager(db, roles):
    return _user(roles["project_manager"], "pm@deo.test", "Менеджер", "Иванов")


@pytest.fixture
def developer(db, roles):
    return _user(roles["developer"], "dev@deo.test", "Разраб", "Петров")


@pytest.fixture
def other(db, roles):
    return _user(roles["developer"], "dev2@deo.test", "Второй", "Сидоров")


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def group_chat(db, manager, developer):
    chat = Chat.objects.create(name="Проект Ромашка", is_group=True, created_by=manager)
    ChatParticipant.objects.create(chat=chat, user=manager)
    ChatParticipant.objects.create(chat=chat, user=developer)
    return chat


# --- Group creation / participant permissions ---------------------------------


@pytest.mark.django_db
def test_developer_cannot_create_group(api, developer):
    api.force_authenticate(developer)
    resp = api.post(
        reverse("chat-list"), {"is_group": True, "name": "Группа"}, format="json"
    )
    assert resp.status_code == 403
    assert Chat.objects.count() == 0


@pytest.mark.django_db
def test_manager_creates_group_with_participants(api, manager, developer):
    api.force_authenticate(manager)
    resp = api.post(
        reverse("chat-list"),
        {"is_group": True, "name": "Группа", "participant_ids": [str(developer.id)]},
        format="json",
    )
    assert resp.status_code == 201, resp.data
    chat = Chat.objects.get()
    assert chat.is_group is True
    assert chat.created_by == manager
    assert set(chat.participants.values_list("user_id", flat=True)) == {
        manager.id, developer.id,
    }


@pytest.mark.django_db
def test_manager_can_add_and_remove_participants(api, manager, other, group_chat):
    api.force_authenticate(manager)
    url = reverse("chat-participants", kwargs={"pk": group_chat.id})
    resp = api.post(url, {"user_ids": [str(other.id)]}, format="json")
    assert resp.status_code == 201, resp.data
    assert ChatParticipant.objects.filter(chat=group_chat, user=other).exists()

    del_url = reverse(
        "chat-participant-detail",
        kwargs={"pk": group_chat.id, "user_id": other.id},
    )
    resp = api.delete(del_url)
    assert resp.status_code == 204
    assert not ChatParticipant.objects.filter(chat=group_chat, user=other).exists()


@pytest.mark.django_db
def test_developer_cannot_add_participants(api, developer, other, group_chat):
    api.force_authenticate(developer)
    url = reverse("chat-participants", kwargs={"pk": group_chat.id})
    resp = api.post(url, {"user_ids": [str(other.id)]}, format="json")
    assert resp.status_code == 403


# --- Messages -----------------------------------------------------------------


@pytest.mark.django_db
def test_send_message_broadcasts(api, manager, group_chat):
    api.force_authenticate(manager)
    url = reverse("chat-messages", kwargs={"chat_pk": group_chat.id})
    with mock.patch("apps.messenger.views.broadcast_message") as broadcast:
        resp = api.post(url, {"content": "Привет"}, format="json")
    assert resp.status_code == 201, resp.data
    assert Message.objects.get().sender == manager
    broadcast.assert_called_once()


@pytest.mark.django_db
def test_non_participant_cannot_send(api, other, group_chat):
    api.force_authenticate(other)
    url = reverse("chat-messages", kwargs={"chat_pk": group_chat.id})
    resp = api.post(url, {"content": "Проникновение"}, format="json")
    assert resp.status_code == 403
    assert Message.objects.count() == 0


@pytest.mark.django_db
def test_mark_read_updates_last_read(api, manager, group_chat):
    api.force_authenticate(manager)
    url = reverse("chat-mark-read", kwargs={"pk": group_chat.id})
    resp = api.post(url, {}, format="json")
    assert resp.status_code == 200
    assert ChatParticipant.objects.get(chat=group_chat, user=manager).last_read_at


@pytest.mark.django_db
def test_developer_cannot_mark_read_foreign_chat(api, other, manager, group_chat):
    api.force_authenticate(other)
    url = reverse("chat-mark-read", kwargs={"pk": group_chat.id})
    resp = api.post(url, {}, format="json")
    assert resp.status_code == 404


# --- Serializer details -------------------------------------------------------


@pytest.mark.django_db
def test_chat_list_exposes_sender_and_display_names(api, manager, developer, group_chat):
    Message.objects.create(chat=group_chat, sender=developer, content="Тестовое")
    api.force_authenticate(manager)
    resp = api.get(reverse("chat-list"))
    results = resp.data.get("results", resp.data)
    chat = results[0]
    assert chat["display_name"] == "Проект Ромашка"
    assert chat["last_message"]["sender_name"] == "Разраб Петров"
    assert {p["user_name"] for p in chat["participants"]} == {
        "Менеджер Иванов", "Разраб Петров",
    }
    assert chat["unread_count"] == 1


# --- WebSocket consumer -------------------------------------------------------


@pytest.mark.django_db
def test_chat_consumer_rejects_anonymous():
    from asgiref.sync import async_to_sync
    from channels.testing import WebsocketCommunicator

    from apps.messenger.consumers import ChatConsumer

    async def scenario():
        communicator = WebsocketCommunicator(
            ChatConsumer.as_asgi(), "/ws/chat/00000000-0000-0000-0000-000000000000/"
        )
        communicator.scope["user"] = AnonymousUser()
        connected, _ = await communicator.connect()
        return connected

    assert async_to_sync(scenario)() is False


@pytest.mark.django_db
def test_chat_consumer_rejects_non_participant(other, group_chat):
    from asgiref.sync import async_to_sync
    from channels.testing import WebsocketCommunicator

    from apps.messenger.consumers import ChatConsumer

    async def scenario():
        communicator = WebsocketCommunicator(
            ChatConsumer.as_asgi(), f"/ws/chat/{group_chat.id}/"
        )
        communicator.scope["user"] = other
        communicator.scope["url_route"] = {"kwargs": {"chat_id": str(group_chat.id)}}
        connected, _ = await communicator.connect()
        return connected

    assert async_to_sync(scenario)() is False


@pytest.mark.django_db
def test_chat_consumer_receives_broadcast(manager, group_chat):
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer
    from channels.testing import WebsocketCommunicator

    from apps.messenger.consumers import ChatConsumer

    async def scenario():
        communicator = WebsocketCommunicator(
            ChatConsumer.as_asgi(), f"/ws/chat/{group_chat.id}/"
        )
        communicator.scope["user"] = manager
        communicator.scope["url_route"] = {"kwargs": {"chat_id": str(group_chat.id)}}
        connected, _ = await communicator.connect()
        assert connected

        layer = get_channel_layer()
        await layer.group_send(
            f"chat_{group_chat.id}",
            {
                "type": "chat.message",
                "message": {"id": "m1", "content": "Привет", "sender_name": "Менеджер"},
            },
        )
        message = await communicator.receive_json_from()
        await communicator.disconnect()
        return message

    message = async_to_sync(scenario)()
    assert message["type"] == "message"
    assert message["message"]["content"] == "Привет"


@pytest.mark.django_db
def test_chat_consumer_read_broadcasts_to_others(manager, developer, group_chat):
    """A ``read`` frame updates last_read_at and fans out to the group."""
    from asgiref.sync import async_to_sync
    from channels.testing import WebsocketCommunicator

    from apps.messenger.consumers import ChatConsumer

    async def scenario():
        sender = WebsocketCommunicator(
            ChatConsumer.as_asgi(), f"/ws/chat/{group_chat.id}/"
        )
        sender.scope["user"] = manager
        sender.scope["url_route"] = {"kwargs": {"chat_id": str(group_chat.id)}}
        connected, _ = await sender.connect()
        assert connected

        watcher = WebsocketCommunicator(
            ChatConsumer.as_asgi(), f"/ws/chat/{group_chat.id}/"
        )
        watcher.scope["user"] = developer
        watcher.scope["url_route"] = {"kwargs": {"chat_id": str(group_chat.id)}}
        connected, _ = await watcher.connect()
        assert connected

        await sender.send_json_to({"type": "read"})
        event = await watcher.receive_json_from(timeout=5)

        await sender.disconnect()
        await watcher.disconnect()
        return event

    event = async_to_sync(scenario)()
    assert event["type"] == "read"
    assert event["user_id"] == str(manager.id)
    assert event["last_read_at"]
    assert ChatParticipant.objects.get(chat=group_chat, user=manager).last_read_at
