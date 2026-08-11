import json
from datetime import timedelta
from unittest import mock

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Role
from apps.calls.models import CallRecord, PBXConnection, SipAccount

PBX_URL = reverse("calls-pbx-list")
PBX_CREATE_URL = reverse("calls-pbx-create")
PBX_TEST_URL = reverse("calls-pbx-test")
SIP_URL = reverse("calls-sip-list")
SIP_QUICK_URL = reverse("calls-sip-quick")
RECORDS_URL = reverse("calls-record-list")
STATS_URL = reverse("calls-stats")
CDR_URL = reverse("calls-cdr-ingest")


def pbx_test_url(pk):
    return reverse("calls-pbx-test-one", kwargs={"pk": pk})


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
def admin_user(db, roles):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.create_user(
        username="admin@deo.test", email="admin@deo.test", password="pass1234",
        first_name="Админ", last_name="Системы", role=roles["superadmin"],
    )


@pytest.fixture
def staff_user(db, roles):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.create_user(
        username="pm@deo.test", email="pm@deo.test", password="pass1234",
        first_name="Менеджер", last_name="Иванов", role=roles["project_manager"],
    )


@pytest.fixture
def client_user(db, roles):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.create_user(
        username="client@deo.test", email="client@deo.test", password="pass1234",
        first_name="Клиент", last_name="Петров", role=roles["client"],
    )


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def pbx_connection(db):
    connection = PBXConnection(
        name="Офисная АТС",
        provider="asterisk",
        api_url="http://pbx.example.local:8088",
        ami_host="pbx.example.local",
        ami_port=5038,
        ami_user="admin",
        status="disabled",
    )
    connection.set_api_key("secret-api-key")
    connection.set_ami_password("secret-ami-pass")
    connection.save()
    return connection


def make_cdr(connection, external_id="A-100", **kwargs):
    defaults = {
        "connection_id": str(connection.id),
        "records": [{
            "external_call_id": external_id,
            "direction": "incoming",
            "status": "answered",
            "call_type": "external",
            "phone_number": "+7 (912) 345-67-89",
            "duration_seconds": 42,
            "started_at": timezone.now().isoformat(),
        }],
    }
    defaults["records"][0].update(kwargs)
    return defaults


@pytest.mark.django_db
class TestPBXConnections:
    def test_credentials_never_returned(self, api_client, staff_user, pbx_connection):
        api_client.force_authenticate(staff_user)
        response = api_client.get(PBX_URL)
        assert response.status_code == 200
        row = response.data["results"][0]
        assert "api_key" not in row and "ami_password" not in row
        assert "secret-api-key" not in json.dumps(response.data)

    def test_create_owner_only(self, api_client, staff_user, admin_user):
        payload = {"name": "Новая АТС", "provider": "mikopbx",
                   "api_url": "http://pbx.local", "api_key": "key-1",
                   "ami_password": "pass-1"}
        api_client.force_authenticate(staff_user)
        assert api_client.post(PBX_CREATE_URL, payload).status_code == 403

        api_client.force_authenticate(admin_user)
        response = api_client.post(PBX_CREATE_URL, payload)
        assert response.status_code == 201
        connection = PBXConnection.objects.get(pk=response.data["id"])
        assert connection.api_key == "key-1"
        assert connection.ami_password == "pass-1"
        assert connection.api_key_encrypted != "key-1"

    def test_update_keeps_existing_credentials(self, api_client, admin_user, pbx_connection):
        api_client.force_authenticate(admin_user)
        response = api_client.patch(
            reverse("calls-pbx-detail", kwargs={"pk": pbx_connection.id}),
            {"name": "Переименовано"},
        )
        assert response.status_code == 200
        pbx_connection.refresh_from_db()
        assert pbx_connection.name == "Переименовано"
        assert pbx_connection.api_key == "secret-api-key"


