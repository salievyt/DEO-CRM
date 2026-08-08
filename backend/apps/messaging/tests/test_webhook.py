import hashlib
import hmac
import json

import pytest
from django.test import Client as DjangoClient
from django.urls import reverse

from apps.clients.models import Client
from apps.messaging.models import Conversation, Message, WhatsAppAccount
from apps.messaging.models.enums import Direction, MessageStatus, MessageType

WEBHOOK_URL = reverse("whatsapp-webhook")
APP_SECRET = "test-app-secret"


def sign(body: bytes) -> str:
    return "sha256=" + hmac.new(APP_SECRET.encode(), body, hashlib.sha256).hexdigest()


def post_payload(client: DjangoClient, payload: dict):
    body = json.dumps(payload).encode()
    return client.post(
        WEBHOOK_URL,
        data=body,
        content_type="application/json",
        HTTP_X_HUB_SIGNATURE_256=sign(body),
    )


def incoming_payload(text="Здравствуйте, хочу узнать стоимость.", msg_id="wamid.IN1",
                     wa_id="79123456789", profile_name="Иван Петров",
                     phone_number_id="1111222233334444"):
    return {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "999888777",
            "changes": [{
                "field": "messages",
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {
                        "display_phone_number": "+7 900 000-00-00",
                        "phone_number_id": phone_number_id,
                    },
                    "contacts": [{"profile": {"name": profile_name}, "wa_id": wa_id}],
                    "messages": [{
                        "from": wa_id,
                        "id": msg_id,
                        "timestamp": "1700000000",
                        "text": {"body": text},
                        "type": "text",
                    }],
                },
            }],
        }],
    }


def status_payload(status, msg_id="wamid.OUT1"):
    payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "999888777",
            "changes": [{
                "field": "messages",
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {"phone_number_id": "1111222233334444"},
                    "statuses": [{
                        "id": msg_id,
                        "status": status,
                        "timestamp": "1700000001",
                        "recipient_id": "79123456789",
                    }],
                },
            }],
        }],
    }
    if status == "failed":
        payload["entry"][0]["changes"][0]["value"]["statuses"][0]["errors"] = [
            {"code": 131026, "title": "Delivery failure", "message": "Message undeliverable"}
        ]
    return payload


@pytest.fixture
def http_client():
    return DjangoClient()


@pytest.mark.django_db
class TestVerification:
    def test_valid_verify_token(self, http_client):
        response = http_client.get(WEBHOOK_URL, {
            "hub.mode": "subscribe",
            "hub.verify_token": "test-verify-token",
            "hub.challenge": "123456",
        })
        assert response.status_code == 200
        assert response.content.decode() == "123456"

    def test_invalid_verify_token(self, http_client):
        response = http_client.get(WEBHOOK_URL, {
            "hub.mode": "subscribe",
            "hub.verify_token": "wrong",
            "hub.challenge": "123456",
        })
        assert response.status_code == 403


