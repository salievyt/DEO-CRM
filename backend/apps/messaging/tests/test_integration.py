"""End-to-end flows:

1. Webhook inbound → client + conversation + message + realtime events.
2. Manager sends a message → webhook status → status updated + realtime event.
"""
import hashlib
import hmac
import json

import pytest
from django.test import Client
from django.urls import reverse
from unittest import mock

from apps.messaging.models import Message
from apps.messaging.models.enums import Direction, MessageStatus

WEBHOOK_URL = reverse("whatsapp-webhook")


def sign(body: bytes) -> str:
    return "sha256=" + hmac.new(b"test-app-secret", body, hashlib.sha256).hexdigest()


def post_payload(client, payload):
    body = json.dumps(payload).encode()
    return client.post(
        WEBHOOK_URL, data=body, content_type="application/json",
        HTTP_X_HUB_SIGNATURE_256=sign(body),
    )


@pytest.fixture
def http_client():
    return Client()


@pytest.mark.django_db
class TestInboundFlow:
    def test_inbound_creates_everything_and_emits_events(
        self, http_client, whatsapp_account
    ):
        payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "id": "999888777",
                "changes": [{
                    "field": "messages",
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {"phone_number_id": "1111222233334444"},
                        "contacts": [{"profile": {"name": "Иван Петров"}, "wa_id": "79123456789"}],
                        "messages": [{
                            "from": "79123456789", "id": "wamid.INBOUND_FLOW",
                            "type": "text", "text": {"body": "Сколько стоит сайт?"},
                        }],
                    },
                }],
            }],
        }

        # notify is imported by name into both consumers; patch each module.
        with mock.patch("apps.messaging.services.conversations.notify") as conv_notify, \
                mock.patch("apps.messaging.webhooks.whatsapp.notify") as wb_notify:
            response = post_payload(http_client, payload)
        assert response.status_code == 200

        message = Message.objects.get(external_message_id="wamid.INBOUND_FLOW")
        assert message.direction == Direction.INCOMING
        assert message.conversation.unread_count == 1

        # message.created + conversation.updated events emitted once each.
        events = ([c.args[1] for c in conv_notify.call_args_list]
                  + [c.args[1] for c in wb_notify.call_args_list])
        assert events.count("message.created") == 1
        assert events.count("conversation.updated") == 1

        # Duplicate delivery → no new events, no duplicate rows.
        with mock.patch("apps.messaging.services.conversations.notify") as conv2, \
                mock.patch("apps.messaging.webhooks.whatsapp.notify") as wb2:
            post_payload(http_client, payload)
        assert conv2.call_count == 0 and wb2.call_count == 0
        assert Message.objects.filter(external_message_id="wamid.INBOUND_FLOW").count() == 1
        message.conversation.refresh_from_db()
        assert message.conversation.unread_count == 1


@pytest.mark.django_db
class TestOutboundFlow:
    def test_send_then_status_webhook_updates(self, api_client, staff_user,
                                              conversation, make_message,
                                              http_client):
        from apps.messaging.views import messages as messages_views

        # 1. Manager sends a text message (WhatsApp API mocked).
        with mock.patch.object(messages_views, "WhatsAppService") as svc_cls:
            svc_cls.return_value.send_text_message.return_value = {
                "external_message_id": "wamid.OUT_FLOW"
            }
            api_client.force_authenticate(staff_user)
            url = reverse(
                "messaging-conversation-messages",
                kwargs={"conversation_pk": conversation.id},
            )
            response = api_client.post(url, {"text": "Добрый день!"}, format="json")

        assert response.status_code == 201
        message = Message.objects.get(conversation=conversation, direction=Direction.OUTGOING)
        assert message.status == MessageStatus.SENT
        assert message.external_message_id == "wamid.OUT_FLOW"

        # 2. WhatsApp delivers the status webhook.
        status_payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "id": "999888777",
                "changes": [{
                    "field": "messages",
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {"phone_number_id": "1111222233334444"},
                        "statuses": [{
                            "id": "wamid.OUT_FLOW", "status": "read",
                            "timestamp": "1700000001", "recipient_id": "79123456789",
                        }],
                    },
                }],
            }],
        }
        with mock.patch("apps.messaging.webhooks.whatsapp.notify") as notify:
            assert post_payload(http_client, status_payload).status_code == 200

        message.refresh_from_db()
        assert message.status == MessageStatus.READ
        events = [c.args[1] for c in notify.call_args_list]
        assert "message.status.updated" in events
