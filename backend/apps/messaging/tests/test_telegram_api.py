import json
from unittest import mock

import pytest
from django.urls import reverse

from apps.clients.models import Client
from apps.messaging.models import Conversation, Message, TelegramAccount
from apps.messaging.models.enums import Channel, Direction, MessageStatus, MessageType

ACCOUNTS_URL = reverse("messaging-telegram-account-list")
ACCOUNTS_CREATE_URL = reverse("messaging-telegram-account-create")
ACCOUNTS_TEST_URL = reverse("messaging-telegram-account-test")


def account_test_url(pk):
    return reverse("messaging-telegram-account-test-one", kwargs={"pk": pk})


def account_webhook_url(pk):
    return reverse("messaging-telegram-account-webhook", kwargs={"pk": pk})


def telegram_webhook_url(username):
    return reverse("telegram-webhook", kwargs={"username": username})


def messages_url(conversation):
    return reverse(
        "messaging-conversation-messages", kwargs={"conversation_pk": conversation.id}
    )


def make_update(message_id=42, chat_id=987654, text="Здравствуйте!", **message_kwargs):
    # Payload must satisfy aiogram's pydantic models (User.is_bot, Chat.type...).
    message = {
        "message_id": message_id,
        "from": {"id": chat_id, "is_bot": False, "first_name": "Иван",
                 "last_name": "Петров", "username": "ivan_petrov"},
        "chat": {"id": chat_id, "type": "private"},
        "date": 1_700_000_000,
        "text": text,
    }
    message.update(message_kwargs)
    return {"update_id": 1000 + message_id, "message": message}


@pytest.mark.django_db
class TestAccounts:
    def test_token_never_returned(self, api_client, staff_user, telegram_account):
        api_client.force_authenticate(staff_user)
        response = api_client.get(ACCOUNTS_URL)
        assert response.status_code == 200
        row = response.data["results"][0]
        assert "bot_token" not in row
        assert "super-secret-token" not in json.dumps(response.data)
        assert row["bot_username"] == "deo_studio_bot"

    def test_create_admin_only(self, api_client, staff_user, admin_user):
        payload = {"name": "DEO Bot", "bot_token": "123456:tok-123"}
        api_client.force_authenticate(staff_user)
        assert api_client.post(ACCOUNTS_CREATE_URL, payload).status_code == 403

        api_client.force_authenticate(admin_user)
        with mock.patch(
            "apps.messaging.views.telegram_accounts.TelegramService"
        ) as svc_cls:
            svc_cls.return_value.test_connection.return_value = {
                "ok": True, "token_valid": True,
                "bot_username": "deo_studio_bot", "bot_name": "DEO Studio Bot",
            }
            response = api_client.post(ACCOUNTS_CREATE_URL, payload)
        assert response.status_code == 201
        account = TelegramAccount.objects.get(pk=response.data["id"])
        assert account.bot_token == "123456:tok-123"
        assert account.bot_token_encrypted != "123456:tok-123"
        # best-effort getMe enrichment persisted the real bot identity
        assert account.bot_username == "deo_studio_bot"
        assert account.bot_name == "DEO Studio Bot"

    def test_create_offline_still_succeeds(self, api_client, admin_user):
        """Create must not fail when getMe is unreachable (best-effort)."""
        api_client.force_authenticate(admin_user)
        with mock.patch(
            "apps.messaging.views.telegram_accounts.TelegramService"
        ) as svc_cls:
            from apps.messaging.services.base import TemporaryMessagingError

            svc_cls.return_value.test_connection.side_effect = TemporaryMessagingError(
                "Нет соединения"
            )
            response = api_client.post(
                ACCOUNTS_CREATE_URL, {"name": "Офлайн бот", "bot_token": "1:x"}
            )
        assert response.status_code == 201
        account = TelegramAccount.objects.get(pk=response.data["id"])
        assert account.bot_username == ""

    def test_update_without_token_keeps_old(self, api_client, admin_user, telegram_account):
        api_client.force_authenticate(admin_user)
        response = api_client.patch(
            reverse("messaging-telegram-account-detail", kwargs={"pk": telegram_account.id}),
            {"name": "Новое имя"},
        )
        assert response.status_code == 200
        telegram_account.refresh_from_db()
        assert telegram_account.name == "Новое имя"
        assert telegram_account.bot_token == "123456:super-secret-token"


