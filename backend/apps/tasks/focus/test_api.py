from datetime import timedelta
import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.test import APIClient
from apps.accounts.models import Role
from apps.tasks.models import Task, TaskStatus, TaskTimer
from .models import FocusNote, FocusProfile, FocusSession

pytestmark = pytest.mark.django_db


@pytest.fixture
def employee():
    role, _ = Role.objects.get_or_create(name="developer")
    return get_user_model().objects.create_user(
        username="focus-test", email="focus@test.local", password="temporary-test", role=role
    )


@pytest.fixture
def api(employee):
    client = APIClient()
    client.force_authenticate(employee)
    return client


@pytest.fixture
def task(employee):
    status = TaskStatus.objects.first() or TaskStatus.objects.create(name="К выполнению")
    return Task.objects.create(
        title="Сделать экран", assignee=employee, created_by=employee, status=status
    )


@pytest.fixture
def clock(monkeypatch):
    current = [timezone.now()]
    monkeypatch.setattr(timezone, "now", lambda: current[0])
    return lambda seconds: current.__setitem__(0, current[0] + timedelta(seconds=seconds))


def start(api, task=None, **data):
    response = api.post(
        "/api/v1/focus/start/",
        {"phase": "work", "duration_minutes": 1, "task": str(task.pk) if task else None, **data},
        format="json",
    )
    assert response.status_code == 201, response.data
    return response.data["id"]


def action(api, session, action, **data):
    return api.post(f"/api/v1/focus/sessions/{session}/{action}/", data, format="json")


def test_authentication_required():
    assert APIClient().get("/api/v1/focus/state/").status_code == 401


def test_two_devices_share_one_active_session(api, employee, task):
    session = start(api, task)
    second = APIClient()
    second.force_authenticate(employee)
    assert second.get("/api/v1/focus/state/").data["active"]["id"] == session
    assert second.post("/api/v1/focus/start/", {"phase": "work"}, format="json").status_code == 409
    assert FocusSession.objects.count() == 1


def test_db_constraint_enforces_single_active_session(api, employee):
    start(api)
    with pytest.raises(IntegrityError), transaction.atomic():
        FocusSession.objects.create(
            user=employee,
            phase="work",
            planned_seconds=60,
            started_at=timezone.now(),
            status="paused",
        )


def test_pause_excludes_elapsed_pause_and_resume_restores_remaining(api, task, clock):
    session = start(api, task)
    clock(15)
    paused = action(api, session, "pause")
    assert paused.data["elapsed_seconds"] == 15
    clock(600)
    assert api.get("/api/v1/focus/state/").data["active"]["elapsed_seconds"] == 15
    assert action(api, session, "resume").status_code == 200
    clock(10)
    response = action(api, session, "finish")
    assert response.data["elapsed_seconds"] == 25
    assert TaskTimer.objects.get().duration_seconds == 25


def test_expiry_after_app_closed_caps_time_and_is_idempotent(api, task, clock):
    session = start(api, task)
    clock(3600)
    response = api.get("/api/v1/focus/state/")
    assert response.data["active"] is None
    assert response.data["last_session"]["elapsed_seconds"] == 60
    assert action(api, session, "finish").status_code == 200
    assert action(api, session, "finish").status_code == 200
    assert TaskTimer.objects.count() == 1
    assert TaskTimer.objects.get().duration_seconds == 60
    assert api.get("/api/v1/focus/settings/").data["coins"] == 1
    assert api.get("/api/v1/focus/stats/").data["today_sessions"] == 1


def test_break_never_adds_work_time_or_coins(api, task, clock):
    start(api, task, phase="short_break")
    clock(90)
    api.get("/api/v1/focus/state/")
    assert TaskTimer.objects.count() == 0
    assert api.get("/api/v1/focus/stats/").data["total_seconds"] == 0
    assert api.get("/api/v1/focus/settings/").data["coins"] == 0


