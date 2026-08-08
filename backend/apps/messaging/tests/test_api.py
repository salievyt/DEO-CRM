import json
from unittest import mock

import pytest
from django.urls import reverse
from rest_framework import status as http_status

from apps.messaging.models import Conversation, Message, WhatsAppAccount
from apps.messaging.models.enums import ConversationStatus, Direction, MessageStatus, MessageType
from apps.messaging.services.base import TemplateRequiredError
from common.phone import normalize_phone

CONVERSATIONS_URL = reverse("messaging-conversation-list")
UNREAD_URL = reverse("messaging-unread")
ACCOUNTS_URL = reverse("messaging-whatsapp-account-list")
ACCOUNTS_CREATE_URL = reverse("messaging-whatsapp-account-create")
TEMPLATES_URL = reverse("messaging-whatsapp-templates")


def messages_url(conversation):
    return reverse(
        "messaging-conversation-messages", kwargs={"conversation_pk": conversation.id}
    )


def action_url(name, conversation):
    return reverse(name, kwargs={"pk": conversation.id})


@pytest.mark.django_db
class TestPermissions:
    def test_client_role_forbidden(self, api_client, client_user):
        api_client.force_authenticate(client_user)
        assert api_client.get(CONVERSATIONS_URL).status_code == http_status.HTTP_403_FORBIDDEN

    def test_anonymous_forbidden(self, api_client):
        assert api_client.get(CONVERSATIONS_URL).status_code == http_status.HTTP_401_UNAUTHORIZED

    def test_staff_allowed(self, api_client, staff_user):
        api_client.force_authenticate(staff_user)
        assert api_client.get(CONVERSATIONS_URL).status_code == http_status.HTTP_200_OK


@pytest.mark.django_db
class TestConversations:
    def test_list_and_filters(self, api_client, staff_user, conversation):
        api_client.force_authenticate(staff_user)
        response = api_client.get(CONVERSATIONS_URL)
        assert response.status_code == 200
        row = response.data["results"][0]
        assert row["contact_name"] == "Петров Иван"
        assert row["channel"] == "whatsapp"
        assert "assigned_user_name" in row

        assert api_client.get(CONVERSATIONS_URL, {"status": "closed"}).data["results"] == []
        assert api_client.get(CONVERSATIONS_URL, {"search": "Петров"}).data["count"] == 1
        assert api_client.get(CONVERSATIONS_URL, {"unread": "true"}).data["count"] == 0

    def test_assigned_to_me_filter(self, api_client, staff_user, conversation):
        api_client.force_authenticate(staff_user)
        assert api_client.get(CONVERSATIONS_URL, {"assigned": "me"}).data["count"] == 0
        conversation.assigned_user = staff_user
        conversation.save(update_fields=["assigned_user"])
        assert api_client.get(CONVERSATIONS_URL, {"assigned": "me"}).data["count"] == 1

    def test_create_conversation(self, api_client, staff_user, client, whatsapp_account):
        api_client.force_authenticate(staff_user)
        response = api_client.post(CONVERSATIONS_URL, {
            "contact_id": str(client.id),
            "channel": "whatsapp",
        })
        assert response.status_code == 201
        assert response.data["contact_name"] == "Петров Иван"

    def test_create_conversation_returns_existing(self, api_client, staff_user, conversation):
        api_client.force_authenticate(staff_user)
        response = api_client.post(CONVERSATIONS_URL, {
            "contact_id": str(conversation.contact_id),
            "channel": "whatsapp",
        })
        assert response.status_code == 201
        assert response.data["id"] == str(conversation.id)
        assert Conversation.objects.count() == 1

    def test_create_without_account_fails(self, api_client, staff_user, client):
        WhatsAppAccount.objects.all().delete()
        api_client.force_authenticate(staff_user)
        response = api_client.post(CONVERSATIONS_URL, {
            "contact_id": str(client.id), "channel": "whatsapp",
        })
        assert response.status_code == 400

    def test_close_reopen_read(self, api_client, staff_user, conversation):
        api_client.force_authenticate(staff_user)
        assert api_client.post(action_url("messaging-conversation-close", conversation)).status_code == 200
        conversation.refresh_from_db()
        assert conversation.status == ConversationStatus.CLOSED
        assert api_client.post(action_url("messaging-conversation-reopen", conversation)).status_code == 200
        conversation.refresh_from_db()
        assert conversation.status == ConversationStatus.OPEN

    def test_assign_validates_role(self, api_client, staff_user, conversation, client_user):
        api_client.force_authenticate(staff_user)
        # client role cannot be assigned
        response = api_client.post(
            action_url("messaging-conversation-assign", conversation),
            {"user_id": str(client_user.id)},
        )
        assert response.status_code == 400
        response = api_client.post(
            action_url("messaging-conversation-assign", conversation),
            {"user_id": str(staff_user.id)},
        )
        assert response.status_code == 200
        conversation.refresh_from_db()
        assert conversation.assigned_user_id == staff_user.id


