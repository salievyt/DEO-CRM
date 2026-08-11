import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Role
from apps.clients.models import Client
from apps.messaging.models import Conversation, WhatsAppAccount
from apps.messaging.models.enums import Channel, ConversationStatus

User = get_user_model()


@pytest.fixture
def roles(db):
    def make(name):
        return Role.objects.get_or_create(name=name)[0]

    return {
        "superadmin": make("superadmin"),
        "project_manager": make("project_manager"),
        "client": make("client"),
    }


@pytest.fixture
def staff_user(db, roles):
    return User.objects.create_user(
        username="manager@deo.test", email="manager@deo.test", password="pass1234",
        first_name="Менеджер", last_name="Иванов", role=roles["project_manager"],
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
def conversation(db, client, whatsapp_account):
    return Conversation.objects.create(
        contact=client,
        channel=Channel.WHATSAPP,
        whatsapp_account=whatsapp_account,
        status=ConversationStatus.OPEN,
    )


@pytest.fixture
def api_client():
    return APIClient()