@pytest.mark.django_db
class TestPBXTesting:
    def test_draft_requires_some_endpoint(self, api_client, admin_user):
        api_client.force_authenticate(admin_user)
        response = api_client.post(PBX_TEST_URL, {"name": "Черновик"}, format="json")
        assert response.status_code == 200
        assert response.data["ok"] is False
        assert "URL API" in response.data["error"]

    def test_draft_valid(self, api_client, admin_user):
        api_client.force_authenticate(admin_user)
        with mock.patch("apps.calls.views.test_connection") as mocked:
            mocked.return_value = {
                "ok": True, "api_reachable": True, "ami_reachable": False,
                "api_status": 200,
            }
            response = api_client.post(PBX_TEST_URL, {
                "name": "Черновик", "api_url": "http://pbx.local",
                "ami_host": "", "api_key": "draft-key",
            }, format="json")
        assert response.status_code == 200
        assert response.data["ok"] is True
        assert PBXConnection.objects.count() == 0  # nothing saved
        draft = mocked.call_args[0][0]
        assert draft.api_key == "draft-key"

    def test_saved_connection(self, api_client, admin_user, pbx_connection):
        api_client.force_authenticate(admin_user)
        with mock.patch("apps.calls.views.test_connection") as mocked:
            mocked.return_value = {"ok": True, "api_reachable": True,
                                   "ami_reachable": True}
            response = api_client.post(pbx_test_url(pbx_connection.id))
        assert response.status_code == 200
        assert response.data["ok"] is True
        assert mocked.call_args[0][0].id == pbx_connection.id

    def test_staff_forbidden(self, api_client, staff_user, pbx_connection):
        api_client.force_authenticate(staff_user)
        assert api_client.post(pbx_test_url(pbx_connection.id)).status_code == 403


@pytest.mark.django_db
class TestSipQuickConnect:
    def test_quick_connect(self, api_client, admin_user, pbx_connection):
        api_client.force_authenticate(admin_user)
        response = api_client.post(SIP_QUICK_URL, {
            "extension": "101", "password": "sip-pass", "name": "Иван",
        }, format="json")
        assert response.status_code == 201
        account = SipAccount.objects.get(pk=response.data["id"])
        assert account.extension == "101"
        assert account.password == "sip-pass"
        assert account.password_encrypted != "sip-pass"
        assert account.connection_id == pbx_connection.id  # bound to default

    def test_password_not_returned(self, api_client, staff_user, pbx_connection):
        account = SipAccount.objects.create(extension="102", name="Пётр",
                                            connection=pbx_connection)
        account.set_password("secret")
        account.save()
        api_client.force_authenticate(staff_user)
        response = api_client.get(SIP_URL)
        assert response.status_code == 200
        assert "secret" not in json.dumps(response.data, default=str)


@pytest.mark.django_db
class TestCallLog:
    def _create_records(self):
        now = timezone.now()
        CallRecord.objects.create(
            direction="incoming", status="answered", call_type="external",
            phone_number="+7 (912) 345-67-89", duration_seconds=60,
            started_at=now - timedelta(hours=1),
        )
        CallRecord.objects.create(
            direction="outgoing", status="answered", call_type="external",
            phone_number="+7 (903) 111-22-33", duration_seconds=120,
            started_at=now - timedelta(minutes=30),
        )
        CallRecord.objects.create(
            direction="incoming", status="missed", call_type="internal",
            phone_number="101", duration_seconds=0,
            started_at=now - timedelta(minutes=5),
        )

    def test_list_and_filters(self, api_client, staff_user):
        self._create_records()
        api_client.force_authenticate(staff_user)
        assert api_client.get(RECORDS_URL).data["count"] == 3
        assert api_client.get(RECORDS_URL, {"direction": "incoming"}).data["count"] == 2
        assert api_client.get(RECORDS_URL, {"status": "missed"}).data["count"] == 1
        assert api_client.get(RECORDS_URL, {"search": "912"}).data["count"] == 1

    def test_stats(self, api_client, staff_user):
        self._create_records()
        api_client.force_authenticate(staff_user)
        response = api_client.get(STATS_URL)
        assert response.status_code == 200
        assert response.data["total"] == 3
        assert response.data["incoming"] == 2
        assert response.data["outgoing"] == 1
        assert response.data["missed"] == 1
        assert response.data["total_duration_seconds"] == 180

    def test_filter_by_client(self, api_client, staff_user):
        from apps.clients.models import Client

        client_a = Client.objects.create(
            first_name="Иван", last_name="Петров",
            phone="+7 (912) 345-67-89", source="other",
        )
        client_b = Client.objects.create(
            first_name="Анна", last_name="Сидорова",
            phone="+7 (903) 111-22-33", source="other",
        )
        CallRecord.objects.create(
            direction="incoming", status="answered", call_type="external",
            phone_number="+7 (912) 345-67-89", duration_seconds=60,
            started_at=timezone.now(), client=client_a,
        )
        CallRecord.objects.create(
            direction="incoming", status="missed", call_type="external",
            phone_number="+7 (912) 345-67-89", duration_seconds=0,
            started_at=timezone.now(), client=client_a,
        )
        CallRecord.objects.create(
            direction="outgoing", status="answered", call_type="external",
            phone_number="+7 (903) 111-22-33", duration_seconds=120,
            started_at=timezone.now(), client=client_b,
        )

        api_client.force_authenticate(staff_user)
        response = api_client.get(RECORDS_URL, {"client_id": client_a.id})
        assert response.status_code == 200
        assert response.data["count"] == 2
        assert all(r["client"] == client_a.id for r in response.data["results"])

        stats = api_client.get(STATS_URL, {"client_id": client_a.id})
        assert stats.data["total"] == 2
        assert stats.data["missed"] == 1

        stats_all = api_client.get(STATS_URL)
        assert stats_all.data["total"] == 3

    def test_invalid_client_id_ignored(self, api_client, staff_user):
        self._create_records()
        api_client.force_authenticate(staff_user)
        # Garbage / whitespace client_id must not raise 500 — treated as no filter.
        response = api_client.get(RECORDS_URL, {"client_id": "not-a-uuid"})
        assert response.status_code == 200
        assert response.data["count"] == 3
        stats = api_client.get(STATS_URL, {"client_id": "   "})
        assert stats.status_code == 200
        assert stats.data["total"] == 3

    def test_filter_by_employee(self, api_client, staff_user):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        emp = User.objects.create_user(
            username="emp@deo.test", email="emp@deo.test", password="pass1234",
            first_name="Оператор", last_name="Сидоров", role=staff_user.role,
        )
        CallRecord.objects.create(
            direction="incoming", status="answered", call_type="external",
            phone_number="+7 (912) 000-00-01", duration_seconds=10,
            started_at=timezone.now(), employee=emp,
        )
        CallRecord.objects.create(
            direction="incoming", status="missed", call_type="external",
            phone_number="+7 (912) 000-00-02", duration_seconds=0,
            started_at=timezone.now(), employee=staff_user,
        )

        api_client.force_authenticate(staff_user)
        response = api_client.get(RECORDS_URL, {"employee": emp.id})
        assert response.status_code == 200
        assert response.data["count"] == 1
        assert response.data["results"][0]["employee"] == emp.id

        stats = api_client.get(STATS_URL, {"employee": emp.id})
        assert stats.data["total"] == 1

        # Combined with a period window
        today = timezone.now().date().isoformat()
        combined = api_client.get(RECORDS_URL, {
            "employee": emp.id, "date_from": today, "date_to": today,
        })
        assert combined.data["count"] == 1

    def test_client_role_forbidden(self, api_client, client_user):
        api_client.force_authenticate(client_user)
        assert api_client.get(RECORDS_URL).status_code == 403
        assert api_client.get(STATS_URL).status_code == 403


