import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Role
from apps.clients.models import Client
from apps.leads.models import Lead, LeadStage
from apps.messaging.models import Conversation, Message, TelegramAccount, WhatsAppAccount
from apps.messaging.models.enums import Channel, ConversationStatus, Direction, MessageType

User = get_user_model()


@pytest.fixture
def roles(db):
    def make(name):
        return Role.objects.get_or_create(name=name)[0]

    return {
        "superadmin": make("superadmin"),
        "project_manager": make("project_manager"),
        "marketer": make("marketer"),
        "client": make("client"),
    }


@pytest.fixture
def staff_user(db, roles):
    return User.objects.create_user(
        username="manager@deo.test", email="manager@deo.test", password="pass1234",
        first_name="Менеджер", last_name="Иванов", role=roles["project_manager"],
    )


@pytest.fixture
def admin_user(db, roles):
    return User.objects.create_user(
        username="admin@deo.test", email="admin@deo.test", password="pass1234",
        first_name="Админ", last_name="Системы", role=roles["superadmin"],
    )


@pytest.fixture
def client_user(db, roles):
    return User.objects.create_user(
        username="client@deo.test", email="client@deo.test", password="pass1234",
        first_name="Клиент", last_name="Петров", role=roles["client"],
    )


@pytest.fixture
def client(db):
    return Client.objects.create(
        first_name="Иван",
        last_name="Петров",
        phone="+7 (912) 345-67-89",
        source="other",
    )


@pytest.fixture
def whatsapp_account(db):
    account = WhatsAppAccount(
        name="Основной",
        business_account_id="999888777",
        phone_number_id="1111222233334444",
        display_phone_number="+7 900 000-00-00",
        status="active",
        is_default=True,
    )
    account.set_access_token("super-secret-token")
    account.save()
    return account


@pytest.fixture
def telegram_account(db):
    account = TelegramAccount(
        name="DEO Bot",
        bot_username="deo_studio_bot",
        bot_name="DEO Studio Bot",
        status="active",
        is_default=True,
    )
    account.set_bot_token("123456:super-secret-token")
    account.webhook_secret = "secret-webhook-token"
    account.save()
    return account


@pytest.fixture
def telegram_conversation(db, client, telegram_account):
    from apps.messaging.services.conversations import (
        find_or_create_conversation,
        get_or_create_telegram_client,
    )

    tg_client = get_or_create_telegram_client(
        987654, first_name="Иван", last_name="Петров", username="ivan_petrov"
    )
    return find_or_create_conversation(
        telegram_account, tg_client, Channel.TELEGRAM
    )


@pytest.fixture
def conversation(db, client, whatsapp_account):
    return Conversation.objects.create(
        contact=client,
        channel=Channel.WHATSAPP,
        whatsapp_account=whatsapp_account,
        status=ConversationStatus.OPEN,
    )


@pytest.fixture
def lead_stage(db):
    return LeadStage.objects.create(
        name="Новый", order=0, probability=10, color="#6366f1"
    )


@pytest.fixture
def lead(db, lead_stage, staff_user):
    return Lead.objects.create(
        contact_name="Анна Смирнова",
        company_name="ООО Смирнов",
        phone="+7 (903) 111-22-33",
        email="anna@smirnov.test",
        source="website",
        current_stage=lead_stage,
        created_by=staff_user,
    )


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def make_message(db, conversation):
    def _make(**kwargs):
        defaults = {
            "conversation": conversation,
            "contact": conversation.contact,
            "channel": conversation.channel,
            "direction": Direction.OUTGOING,
            "type": MessageType.TEXT,
            "text": "Тест",
            "status": "sent",
        }
        defaults.update(kwargs)
        return Message.objects.create(**defaults)

    return _make
