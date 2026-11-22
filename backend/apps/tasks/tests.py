import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import Role
from apps.clients.models import Client
from apps.projects.models import Project, ProjectStatus

from .models import Task, TaskPriority, TaskStatus, TaskTimer

User = get_user_model()


@pytest.fixture
def api_user(db):
    role = Role.objects.get_or_create(name="project_manager")[0]
    return User.objects.create_user(
        username="pm@deo.test",
        email="pm@deo.test",
        password="pass1234",
        first_name="Менеджер",
        last_name="Иванов",
        role=role,
    )


@pytest.fixture
def project(db):
    status = ProjectStatus.objects.create(name="Активный")
    client = Client.objects.create(
        first_name="Иван",
        last_name="Петров",
        phone="+7 (912) 345-67-89",
        source="other",
    )
    return Project.objects.create(name="Сайт", client=client, status=status)


@pytest.fixture
def statuses(db):
    # The 0003 migration seeds default statuses; clear them so fallback
    # ordering assertions are deterministic.
    TaskStatus.objects.all().delete()
    return [
        TaskStatus.objects.create(name="К выполнению", order=0),
        TaskStatus.objects.create(name="В работе", order=1),
    ]


@pytest.fixture
def priorities(db):
    # The 0003 migration seeds default priorities; clear them so the
    # default-priority assertions are deterministic.
    TaskPriority.objects.all().delete()
    return [
        TaskPriority.objects.create(name="Низкий", level=0),
        TaskPriority.objects.create(name="Средний", level=1),
        TaskPriority.objects.create(name="Высокий", level=2),
    ]


@pytest.fixture
def api(api_user):
    client = APIClient()
    client.force_authenticate(api_user)
    return client


@pytest.mark.django_db
def test_create_task_without_status_uses_first(api, project, statuses):
    resp = api.post(
        reverse("task-list"),
        {"title": "Задача без статуса", "project": str(project.id)},
        format="json",
    )
    assert resp.status_code == 201, resp.data
    assert Task.objects.get(title="Задача без статуса").status == statuses[0]


@pytest.mark.django_db
def test_create_task_with_empty_status_uses_first(api, project, statuses):
    resp = api.post(
        reverse("task-list"),
        {"title": "Пустой статус", "project": str(project.id), "status": ""},
        format="json",
    )
    assert resp.status_code == 201, resp.data
    assert Task.objects.get(title="Пустой статус").status == statuses[0]


@pytest.mark.django_db
def test_create_task_with_explicit_status(api, project, statuses):
    resp = api.post(
        reverse("task-list"),
        {
            "title": "Явный статус",
            "project": str(project.id),
            "status": str(statuses[1].id),
        },
        format="json",
    )
    assert resp.status_code == 201, resp.data
    assert Task.objects.get(title="Явный статус").status == statuses[1]


@pytest.mark.django_db
def test_create_task_without_statuses_returns_400(api, project):
    TaskStatus.objects.all().delete()
    resp = api.post(
        reverse("task-list"),
        {"title": "Нет статусов", "project": str(project.id)},
        format="json",
    )
    assert resp.status_code == 400
    assert "status" in resp.data["detail"]


@pytest.mark.django_db
def test_create_task_with_empty_optional_fields(api, project, statuses, priorities):
    """Web form sends empty strings for unset optional fields."""
    resp = api.post(
        reverse("task-list"),
        {
            "title": "Пустые поля",
            "project": str(project.id),
            "assignee": "",
            "deadline": "",
            "priority": "",
        },
        format="json",
    )
    assert resp.status_code == 201, resp.data
    task = Task.objects.get(title="Пустые поля")
    assert task.assignee is None
    assert task.deadline is None


@pytest.mark.django_db
def test_create_task_without_priority_uses_default(api, project, statuses, priorities):
    resp = api.post(
        reverse("task-list"),
        {"title": "Без приоритета", "project": str(project.id)},
        format="json",
    )
    assert resp.status_code == 201, resp.data
    assert Task.objects.get(title="Без приоритета").priority.name == "Средний"


@pytest.mark.django_db
def test_create_task_with_empty_priority_uses_default(api, project, statuses, priorities):
    resp = api.post(
        reverse("task-list"),
        {"title": "Пустой приоритет", "project": str(project.id), "priority": ""},
        format="json",
    )
    assert resp.status_code == 201, resp.data
    assert Task.objects.get(title="Пустой приоритет").priority.name == "Средний"


