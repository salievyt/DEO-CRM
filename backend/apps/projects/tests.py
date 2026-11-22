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
        # clients are read-only on projects: 403 before the object is looked up
        self.assertIn(
            api.patch(
                f"/api/v1/projects/{self.bob_project.id}/", {"name": "x"}, format="json"
            ).status_code,
            (403, 404),
        )
        self.assertIn(
            api.delete(f"/api/v1/projects/{self.bob_project.id}/").status_code, (403, 404)
        )
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

    def test_user_without_role_sees_nothing(self):
        nobody = User.objects.create_user(
            username="norole@deo.test", email="norole@deo.test", password="pass1234"
        )
        api = self.api_as(nobody)
        self.assertEqual(api.get("/api/v1/projects/").status_code, 403)
        self.assertEqual(api.get(f"/api/v1/projects/{self.alice_project.id}/").status_code, 403)
        self.assertEqual(api.get("/api/v1/projects/health/").status_code, 403)
        self.assertEqual(
            api.get(f"/api/v1/projects/{self.alice_project.id}/timesheet/").status_code, 403
        )


class ClientProjectWriteAndTimesheetTest(TestCase):
    def setUp(self):
        status = ProjectStatus.objects.first()
        self.alice, self.alice_project = make_client_with_project("alice", status)
        self.bob, self.bob_project = make_client_with_project("bob", status)
        self.pm = User.objects.create_user(
            username="pm@deo.test",
            email="pm@deo.test",
            password="pass1234",
            role=Role.objects.get_or_create(name="project_manager")[0],
        )

    def api_as(self, user):
        api = APIClient()
        api.force_authenticate(user)
        return api

    def test_client_cannot_write_own_project(self):
        api = self.api_as(self.alice)
        url = f"/api/v1/projects/{self.alice_project.id}/"
        self.assertEqual(api.patch(url, {"name": "x"}, format="json").status_code, 403)
        self.assertEqual(
            api.put(
                url, {"name": "x", "client": str(self.alice_project.client_id)}, format="json"
            ).status_code,
            403,
        )
        self.assertEqual(api.delete(url).status_code, 403)
        self.alice_project.refresh_from_db()
        self.assertEqual(self.alice_project.name, "Проект alice")

    def test_client_cannot_create_project_or_service_type(self):
        api = self.api_as(self.alice)
        self.assertEqual(
            api.post(
                "/api/v1/projects/",
                {"name": "Чужой", "client": str(self.bob_project.client_id)},
                format="json",
            ).status_code,
            403,
        )
        self.assertEqual(
            api.post("/api/v1/projects/service-types/", {"name": "x"}, format="json").status_code,
            403,
        )
        self.assertEqual(api.get("/api/v1/projects/service-types/").status_code, 200)

    def test_client_cannot_read_timesheet(self):
        api = self.api_as(self.alice)
        for project in (self.alice_project, self.bob_project):
            self.assertEqual(api.get(f"/api/v1/projects/{project.id}/timesheet/").status_code, 403)

    def test_client_health_is_scoped(self):
        api = self.api_as(self.alice)
        ids = {row["id"] for row in api.get("/api/v1/projects/health/").data}
        self.assertEqual(ids, {str(self.alice_project.id)})
        self.assertEqual(
            api.get(f"/api/v1/projects/{self.alice_project.id}/health/").status_code, 200
        )
        self.assertEqual(
            api.get(f"/api/v1/projects/{self.bob_project.id}/health/").status_code, 404
        )

    def test_staff_keeps_working(self):
        api = self.api_as(self.pm)
        self.assertEqual(
            api.get(f"/api/v1/projects/{self.bob_project.id}/timesheet/").status_code, 200
        )
        response = api.patch(
            f"/api/v1/projects/{self.bob_project.id}/", {"name": "Новое"}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(
            api.post(
                "/api/v1/projects/service-types/", {"name": "Новый тип"}, format="json"
            ).status_code,
            201,
        )