@pytest.mark.django_db
class TestCdrIngest:
    def test_ingest_via_api_key(self, api_client, pbx_connection):
        response = api_client.post(
            CDR_URL, make_cdr(pbx_connection), format="json",
            HTTP_X_API_KEY="secret-api-key",
        )
        assert response.status_code == 200
        assert response.data == {"created": 1, "skipped": 0}
        record = CallRecord.objects.get()
        assert record.direction == "incoming"
        assert record.phone_number == "+7 (912) 345-67-89"
        assert record.connection_id == pbx_connection.id

    def test_ingest_via_staff_jwt(self, api_client, staff_user, pbx_connection):
        api_client.force_authenticate(staff_user)
        response = api_client.post(CDR_URL, make_cdr(pbx_connection), format="json")
        assert response.status_code == 200
        assert CallRecord.objects.count() == 1

    def test_ingest_wrong_api_key_403(self, api_client, pbx_connection):
        response = api_client.post(
            CDR_URL, make_cdr(pbx_connection), format="json",
            HTTP_X_API_KEY="wrong-key",
        )
        assert response.status_code == 403
        assert CallRecord.objects.count() == 0

    def test_ingest_duplicates_skipped(self, api_client, pbx_connection):
        payload = make_cdr(pbx_connection)
        first = api_client.post(
            CDR_URL, payload, format="json", HTTP_X_API_KEY="secret-api-key",
        )
        second = api_client.post(
            CDR_URL, payload, format="json", HTTP_X_API_KEY="secret-api-key",
        )
        assert first.status_code == 200
        assert first.data == {"created": 1, "skipped": 0}
        assert second.status_code == 200
        assert second.data == {"created": 0, "skipped": 1}
        assert CallRecord.objects.count() == 1

    def test_ingest_missing_connection_400(self, api_client):
        response = api_client.post(
            CDR_URL, {"records": []}, format="json",
            HTTP_X_API_KEY="whatever",
        )
        assert response.status_code == 400

    def test_ingest_links_client_by_phone(self, api_client, pbx_connection):
        from apps.clients.models import Client

        client = Client.objects.create(
            first_name="Иван", last_name="Петров",
            phone="+7 (912) 345-67-89", source="other",
        )
        response = api_client.post(
            CDR_URL, make_cdr(pbx_connection), format="json",
            HTTP_X_API_KEY="secret-api-key",
        )
        assert response.status_code == 200
        assert CallRecord.objects.get().client_id == client.id