@pytest.mark.django_db
class TestAccountTesting:
    OK_RESULT = {
        "ok": True,
        "token_valid": True,
        "bot_id": 123456,
        "bot_username": "deo_studio_bot",
        "bot_name": "DEO Studio Bot",
    }

    def test_draft_requires_token(self, api_client, admin_user):
        api_client.force_authenticate(admin_user)
        response = api_client.post(ACCOUNTS_TEST_URL, {}, format="json")
        assert response.status_code == 400

    def test_draft_valid(self, api_client, admin_user):
        api_client.force_authenticate(admin_user)
        with mock.patch("apps.messaging.views.telegram_accounts.TelegramService") as svc_cls:
            svc_cls.return_value.test_connection.return_value = self.OK_RESULT
            response = api_client.post(ACCOUNTS_TEST_URL, {
                "bot_token": "123456:draft-token",
            }, format="json")
        assert response.status_code == 200
        assert response.data["ok"] is True
        assert TelegramAccount.objects.count() == 0  # nothing saved
        draft = svc_cls.call_args[0][0]
        assert draft.bot_token == "123456:draft-token"

    def test_saved_account(self, api_client, admin_user, telegram_account):
        api_client.force_authenticate(admin_user)
        with mock.patch("apps.messaging.views.telegram_accounts.TelegramService") as svc_cls:
            svc_cls.return_value.test_connection.return_value = self.OK_RESULT
            response = api_client.post(account_test_url(telegram_account.id))
        assert response.status_code == 200
        assert response.data["ok"] is True
        assert svc_cls.call_args[0][0].id == telegram_account.id

    def test_failure_is_structured(self, api_client, admin_user, telegram_account):
        api_client.force_authenticate(admin_user)
        with mock.patch("apps.messaging.views.telegram_accounts.TelegramService") as svc_cls:
            svc_cls.return_value.test_connection.return_value = {
                "ok": False, "token_valid": False,
                "error": "Неверный или отозванный bot token.",
            }
            response = api_client.post(account_test_url(telegram_account.id))
        assert response.status_code == 200
        assert response.data["ok"] is False
        assert "token" in response.data["error"].lower()

    def test_staff_forbidden_saved_account(self, api_client, staff_user, telegram_account):
        api_client.force_authenticate(staff_user)
        response = api_client.post(account_test_url(telegram_account.id))
        assert response.status_code == 403

    def test_missing_account_404(self, api_client, admin_user):
        import uuid

        api_client.force_authenticate(admin_user)
        assert api_client.post(account_test_url(uuid.uuid4())).status_code == 404


@pytest.mark.django_db
class TestAccountWebhook:
    def test_set_webhook(self, api_client, admin_user, telegram_account):
        api_client.force_authenticate(admin_user)
        with mock.patch(
            "apps.messaging.views.telegram_accounts.TelegramService"
        ) as svc_cls:
            svc_cls.return_value.set_webhook.return_value = {"ok": True}
            response = api_client.post(account_webhook_url(telegram_account.id))
        assert response.status_code == 200
        assert response.data["ok"] is True
        assert "webhooks/telegram/deo_studio_bot/" in response.data["url"]
        telegram_account.refresh_from_db()
        assert telegram_account.webhook_secret  # random secret stored

    def test_get_webhook_info(self, api_client, admin_user, telegram_account):
        api_client.force_authenticate(admin_user)
        with mock.patch(
            "apps.messaging.views.telegram_accounts.TelegramService"
        ) as svc_cls:
            svc_cls.return_value.get_webhook_info.return_value = {
                "url": "https://example.com/webhook/", "pending_update_count": 2,
            }
            response = api_client.get(account_webhook_url(telegram_account.id))
        assert response.status_code == 200
        assert response.data["url"].startswith("https://example.com")
        assert response.data["pending_update_count"] == 2

    def test_webhook_without_token_400(self, api_client, admin_user):
        account = TelegramAccount.objects.create(name="Без токена")
        api_client.force_authenticate(admin_user)
        response = api_client.post(account_webhook_url(account.id))
        assert response.status_code == 400


