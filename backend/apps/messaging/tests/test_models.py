from datetime import timedelta

import pytest
from django.db import IntegrityError
from django.utils import timezone

from apps.messaging.models import Conversation, Message, WhatsAppAccount
from apps.messaging.models.enums import Channel, Direction, MessageStatus, MessageType
from common.phone import normalize_phone


@pytest.mark.django_db
class TestWhatsAppAccount:
    def test_token_is_encrypted_at_rest_and_decryptable(self, whatsapp_account):
        stored = whatsapp_account.access_token_encrypted
        assert stored != "super-secret-token"
        assert "super-secret-token" not in stored
        assert whatsapp_account.access_token == "super-secret-token"

    def test_token_never_leaks_through_str(self, whatsapp_account):
        assert "super-secret-token" not in str(whatsapp_account)
        assert "super-secret-token" not in repr(whatsapp_account)

    def test_default_is_singleton(self, whatsapp_account, db):
        second = WhatsAppAccount(
            name="Второй", business_account_id="1", phone_number_id="2",
            display_phone_number="+7 111", status="active", is_default=True,
        )
        second.save()
        whatsapp_account.refresh_from_db()
        assert whatsapp_account.is_default is False
        assert second.is_default is True

    def test_client_phone_e164_normalized(self, client):
        assert normalize_phone("+7 (912) 345-67-89") == "79123456789"
        assert normalize_phone(client.phone) == "79123456789"
        # RU 8 → 7 conversion
        assert normalize_phone("8 912 345-67-89") == "79123456789"


@pytest.mark.django_db
class TestConversationUniqueness:
    def test_duplicate_whatsapp_conversation_rejected(self, client, whatsapp_account):
        Conversation.objects.create(
            contact=client, channel=Channel.WHATSAPP, whatsapp_account=whatsapp_account
        )
        with pytest.raises(IntegrityError):
            Conversation.objects.create(
                contact=client, channel=Channel.WHATSAPP, whatsapp_account=whatsapp_account
            )

    def test_same_client_different_channels_allowed(self, client):
        Conversation.objects.create(contact=client, channel=Channel.WHATSAPP)
        conv = Conversation.objects.create(contact=client, channel=Channel.TELEGRAM)
        assert conv.channel == Channel.TELEGRAM

    def test_window_open_heuristic(self, client, whatsapp_account):
        conv = Conversation.objects.create(
            contact=client, channel=Channel.WHATSAPP, whatsapp_account=whatsapp_account,
            last_customer_message_at=timezone.now() - timedelta(hours=1),
        )
        assert conv.conversation_window_open() is True

        conv.last_customer_message_at = timezone.now() - timedelta(hours=25)
        assert conv.conversation_window_open() is False

        conv.last_customer_message_at = None
        assert conv.conversation_window_open() is False


@pytest.mark.django_db
class TestMessage:
    def test_external_id_unique(self, make_message, conversation):
        make_message(external_message_id="wamid.1")
        with pytest.raises(IntegrityError):
            Message.objects.create(
                conversation=conversation,
                contact=conversation.contact,
                channel=Channel.WHATSAPP,
                direction=Direction.INCOMING,
                type=MessageType.TEXT,
                external_message_id="wamid.1",
                status=MessageStatus.SENT,
            )

    def test_empty_external_id_allows_multiple(self, make_message):
        make_message(external_message_id="")
        make_message(external_message_id="")
        assert Message.objects.filter(external_message_id="").count() == 2

    def test_str_short(self, make_message):
        m = make_message(text="Привет, как дела?")
        assert "Привет" in str(m)