@pytest.mark.django_db
class TestMissedCallNotifications:
    def test_ingest_missed_creates_notifications(
        self, api_client, staff_user, admin_user, pbx_connection
    ):
        from apps.notifications.models import Notification

        api_client.force_authenticate(staff_user)
        response = api_client.post(
            CDR_URL,
            make_cdr(
                pbx_connection, external_id="MISS-1",
                status="missed", direction="incoming",
            ),
            format="json",
        )
        assert response.status_code == 200
        # PM + superadmin both get a missed-call notification.
        notified = set(Notification.objects.values_list("user_id", flat=True))
        assert {staff_user.id, admin_user.id} <= notified
        n = Notification.objects.get(user=staff_user)
        assert n.type == "missed_call"
        assert n.urgency == "important"
        assert "345-67-89" in n.message

    def test_ingest_answered_creates_no_notifications(
        self, api_client, staff_user, pbx_connection
    ):
        from apps.notifications.models import Notification

        api_client.force_authenticate(staff_user)
        response = api_client.post(
            CDR_URL,
            make_cdr(pbx_connection, external_id="ANS-1", status="answered"),
            format="json",
        )
        assert response.status_code == 200
        assert Notification.objects.count() == 0

    def test_duplicate_ingest_sends_event_once(
        self, api_client, staff_user, pbx_connection
    ):
        from apps.notifications.models import Notification

        api_client.force_authenticate(staff_user)
        payload = make_cdr(
            pbx_connection, external_id="MISS-2",
            status="missed", direction="incoming",
        )
        api_client.post(CDR_URL, payload, format="json")
        api_client.post(CDR_URL, payload, format="json")
        # Idempotent: one notification per user despite duplicate CDR push.
        assert Notification.objects.filter(user=staff_user).count() == 1

    def test_broadcast_sends_ws_event(self, db, staff_user):
        from unittest import mock

        from apps.calls.models import CallRecord
        from apps.calls.realtime import notify_missed_call

        record = CallRecord.objects.create(
            direction="incoming", status="missed", call_type="external",
            phone_number="+7 (912) 345-67-89", duration_seconds=0,
            started_at=timezone.now(),
        )
        with mock.patch("apps.calls.realtime.get_channel_layer") as mock_layer:
            fake_layer = mock.MagicMock()
            mock_layer.return_value = fake_layer
            notify_missed_call(record)

        groups = [call.args[0] for call in fake_layer.group_send.call_args_list]
        assert f"notifications_{staff_user.id}" in groups
        sent = fake_layer.group_send.call_args_list[0].args[1]
        assert sent["type"] == "send.notification"
        payload = json.loads(sent["message"])
        assert payload["event"] == "missed_call"
        assert payload["data"]["call_id"] == str(record.id)

    def test_consumer_receives_missed_call(self, db, staff_user):
        import json as jsonlib

        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        from channels.testing import WebsocketCommunicator

        from apps.messenger.consumers import NotificationConsumer

        async def _scenario():
            communicator = WebsocketCommunicator(
                NotificationConsumer.as_asgi(), "/ws/notifications/"
            )
            communicator.scope["user"] = staff_user
            connected, _ = await communicator.connect()
            assert connected
            layer = get_channel_layer()
            await layer.group_send(
                f"notifications_{staff_user.id}",
                {
                    "type": "send.notification",
                    "message": jsonlib.dumps({
                        "event": "missed_call",
                        "data": {"call_id": "abc", "phone_number": "+7 900 000-00-00"},
                    }),
                },
            )
            message = await communicator.receive_json_from()
            await communicator.disconnect()
            return message

        message = async_to_sync(_scenario)()
        assert message["event"] == "missed_call"
        assert message["data"]["phone_number"] == "+7 900 000-00-00"

    def test_anonymous_consumer_rejected(self, db):
        from asgiref.sync import async_to_sync
        from channels.testing import WebsocketCommunicator

        from apps.messenger.consumers import NotificationConsumer

        async def _scenario():
            communicator = WebsocketCommunicator(
                NotificationConsumer.as_asgi(), "/ws/notifications/"
            )
            connected, _ = await communicator.connect()
            await communicator.disconnect()
            return connected

        assert async_to_sync(_scenario)() is False