@pytest.mark.django_db
def test_default_statuses_and_priorities_are_seeded():
    """The 0003 seed migration must provide default statuses and priorities."""
    status_names = set(TaskStatus.objects.values_list("name", flat=True))
    for name in ("К выполнению", "В работе", "На проверке", "Готово", "Отложено"):
        assert name in status_names

    priority_names = set(TaskPriority.objects.values_list("name", flat=True))
    for name in ("Низкий", "Средний", "Высокий", "Критический"):
        assert name in priority_names


def _client_with_task(suffix, project_status, task_status):
    role = Role.objects.get_or_create(name="client")[0]
    user = User.objects.create_user(
        username=f"client-{suffix}@deo.test",
        email=f"client-{suffix}@deo.test",
        password="pass1234",
        role=role,
    )
    client = Client.objects.create(
        user=user, first_name="Клиент", last_name=suffix, phone="+79120000000", source="other"
    )
    project = Project.objects.create(name=f"Проект {suffix}", client=client, status=project_status)
    task = Task.objects.create(title=f"Задача {suffix}", project=project, status=task_status)
    return user, task


@pytest.mark.django_db
def test_client_sees_only_own_tasks(statuses):
    project_status = ProjectStatus.objects.create(name="Клиентский")
    alice, alice_task = _client_with_task("alice", project_status, statuses[0])
    _, bob_task = _client_with_task("bob", project_status, statuses[0])

    api = APIClient()
    api.force_authenticate(alice)
    resp = api.get(reverse("task-list"))
    assert resp.status_code == 200
    assert {item["id"] for item in resp.data["results"]} == {str(alice_task.id)}

    # filters cannot widen the scope
    resp = api.get(reverse("task-list"), {"project": str(bob_task.project_id)})
    assert resp.data["results"] == []

    assert api.get(reverse("task-detail", args=[alice_task.id])).status_code == 200
    assert api.get(reverse("task-detail", args=[bob_task.id])).status_code == 404
    # clients are read-only on tasks: 403 before the object is even looked up
    assert api.delete(reverse("task-detail", args=[bob_task.id])).status_code in (403, 404)
    assert Task.objects.filter(pk=bob_task.pk).exists()


@pytest.mark.django_db
def test_staff_sees_all_tasks(api, statuses):
    project_status = ProjectStatus.objects.create(name="Клиентский")
    _, alice_task = _client_with_task("alice", project_status, statuses[0])
    _, bob_task = _client_with_task("bob", project_status, statuses[0])
    ids = {item["id"] for item in api.get(reverse("task-list")).data["results"]}
    assert {str(alice_task.id), str(bob_task.id)} <= ids


@pytest.fixture
def two_clients(statuses):
    project_status = ProjectStatus.objects.create(name="Клиентский")
    alice, alice_task = _client_with_task("alice", project_status, statuses[0])
    bob, bob_task = _client_with_task("bob", project_status, statuses[0])
    return alice, alice_task, bob, bob_task


def _api_as(user):
    api = APIClient()
    api.force_authenticate(user)
    return api


@pytest.mark.django_db
def test_client_kanban_shows_only_own_tasks(two_clients):
    alice, alice_task, _, bob_task = two_clients
    columns = _api_as(alice).get(reverse("task-kanban")).data
    ids = {task["id"] for column in columns for task in column["tasks"]}
    assert ids == {str(alice_task.id)}

    columns = _api_as(alice).get(reverse("task-kanban"), {"project": str(bob_task.project_id)}).data
    assert all(column["tasks"] == [] for column in columns)


@pytest.mark.django_db
def test_client_comments_only_on_own_tasks(two_clients):
    alice, alice_task, _, bob_task = two_clients
    api = _api_as(alice)
    foreign = reverse("task-comments", args=[bob_task.id])
    assert api.get(foreign).status_code == 404
    assert api.post(foreign, {"content": "x"}, format="json").status_code == 404
    assert not bob_task.comments.exists()

    own = reverse("task-comments", args=[alice_task.id])
    response = api.post(own, {"content": "Вопрос по задаче"}, format="json")
    assert response.status_code == 201, response.data
    assert api.get(own).status_code == 200


