from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import Role
from apps.clients.models import Client

from .models import Project, ProjectStatus, ServiceType

User = get_user_model()


class ProjectDefaultsTest(TestCase):
    def test_default_project_statuses_exist(self):
        self.assertQuerySetEqual(
            ProjectStatus.objects.order_by("order").values_list("name", flat=True),
            [
                "Новый",
                "Переговоры",
                "Брифинг",
                "Оценка",
                "Согласование",
                "Планирование",
                "В работе",
                "На проверке",
                "Правки",
                "Готов к запуску",
                "Запущен",
                "На паузе",
                "Поддержка",
                "Завершён",
                "Отменён",
            ],
        )

    def test_default_service_types_exist(self):
        expected = {
            "Веб-разработка",
            "Мобильная разработка",
            "Веб-дизайн",
            "Графический дизайн",
            "Маркетинг",
            "CRM-системы",
            "Поддержка",
        }
        self.assertTrue(expected.issubset(set(ServiceType.objects.values_list("name", flat=True))))


def make_client_with_project(suffix, status):
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
    project = Project.objects.create(name=f"Проект {suffix}", client=client, status=status)
    return user, project


class ClientProjectScopeTest(TestCase):
    """A client sees only projects of their own Client card."""

    def setUp(self):
        status = ProjectStatus.objects.first()
        self.alice, self.alice_project = make_client_with_project("alice", status)
        self.bob, self.bob_project = make_client_with_project("bob", status)

    def api_as(self, user):
        api = APIClient()
        api.force_authenticate(user)
        return api

    def test_client_lists_only_own_projects(self):
        response = self.api_as(self.alice).get("/api/v1/projects/")
        self.assertEqual(response.status_code, 200)
        ids = {item["id"] for item in response.data["results"]}
        self.assertEqual(ids, {str(self.alice_project.id)})

    def test_client_cannot_open_foreign_project(self):
        api = self.api_as(self.alice)
        self.assertEqual(api.get(f"/api/v1/projects/{self.alice_project.id}/").status_code, 200)
        self.assertEqual(api.get(f"/api/v1/projects/{self.bob_project.id}/").status_code, 404)
        self.assertEqual(
            api.patch(
                f"/api/v1/projects/{self.bob_project.id}/", {"name": "x"}, format="json"
            ).status_code,
            404,
        )
        self.assertEqual(api.delete(f"/api/v1/projects/{self.bob_project.id}/").status_code, 404)
        self.assertTrue(Project.objects.filter(pk=self.bob_project.pk, name="Проект bob").exists())

    def test_staff_still_sees_all(self):
        pm = User.objects.create_user(
            username="pm@deo.test",
            email="pm@deo.test",
            password="pass1234",
            role=Role.objects.get_or_create(name="project_manager")[0],
        )
        response = self.api_as(pm).get("/api/v1/projects/")
        ids = {item["id"] for item in response.data["results"]}
        self.assertTrue({str(self.alice_project.id), str(self.bob_project.id)} <= ids)

    def test_user_without_role_is_not_treated_as_client(self):
        nobody = User.objects.create_user(
            username="norole@deo.test", email="norole@deo.test", password="pass1234"
        )
        self.assertEqual(self.api_as(nobody).get("/api/v1/projects/").status_code, 200)