@pytest.mark.django_db
class TestTelegramSend:
    def test_send_text_dispatches_telegram_service(
        self, api_client, staff_user, telegram_conversation
    ):
        api_client.force_authenticate(staff_user)
        with mock.patch(
            "apps.messaging.views.messages.TelegramService"
        ) as svc_cls:
            svc_cls.return_value.send_text_message.return_value = {
                "external_message_id": "42"
            }
            response = api_client.post(
                messages_url(telegram_conversation), {"text": "Привет!"}, format="json"
            )
        assert response.status_code == 201
        assert response.data["sent"] is True
        message = Message.objects.get(conversation=telegram_conversation)
        assert message.direction == Direction.OUTGOING
        assert message.external_message_id == "42"
        svc_cls.return_value.send_text_message.assert_called_once_with("987654", "Привет!")

    def test_send_without_bot_fails(self, api_client, staff_user, telegram_conversation):
        TelegramAccount.objects.all().delete()
        api_client.force_authenticate(staff_user)
        response = api_client.post(
            messages_url(telegram_conversation), {"text": "Привет!"}, format="json"
        )
        assert response.status_code == 200
        assert response.data["sent"] is False
        assert response.data["error"]["code"] == "no_telegram_account"

    def test_send_template_unsupported(self, api_client, staff_user, telegram_conversation):
        api_client.force_authenticate(staff_user)
        response = api_client.post(messages_url(telegram_conversation), {
            "template": {"name": "welcome", "language": "ru"},
        }, format="json")
        assert response.status_code == 200
        assert response.data["sent"] is False
        assert response.data["error"]["code"] == "templates_unsupported"
        message = Message.objects.get(conversation=telegram_conversation)
        assert message.status == MessageStatus.FAILED


# The dispatcher tests run in a real transaction (no wrapping) because the
# aiogram handler writes to the DB from a thread-pool executor thread — a
# wrapping transaction would lock the SQLite test DB.
DISPATCHER_TESTS = pytest.mark.django_db(transaction=True)