@pytest.mark.django_db
class TestIncomingMessages:
    def test_creates_client_conversation_and_message(self, http_client):
        response = post_payload(http_client, incoming_payload())
        assert response.status_code == 200

        client = Client.objects.get(phone="79123456789")
        assert client.first_name == "Иван"

        conversation = client.messaging_conversations.get(channel="whatsapp")
        assert conversation.unread_count == 1
        assert conversation.status == "open"

        message = conversation.messages.get()
        assert message.direction == Direction.INCOMING
        assert message.text == "Здравствуйте, хочу узнать стоимость."
        assert message.status == MessageStatus.SENT
        assert message.external_message_id == "wamid.IN1"

    def test_duplicate_webhook_is_idempotent(self, http_client):
        payload = incoming_payload()
        post_payload(http_client, payload)
        post_payload(http_client, payload)  # Meta retries delivery

        client = Client.objects.get(phone="79123456789")
        conversation = client.messaging_conversations.get()
        assert conversation.messages.count() == 1
        assert conversation.unread_count == 1

    def test_reuses_existing_client(self, http_client, client):
        payload = incoming_payload(wa_id="79123456789", profile_name="Иван Петров")
        post_payload(http_client, payload)
        assert Client.objects.count() == 1
        assert client.messaging_conversations.count() == 1

    def test_media_message_stored_with_metadata(self, http_client):
        payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "id": "999888777",
                "changes": [{
                    "field": "messages",
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {"phone_number_id": "1111222233334444"},
                        "contacts": [{"profile": {"name": "Анна"}, "wa_id": "79001112233"}],
                        "messages": [{
                            "from": "79001112233",
                            "id": "wamid.MEDIA1",
                            "type": "image",
                            "image": {"id": "MEDIA_ID_1", "mime_type": "image/jpeg", "caption": "Фото"},
                        }],
                    },
                }],
            }],
        }
        assert post_payload(http_client, payload).status_code == 200
        message = Message.objects.get(external_message_id="wamid.MEDIA1")
        assert message.type == MessageType.IMAGE
        assert message.metadata["media_id"] == "MEDIA_ID_1"
        assert message.media_mime == "image/jpeg"

    def test_message_without_sender_skipped(self, http_client):
        payload = incoming_payload()
        payload["entry"][0]["changes"][0]["value"]["messages"][0].pop("from")
        assert post_payload(http_client, payload).status_code == 200
        assert Message.objects.count() == 0

    def test_unknown_event_type_ok(self, http_client):
        payload = incoming_payload()
        payload["entry"][0]["changes"][0]["field"] = "not_messages"
        assert post_payload(http_client, payload).status_code == 200
        assert Message.objects.count() == 0


@pytest.mark.django_db
class TestStatuses:
    def test_sent_delivered_read_lifecycle(self, http_client, make_message):
        make_message(external_message_id="wamid.OUT1", status=MessageStatus.SENT)

        assert post_payload(http_client, status_payload("delivered")).status_code == 200
        assert Message.objects.get(external_message_id="wamid.OUT1").status == MessageStatus.DELIVERED

        assert post_payload(http_client, status_payload("read")).status_code == 200
        assert Message.objects.get(external_message_id="wamid.OUT1").status == MessageStatus.READ

        # Old status must not downgrade.
        assert post_payload(http_client, status_payload("delivered")).status_code == 200
        assert Message.objects.get(external_message_id="wamid.OUT1").status == MessageStatus.READ

    def test_failed_status_saves_error(self, http_client, make_message):
        make_message(external_message_id="wamid.OUT1", status=MessageStatus.SENT)
        assert post_payload(http_client, status_payload("failed")).status_code == 200
        message = Message.objects.get(external_message_id="wamid.OUT1")
        assert message.status == MessageStatus.FAILED
        assert message.error_code == "131026"
        assert message.metadata["errors"]

    def test_unknown_message_status_ignored(self, http_client):
        assert post_payload(http_client, status_payload("delivered", "wamid.UNKNOWN")).status_code == 200
        assert Message.objects.count() == 0


@pytest.mark.django_db
class TestSignature:
    def test_invalid_signature_rejected(self, http_client):
        body = json.dumps(incoming_payload()).encode()
        response = http_client.post(
            WEBHOOK_URL, data=body, content_type="application/json",
            HTTP_X_HUB_SIGNATURE_256="sha256=deadbeef",
        )
        assert response.status_code == 403
        assert Message.objects.count() == 0

    def test_missing_signature_rejected(self, http_client):
        response = http_client.post(
            WEBHOOK_URL, data=json.dumps(incoming_payload()),
            content_type="application/json",
        )
        assert response.status_code == 403

    def test_unknown_account_graceful(self, http_client):
        payload = incoming_payload(phone_number_id="0000000000000000")
        assert post_payload(http_client, payload).status_code == 200
        assert Message.objects.count() == 0