@pytest.mark.django_db
def test_comment_parent_must_belong_to_same_task(two_clients, api, api_user):
    from .models import TaskComment

    _, alice_task, _, bob_task = two_clients
    parent = TaskComment.objects.create(task=bob_task, user=api_user, content="чужой")
    response = api.post(
        reverse("task-comments", args=[alice_task.id]),
        {"content": "ответ", "parent_comment": str(parent.id)},
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_client_cannot_change_status_or_use_timer(two_clients, statuses):
    alice, alice_task, _, bob_task = two_clients
    api = _api_as(alice)
    for task in (alice_task, bob_task):
        response = api.post(
            reverse("task-change-status", args=[task.id]),
            {"status_id": str(statuses[1].id)},
            format="json",
        )
        assert response.status_code == 403
        assert api.post(reverse("task-timer-start", args=[task.id])).status_code == 403
        assert api.post(reverse("task-timer-stop", args=[task.id])).status_code == 403
    alice_task.refresh_from_db()
    assert alice_task.status_id == statuses[0].id
    assert not TaskTimer.objects.exists()


@pytest.mark.django_db
def test_client_cannot_write_own_task(two_clients, project):
    alice, alice_task, _, _ = two_clients
    api = _api_as(alice)
    url = reverse("task-detail", args=[alice_task.id])
    assert api.patch(url, {"title": "x"}, format="json").status_code == 403
    assert api.put(url, {"title": "x"}, format="json").status_code == 403
    assert api.delete(url).status_code == 403
    assert (
        api.post(
            reverse("task-list"), {"title": "x", "project": str(project.id)}, format="json"
        ).status_code
        == 403
    )
    alice_task.refresh_from_db()
    assert alice_task.title == "Задача alice"


@pytest.mark.django_db
def test_staff_keeps_working_with_tasks(two_clients, api, statuses):
    _, alice_task, _, bob_task = two_clients
    columns = api.get(reverse("task-kanban")).data
    ids = {task["id"] for column in columns for task in column["tasks"]}
    assert {str(alice_task.id), str(bob_task.id)} <= ids

    response = api.post(
        reverse("task-change-status", args=[bob_task.id]),
        {"status_id": str(statuses[1].id)},
        format="json",
    )
    assert response.status_code == 200, response.data
    bob_task.refresh_from_db()
    assert bob_task.status_id == statuses[1].id

    # The mobile app sends status_id as an integer.
    response = api.post(
        reverse("task-change-status", args=[bob_task.id]),
        {"status_id": statuses[0].id},
        format="json",
    )
    assert response.status_code == 200, response.data
    bob_task.refresh_from_db()
    assert bob_task.status_id == statuses[0].id

    assert (
        api.post(
            reverse("task-change-status", args=[bob_task.id]), {"status_id": ["x"]}, format="json"
        ).status_code
        == 400
    )

    comments = reverse("task-comments", args=[bob_task.id])
    assert api.post(comments, {"content": "ok"}, format="json").status_code == 201
    assert len(api.get(comments).data["results"]) == 1

    assert api.post(reverse("task-timer-start", args=[bob_task.id])).status_code == 200
    assert api.post(reverse("task-timer-stop", args=[bob_task.id])).status_code == 200
    assert (
        api.patch(
            reverse("task-detail", args=[bob_task.id]), {"title": "Новое"}, format="json"
        ).status_code
        == 200
    )


@pytest.mark.django_db
def test_user_without_role_sees_no_tasks(two_clients):
    _, alice_task, _, _ = two_clients
    nobody = User.objects.create_user(
        username="norole@deo.test", email="norole@deo.test", password="pass1234"
    )
    api = _api_as(nobody)
    assert api.get(reverse("task-list")).status_code == 403
    assert api.get(reverse("task-kanban")).status_code == 403
    assert api.get(reverse("task-detail", args=[alice_task.id])).status_code == 403
    assert api.get(reverse("task-comments", args=[alice_task.id])).status_code == 403
    assert api.post(reverse("task-timer-start", args=[alice_task.id])).status_code == 403


def test_scope_helpers_treat_missing_role_as_untrusted(db):
    from common.scoping import is_client, is_staff_member, scope_projects, scope_tasks

    nobody = User.objects.create_user(
        username="norole2@deo.test", email="norole2@deo.test", password="pass1234"
    )
    assert not is_client(nobody)
    assert not is_staff_member(nobody)
    assert list(scope_tasks(nobody)) == []
    assert list(scope_projects(nobody)) == []