@pytest.mark.django_db
class TestFromLead:
    FROM_LEAD_URL = reverse("messaging-conversation-from-lead")

    def test_creates_client_and_conversation(self, api_client, staff_user, lead, whatsapp_account):
        api_client.force_authenticate(staff_user)
        response = api_client.post(self.FROM_LEAD_URL, {"lead_id": str(lead.id)})
        assert response.status_code == 200
        assert response.data["channel"] == "whatsapp"
        assert response.data["contact_name"] == "Смирнова Анна"

        lead.refresh_from_db()
        assert lead.client is not None
        assert normalize_phone(lead.client.phone) == "79031112233"
        assert lead.client.email == "anna@smirnov.test"
        assert lead.client.company_name == "ООО Смирнов"
        conversation = Conversation.objects.get(contact=lead.client, channel="whatsapp")
        assert conversation.whatsapp_account_id == whatsapp_account.id

    def test_reuses_existing_conversation(self, api_client, staff_user, lead, whatsapp_account):
        api_client.force_authenticate(staff_user)
        first = api_client.post(self.FROM_LEAD_URL, {"lead_id": str(lead.id)})
        second = api_client.post(self.FROM_LEAD_URL, {"lead_id": str(lead.id)})
        assert first.data["id"] == second.data["id"]
        assert Conversation.objects.count() == 1

    def test_reuses_linked_client(self, api_client, staff_user, lead, client, whatsapp_account):
        lead.client = client
        lead.save(update_fields=["client"])
        api_client.force_authenticate(staff_user)
        response = api_client.post(self.FROM_LEAD_URL, {"lead_id": str(lead.id)})
        assert response.status_code == 200
        assert response.data["contact_id"] == str(client.id)
        assert Conversation.objects.filter(contact=client).count() == 1

    def test_missing_lead_404(self, api_client, staff_user):
        import uuid

        api_client.force_authenticate(staff_user)
        assert api_client.post(
            self.FROM_LEAD_URL, {"lead_id": str(uuid.uuid4())}
        ).status_code == 404

    def test_without_account_400(self, api_client, staff_user, lead):
        WhatsAppAccount.objects.all().delete()
        api_client.force_authenticate(staff_user)
        assert api_client.post(
            self.FROM_LEAD_URL, {"lead_id": str(lead.id)}
        ).status_code == 400

    def test_client_role_forbidden(self, api_client, client_user, lead):
        api_client.force_authenticate(client_user)
        assert api_client.post(
            self.FROM_LEAD_URL, {"lead_id": str(lead.id)}
        ).status_code == 403


@pytest.mark.django_db
class TestMessages:
    def _patch_service(self, send_return=None, side_effect=None):
        service_mock = mock.Mock()
        service_mock.send_text_message.return_value = (
            send_return if send_return is not None else {"external_message_id": "wamid.OUT1"}
        )
        if side_effect is not None:
            service_mock.send_text_message.side_effect = side_effect
        return mock.patch(
            "apps.messaging.views.messages.WhatsAppService", return_value=service_mock
        )

    def test_send_text_message(self, api_client, staff_user, conversation):
        api_client.force_authenticate(staff_user)
        with self._patch_service() as svc_cls:
            response = api_client.post(
                messages_url(conversation), {"text": "Добрый день!"}, format="json"
            )
        assert response.status_code == 201
        assert response.data["sent"] is True
        message = Message.objects.get(conversation=conversation)
        assert message.direction == Direction.OUTGOING
        assert message.status == MessageStatus.SENT
        assert message.external_message_id == "wamid.OUT1"
        assert message.sender_id == staff_user.id
        # conversation state bumped
        conversation.refresh_from_db()
        assert conversation.last_message_preview == "Добрый день!"

    def test_send_template_required_error(self, api_client, staff_user, conversation):
        api_client.force_authenticate(staff_user)
        err = TemplateRequiredError("Окно закрыто", details={"api_code": 131026})
        with self._patch_service(side_effect=err), mock.patch(
            "apps.messaging.views.messages.MessageListCreateView._templates_for",
            return_value=[{"name": "welcome", "language": "ru", "parameter_count": 1}],
        ):
            response = api_client.post(
                messages_url(conversation), {"text": "hi"}, format="json"
            )
        assert response.status_code == 200
        assert response.data["sent"] is False
        assert response.data["error"]["code"] == "template_required"
        assert response.data["error"]["template_required"] is True
        assert response.data["error"]["templates"][0]["name"] == "welcome"
        message = Message.objects.get(conversation=conversation)
        assert message.status == MessageStatus.FAILED
        assert message.error_code == "template_required"

    def test_send_generic_failure(self, api_client, staff_user, conversation):
        from apps.messaging.services.base import PermanentMessagingError

        api_client.force_authenticate(staff_user)
        with self._patch_service(
            side_effect=PermanentMessagingError("Номер не найден", code="api_131005")
        ):
            response = api_client.post(
                messages_url(conversation), {"text": "hi"}, format="json"
            )
        assert response.status_code == 200
        assert response.data["sent"] is False
        assert response.data["error"]["code"] == "api_131005"

    def test_send_template_message(self, api_client, staff_user, conversation):
        api_client.force_authenticate(staff_user)
        with self._patch_service() as svc_cls:
            svc_cls.return_value.send_template_message.return_value = {
                "external_message_id": "wamid.TPL1"
            }
            response = api_client.post(messages_url(conversation), {
                "template": {"name": "welcome", "language": "ru", "parameters": ["Иван"]},
            }, format="json")
        assert response.status_code == 201
        message = Message.objects.get(conversation=conversation)
        assert message.type == MessageType.TEMPLATE
        assert message.external_message_id == "wamid.TPL1"
        svc_cls.return_value.send_template_message.assert_called_once()

    def test_send_requires_payload(self, api_client, staff_user, conversation):
        api_client.force_authenticate(staff_user)
        response = api_client.post(messages_url(conversation), {}, format="json")
        assert response.status_code == 400

    def test_list_messages(self, api_client, staff_user, conversation, make_message):
        make_message(text="Первое", status=MessageStatus.READ)
        make_message(text="Второе", status=MessageStatus.DELIVERED)
        api_client.force_authenticate(staff_user)
        response = api_client.get(messages_url(conversation))
        assert response.status_code == 200
        texts = [m["text"] for m in response.data["results"]]
        assert texts == ["Первое", "Второе"]  # oldest first

    def test_unread_count(self, api_client, staff_user, conversation):
        conversation.unread_count = 3
        conversation.assigned_user = staff_user
        conversation.save(update_fields=["unread_count", "assigned_user"])
        api_client.force_authenticate(staff_user)
        response = api_client.get(UNREAD_URL)
        assert response.data["total_unread"] == 3