def test_cancel_preserves_work_but_not_completed_session_reward(api, task, clock):
    session = start(api, task)
    clock(30)
    assert action(api, session, "cancel").data["status"] == "cancelled"
    assert TaskTimer.objects.get().duration_seconds == 30
    assert api.get("/api/v1/focus/stats/").data["total_sessions"] == 0


def test_session_and_notes_are_private(api, employee):
    other = get_user_model().objects.create_user(username="other", email="other@test.local")
    stranger = APIClient()
    stranger.force_authenticate(other)
    session = start(api)
    assert action(stranger, session, "cancel").status_code == 404
    note = api.post("/api/v1/focus/notes/", {"content": "Личная заметка"}, format="json").data
    assert stranger.get(f"/api/v1/focus/notes/{note['id']}/").status_code == 404
    assert stranger.get("/api/v1/focus/notes/").data["count"] == 0


def test_unrelated_task_is_rejected(api):
    status = TaskStatus.objects.first()
    other = Task.objects.create(title="Чужая", status=status)
    response = api.post("/api/v1/focus/start/", {"task": str(other.pk)}, format="json")
    assert response.status_code == 400
    assert FocusSession.objects.count() == 0


def test_legacy_timer_and_focus_cannot_overlap(api, task):
    assert api.post(f"/api/v1/tasks/{task.pk}/timer/start/").status_code == 200
    assert api.post("/api/v1/focus/start/", {}, format="json").status_code == 409
    api.post(f"/api/v1/tasks/{task.pk}/timer/stop/")
    start(api, task)
    assert api.post(f"/api/v1/tasks/{task.pk}/timer/start/").status_code == 409


def test_running_timer_is_reported_and_stopped_via_focus_api(api, task, clock):
    assert api.post(f"/api/v1/tasks/{task.pk}/timer/start/").status_code == 200
    clock(120)
    state = api.get("/api/v1/focus/state/").data
    assert state["running_timer"]["task"] == str(task.pk)
    assert api.post("/api/v1/focus/timer/stop/").status_code == 200
    clock(30)
    assert api.get("/api/v1/focus/state/").data["running_timer"] is None
    timer = TaskTimer.objects.get()
    assert timer.duration_seconds == 120
    assert not timer.is_running
    assert api.get("/api/v1/focus/stats/").data["today_seconds"] == 120
    assert api.post("/api/v1/focus/start/", {}, format="json").status_code == 201


def test_duration_settings_validation_and_readonly_wallet(api):
    assert (
        api.patch("/api/v1/focus/settings/", {"work_minutes": 0}, format="json").status_code == 400
    )
    response = api.patch(
        "/api/v1/focus/settings/",
        {"work_minutes": 50, "coins": 9999, "theme": "forest"},
        format="json",
    )
    assert response.data["work_minutes"] == 50
    assert response.data["coins"] == 0
    assert response.data["theme"] == "forest"


def test_shop_charges_once_and_checks_balance(api, employee):
    profile = FocusProfile.objects.create(user=employee, coins=35)
    assert api.post("/api/v1/focus/shop/", {"item": "crown"}, format="json").status_code == 400
    for _ in range(2):
        response = api.post("/api/v1/focus/shop/", {"item": "flower"}, format="json")
        assert response.status_code == 200
        assert response.data["coins"] == 5
    profile.refresh_from_db()
    assert profile.inventory == ["flower"]


def test_result_and_note_edits_persist(api, task, clock):
    session = start(api, task)
    clock(20)
    action(api, session, "finish")
    assert action(api, session, "result", result="Макет готов").data["result"] == "Макет готов"
    note = api.post(
        "/api/v1/focus/notes/", {"content": "Идея", "task": str(task.pk)}, format="json"
    ).data
    path = f"/api/v1/focus/notes/{note['id']}/"
    assert (
        api.patch(path, {"content": "Уточнённая идея"}, format="json").data["content"]
        == "Уточнённая идея"
    )
    assert api.delete(path).status_code == 204
    assert not FocusNote.objects.exists()