@pytest.mark.django_db
class TestTelegramWebhook:
    @DISPATCHER_TESTS
    def test_incoming_message_creates_client_and_conversation(
        self, api_client, telegram_account
    ):
        response = api_client.post(
            telegram_webhook_url("deo_studio_bot"),
            make_update(), format="json",
            HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN="secret-webhook-token",
        )
        assert response.status_code == 200

        client = Client.objects.get(telegram_chat_id="987654")
        assert client.first_name == "Иван"
        assert client.telegram == "ivan_petrov"
        assert client.source == "telegram"

        conversation = Conversation.objects.get(
            contact=client, channel=Channel.TELEGRAM
        )
        assert conversation.unread_count == 1

        message = Message.objects.get(conversation=conversation)
        assert message.direction == Direction.INCOMING
        assert message.type == MessageType.TEXT
        assert message.text == "Здравствуйте!"
        assert message.external_message_id == "tg:deo_studio_bot:42"

    @DISPATCHER_TESTS
    def test_conversations_scoped_per_bot(self, api_client, telegram_account):
        """A client talking to two different bots gets two conversations."""
        second_bot = TelegramAccount.objects.create(
            name="Второй бот", bot_username="deo_second_bot", status="active"
        )
        second_bot.set_bot_token("654321:token")
        second_bot.save()

        headers = {"HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN": "secret-webhook-token"}
        api_client.post(
            telegram_webhook_url("deo_studio_bot"), make_update(),
            format="json", **headers,
        )
        # Second bot's webhook has no secret configured → accepted.
        api_client.post(
            telegram_webhook_url("deo_second_bot"), make_update(),
            format="json",
        )

        client = Client.objects.get(telegram_chat_id="987654")
        conversations = Conversation.objects.filter(contact=client, channel=Channel.TELEGRAM)
        assert conversations.count() == 2
        assert conversations.filter(telegram_account=telegram_account).exists()
        assert conversations.filter(telegram_account=second_bot).exists()

    @DISPATCHER_TESTS
    def test_duplicate_update_is_idempotent(self, api_client, telegram_account):
        headers = {"HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN": "secret-webhook-token"}
        for _ in range(2):
            response = api_client.post(
                telegram_webhook_url("deo_studio_bot"), make_update(),
                format="json", **headers,
            )
            assert response.status_code == 200
        assert Message.objects.count() == 1

    def test_wrong_secret_403(self, api_client, telegram_account):
        response = api_client.post(
            telegram_webhook_url("deo_studio_bot"), make_update(), format="json",
            HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN="wrong",
        )
        assert response.status_code == 403
        assert Message.objects.count() == 0

    def test_unknown_bot_acknowledged(self, api_client):
        response = api_client.post(
            telegram_webhook_url("unknown_bot"), make_update(), format="json"
        )
        assert response.status_code == 200
        assert Message.objects.count() == 0

    @DISPATCHER_TESTS
    def test_photo_message_stores_file_id(self, api_client, telegram_account):
        update = make_update(
            text=None,
            caption="Фото",
            photo=[
                {"file_id": "small", "file_unique_id": "s1", "width": 100,
                 "height": 100, "file_size": 100},
                {"file_id": "big", "file_unique_id": "b1", "width": 1000,
                 "height": 1000, "file_size": 9999},
            ],
        )
        response = api_client.post(
            telegram_webhook_url("deo_studio_bot"), update, format="json",
            HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN="secret-webhook-token",
        )
        assert response.status_code == 200
        message = Message.objects.get()
        assert message.type == MessageType.IMAGE
        assert message.metadata["file_id"] == "big"
        assert message.text == "Фото"

    def test_malformed_update_acknowledged(self, api_client, telegram_account):
        """An update that aiogram cannot parse must be acked (no retry storm)."""
        response = api_client.post(
            telegram_webhook_url("deo_studio_bot"),
            {"update_id": 999, "message": {"message_id": 1}},  # no chat/date
            format="json",
            HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN="secret-webhook-token",
        )
        assert response.status_code == 200
        assert response.data["ok"] is True
        assert Message.objects.count() == 0

    def test_media_proxy_streams_telegram_file(self, api_client, staff_user,
                                               telegram_account):
        from apps.messaging.services.conversations import (
            find_or_create_conversation,
            get_or_create_telegram_client,
        )

        client = get_or_create_telegram_client(777, first_name="Анна", username="anna")
        conversation = find_or_create_conversation(
            telegram_account, client, Channel.TELEGRAM
        )
        message = Message.objects.create(
            conversation=conversation, contact=client, channel=Channel.TELEGRAM,
            direction=Direction.INCOMING, type=MessageType.IMAGE,
            media_mime="image/jpeg", external_message_id="tg:deo_studio_bot:99",
            status=MessageStatus.SENT,
            metadata={"file_id": "FILE1", "bot_username": "deo_studio_bot"},
        )
        api_client.force_authenticate(staff_user)
        with mock.patch(
            "apps.messaging.views.messages.TelegramService"
        ) as svc_cls:
            svc_cls.return_value.get_file.return_value = {"file_path": "photos/file.jpg",
                                                         "file_size": 42}
            svc_cls.return_value.get_file_url.return_value = (
                "https://api.telegram.org/file/botX/photos/file.jpg"
            )
            with mock.patch(
                "apps.messaging.views.messages.requests.get"
            ) as req_get:
                req_get.return_value.status_code = 200
                req_get.return_value.iter_content.return_value = [b"data"]
                response = api_client.get(
                    reverse("messaging-message-media", kwargs={"pk": message.id})
                )
        assert response.status_code == 200
        assert response["Content-Disposition"].startswith('inline; filename=')