@pytest.mark.django_db
class TestAccounts:
    def test_token_never_returned(self, api_client, staff_user, whatsapp_account):
        api_client.force_authenticate(staff_user)
        response = api_client.get(ACCOUNTS_URL)
        assert response.status_code == 200
        row = response.data["results"][0]
        assert "access_token" not in row
        assert "super-secret-token" not in json.dumps(response.data)

    def test_create_admin_only(self, api_client, staff_user, admin_user):
        payload = {
            "name": "Тест", "business_account_id": "1", "phone_number_id": "2",
            "display_phone_number": "+7 111", "access_token": "tok-123",
        }
        api_client.force_authenticate(staff_user)
        assert api_client.post(ACCOUNTS_CREATE_URL, payload).status_code == 403

        api_client.force_authenticate(admin_user)
        response = api_client.post(ACCOUNTS_CREATE_URL, payload)
        assert response.status_code == 201
        account = WhatsAppAccount.objects.get(pk=response.data["id"])
        assert account.access_token == "tok-123"
        assert account.access_token_encrypted != "tok-123"


@pytest.mark.django_db
class TestTemplates:
    def test_templates_list_cached(self, api_client, staff_user, whatsapp_account):
        templates = [{"name": "welcome", "language": "ru", "parameter_count": 1}]
        api_client.force_authenticate(staff_user)
        with mock.patch(
            "apps.messaging.views.templates.get_cached_templates",
            return_value=templates,
        ) as mocked:
            response = api_client.get(TEMPLATES_URL)
            assert response.status_code == 200
            assert response.data["templates"] == templates
            mocked.assert_called_once()

    def test_templates_without_account(self, api_client, staff_user):
        WhatsAppAccount.objects.all().delete()
        api_client.force_authenticate(staff_user)
        assert api_client.get(TEMPLATES_URL).status_code == 400


@pytest.mark.django_db
class TestMediaProxy:
    def test_media_streams_through_backend(self, api_client, staff_user, conversation, make_message):
        message = make_message(
            direction=Direction.INCOMING,
            type=MessageType.IMAGE,
            media_mime="image/jpeg",
            external_message_id="wamid.MEDIA1",
            status=MessageStatus.SENT,
        )
        message.metadata = {"media_id": "MEDIA_ID_1"}
        message.save(update_fields=["metadata"])

        api_client.force_authenticate(staff_user)
        with mock.patch(
            "apps.messaging.views.messages.WhatsAppService"
        ) as svc_cls:
            svc_cls.return_value.get_media_url.return_value = {
                "url": "https://graph.facebook.com/download", "mime_type": "image/jpeg",
                "file_size": 42,
            }
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

    def test_media_requires_incoming(self, api_client, staff_user, make_message):
        api_client.force_authenticate(staff_user)
        outgoing = make_message(direction=Direction.OUTGOING, status=MessageStatus.SENT)
        response = api_client.get(
            reverse("messaging-message-media", kwargs={"pk": outgoing.id})
        )
        assert response.status_code == 404
