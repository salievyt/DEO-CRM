import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import Role
from apps.clients.models import Client
from apps.projects.models import Project, ProjectStatus

from .models import Task, TaskStatus

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
    return [
        TaskStatus.objects.create(name="К выполнению", order=0),
        TaskStatus.objects.create(name="В работе", order=1),
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
    resp = api.post(
        reverse("task-list"),
        {"title": "Нет статусов", "project": str(project.id)},
        format="json",
    )
    assert resp.status_code == 400
    assert "status" in resp.data["detail"]
