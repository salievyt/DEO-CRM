import uuid
from datetime import datetime
from unittest.mock import patch
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from apps.accounts.models import Role, User
from apps.leads.models import Lead
from .models import (
    CallAttempt,
    Contact,
    DailyAssignment,
    Recording,
    RecordingPart,
    SalesMember,
    SalesSettings,
)
from .services import BISHKEK, allocate, next_workday, parse_batch

pytestmark = pytest.mark.django_db
MONDAY = datetime(2026, 11, 23, 10, tzinfo=BISHKEK)


@pytest.fixture
def team():
    owner_role, _ = Role.objects.get_or_create(name="owner")
    employee_role, _ = Role.objects.get_or_create(name="marketer")
    owner = User.objects.create_user(
        username=str(uuid.uuid4()), email="boss@d2c.test", password="test", role=owner_role
    )
    a = User.objects.create_user(
        username=str(uuid.uuid4()), email="a@d2c.test", password="test", role=employee_role
    )
    b = User.objects.create_user(
        username=str(uuid.uuid4()), email="b@d2c.test", password="test", role=employee_role
    )
    SalesSettings.objects.create(pk=1, supervisor=owner)
    for u in (a, b):
        SalesMember.objects.create(user=u)
    return owner, a, b


def api(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


def contact(user=None, **kwargs):
    return Contact.objects.create(
        company="Компания",
        phone="+996" + str(uuid.uuid4().int)[:9],
        offer="CRM",
        assigned_to=user,
        **kwargs,
    )


def result(user, c, outcome="no_answer", **kwargs):
    return api(user).post(
        f"/api/v1/outreach/contacts/{c.id}/outcome/",
        {"outcome": outcome, "request_id": str(uuid.uuid4()), **kwargs},
        format="json",
    )


def recording(user):
    r = Recording.objects.create(uploaded_by=user, name="call.mp3", size=3, parts=1)
    RecordingPart.objects.create(recording=r, index=0, data=b"ID3")
    return r


def test_even_allocation_is_idempotent_and_respects_caps(team):
    for _ in range(61):
        contact()
    with patch("apps.outreach.services.local_now", return_value=MONDAY):
        allocate()
        allocate()
    assert Contact.objects.filter(assigned_to=team[1]).count() == 25
    assert Contact.objects.filter(assigned_to=team[2]).count() == 25
    assert Contact.objects.filter(assigned_to__isnull=True).count() == 11
    assert DailyAssignment.objects.count() == 50


def test_carryover_counts_and_callbacks_do_not(team):
    c = contact(team[1])
    contact(team[1], status="callback", next_call_at=MONDAY)
    for _ in range(80):
        contact()
    with patch("apps.outreach.services.local_now", return_value=MONDAY):
        allocate()
    assert DailyAssignment.objects.filter(user=team[1]).count() == 25
    assert Contact.objects.filter(assigned_to=team[1]).count() == 26
    c.refresh_from_db()
    assert c.assigned_to == team[1]


def test_completed_contacts_do_not_allow_extra_daily_allocations(team):
    for _ in range(80):
        contact()
    with patch("apps.outreach.services.local_now", return_value=MONDAY):
        allocate()
        Contact.objects.filter(assigned_to=team[1]).update(status="rejected")
        allocate()
    assert Contact.objects.filter(assigned_to=team[1]).count() == 25


@pytest.mark.parametrize(
    "when",
    [
        datetime(2026, 11, 22, 12, tzinfo=BISHKEK),
        datetime(2026, 11, 23, 8, tzinfo=BISHKEK),
        datetime(2026, 11, 23, 19, tzinfo=BISHKEK),
    ],
)
def test_no_allocation_outside_hours(team, when):
    contact()
    with patch("apps.outreach.services.local_now", return_value=when):
        allocate()
    assert Contact.objects.filter(assigned_to__isnull=False).count() == 0


def test_three_misses_and_friday_retry(team):
    c = contact(team[1])
    friday = datetime(2026, 11, 27, 18, tzinfo=BISHKEK)
    with patch("apps.outreach.views.local_now", return_value=friday):
        assert result(team[1], c).status_code == 200
    c.refresh_from_db()
    assert c.next_call_at.astimezone(BISHKEK) == datetime(2026, 11, 30, 9, tzinfo=BISHKEK)
    assert result(team[1], c).status_code == 200
    assert result(team[1], c).status_code == 200
    c.refresh_from_db()
    assert c.status == "exhausted" and c.next_call_at is None
    assert result(team[1], c).status_code == 400


@pytest.mark.parametrize("outcome", ["interested", "callback", "rejected"])
def test_recording_required(team, outcome):
    assert result(team[1], contact(team[1]), outcome).status_code == 400
    assert CallAttempt.objects.count() == 0


def test_interested_creates_one_lead_for_boss_and_preserves_d2c(team):
    c = contact(team[1], usp="Быстрый запуск", script="Здравствуйте")
    r = recording(team[1])
    key = str(uuid.uuid4())
    for _ in range(2):
        response = result(team[1], c, "interested", recording=str(r.id), request_id=key)
        assert response.status_code == 200, response.data
    assert Lead.objects.count() == 1 and CallAttempt.objects.count() == 1
    lead = Lead.objects.get()
    assert lead.assigned_to == team[0] and lead.current_stage.name == "Заинтересован"
    assert "Быстрый запуск" in lead.notes and "Здравствуйте" in lead.notes


def test_no_supervisor_rolls_back(team):
    SalesSettings.objects.update(supervisor=None)
    c = contact(team[1])
    r = recording(team[1])
    assert result(team[1], c, "interested", recording=str(r.pk)).status_code == 400
    c.refresh_from_db()
    assert c.status == "new"
    assert not Lead.objects.exists() and not CallAttempt.objects.exists()


def test_manager_cannot_read_others_or_reassign_or_import(team):
    c = contact(team[2])
    client = api(team[1])
    assert client.get(f"/api/v1/outreach/contacts/{c.pk}/").status_code == 404
    assert result(team[1], c).status_code == 404
    assert (
        client.patch(
            f"/api/v1/outreach/contacts/{c.pk}/", {"assigned_to": str(team[1].pk)}, format="json"
        ).status_code
        == 403
    )
    assert (
        client.post("/api/v1/outreach/import/", {"text": "anything"}, format="json").status_code
        == 403
    )
    assert client.get("/api/v1/outreach/queue/?mode=all").data["count"] == 0


@pytest.mark.parametrize("limit,expected", [(19, 400), (20, 200), (40, 200), (41, 400)])
def test_self_limit(team, limit, expected):
    assert (
        api(team[1])
        .patch("/api/v1/outreach/settings/", {"daily_limit": limit}, format="json")
        .status_code
        == expected
    )


def test_leader_limits_and_reassignment(team):
    client = api(team[0])
    assert (
        client.patch(
            "/api/v1/outreach/settings/",
            {"user": str(team[1].pk), "daily_limit": 10},
            format="json",
        ).status_code
        == 200
    )
    assert (
        client.patch(
            "/api/v1/outreach/settings/",
            {"user": str(team[1].pk), "daily_limit": 41},
            format="json",
        ).status_code
        == 400
    )
    c = contact(team[1])
    assert (
        client.patch(
            f"/api/v1/outreach/contacts/{c.pk}/", {"assigned_to": str(team[2].pk)}, format="json"
        ).status_code
        == 200
    )
    assert api(team[1]).get(f"/api/v1/outreach/contacts/{c.pk}/").status_code == 404


def test_untrusted_and_client_denied(team):
    client_role, _ = Role.objects.get_or_create(name="client")
    for role in [None, client_role]:
        u = User.objects.create_user(
            username=str(uuid.uuid4()), email=f"{uuid.uuid4()}@d2c.test", role=role
        )
        SalesMember.objects.create(user=u)
        assert api(u).get("/api/v1/outreach/settings/").status_code == 403


def test_import_preview_and_deduplication(team):
    text = "Компания: A\nТелефон: +996 (700) 123-456\nПредложение: CRM\nНачало разговора: Добрый день\nВторая строка\n---\nКомпания: B\nТелефон: 996700123456\nПредложение: Сайт"
    client = api(team[0])
    preview = client.post("/api/v1/outreach/import/", {"text": text}, format="json")
    assert preview.status_code == 200 and preview.data["duplicates"] == 1
    assert not Contact.objects.exists()
    assert (
        client.post("/api/v1/outreach/import/", {"text": text, "commit": True}, format="json").data[
            "created"
        ]
        == 1
    )
    assert (
        client.post("/api/v1/outreach/import/", {"text": text, "commit": True}, format="json").data[
            "created"
        ]
        == 0
    )
    assert "Вторая строка" in Contact.objects.get().script


def test_invalid_import_is_atomic(team):
    text = "Компания: A\nТелефон: +996700123456\nПредложение: CRM\n---\nКомпания: B\nТелефон: nope\nПредложение: CRM"
    assert (
        api(team[0])
        .post("/api/v1/outreach/import/", {"text": text, "commit": True}, format="json")
        .status_code
        == 400
    )
    assert not Contact.objects.exists()


def test_recording_upload_permissions_and_immutability(team):
    client = api(team[1])
    r = client.post("/api/v1/outreach/recordings/", {"name": "call.mp3", "size": 3}, format="json")
    assert r.status_code == 201
    rid = r.data["id"]
    url = f"/api/v1/outreach/recordings/{rid}/parts/0/"
    assert (
        client.put(
            url, {"file": SimpleUploadedFile("part", b"ID3")}, format="multipart"
        ).status_code
        == 200
    )
    c = contact(team[1])
    assert result(team[1], c, "rejected", recording=str(rid)).status_code == 200
    assert client.get(url).content == b"ID3"
    assert api(team[0]).get(url).status_code == 200
    assert api(team[2]).get(url).status_code == 404
    assert (
        client.put(
            url, {"file": SimpleUploadedFile("part", b"bad")}, format="multipart"
        ).status_code
        == 400
    )


def test_incomplete_or_foreign_recording_rejected(team):
    c = contact(team[1])
    r = recording(team[2])
    assert result(team[1], c, "rejected", recording=str(r.id)).status_code == 404
    r = Recording.objects.create(uploaded_by=team[1], name="call.mp3", size=3, parts=1)
    assert result(team[1], c, "rejected", recording=str(r.id)).status_code == 400


@pytest.mark.parametrize(
    "when,expected",
    [
        ("2026-11-24T09:00:00+06:00", 200),
        ("2026-11-24T19:00:00+06:00", 400),
        ("2026-11-28T12:00:00+06:00", 400),
        ("2026-11-20T12:00:00+06:00", 400),
    ],
)
def test_callback_schedule(team, when, expected):
    with patch("apps.outreach.views.timezone.now", return_value=MONDAY):
        response = result(
            team[1],
            contact(team[1]),
            "callback",
            recording=str(recording(team[1]).id),
            next_call_at=when,
        )
    assert response.status_code == expected, response.data


def test_queue_prioritizes_callbacks_and_hides_future(team):
    first = contact(team[1])
    DailyAssignment.objects.create(contact=first, user=team[1], date=MONDAY.date())
    callback = contact(team[1], status="callback", next_call_at=MONDAY)
    contact(team[1], status="no_answer", next_call_at=next_workday(MONDAY))
    contact(team[1], status="callback", next_call_at=next_workday(MONDAY))
    with patch("apps.outreach.views.local_now", return_value=MONDAY):
        response = api(team[1]).get("/api/v1/outreach/queue/")
    assert response.data["count"] == 2
    assert response.data["results"][0]["id"] == str(callback.id)


def test_large_carryover_is_capped_and_preserved(team):
    for _ in range(45):
        contact(team[1])
    with patch("apps.outreach.services.local_now", return_value=MONDAY):
        allocate()
    assert DailyAssignment.objects.filter(user=team[1]).count() == 25
    assert Contact.objects.filter(assigned_to=team[1]).count() == 45
    with patch("apps.outreach.views.local_now", return_value=MONDAY):
        response = api(team[1]).get("/api/v1/outreach/queue/")
    assert response.data["count"] == 25
