from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import Role
from apps.clients.models import Client
from apps.documents.models import Document, DocumentType
from apps.finance.models import Invoice
from apps.projects.models import Project, ProjectStatus, ProjectTeamMember

from .models import ProjectMilestone


class CabinetAccessTest(TestCase):
    """The cabinet must work for every role, with correctly scoped data."""

    def setUp(self):
        self.client_role = Role.objects.create(name="client")
        self.pm_role = Role.objects.create(name="project_manager")
        self.dev_role = Role.objects.create(name="developer")

        self.status = ProjectStatus.objects.create(name="В работе", order=1)
        self.doc_type = DocumentType.objects.get(code="other")

        self.client_user = get_user_model().objects.create_user(
            email="client@example.com",
            username="client",
            password="StrongPass123!",
            first_name="Иван",
            last_name="Клиент",
            role=self.client_role,
        )
        self.client_profile = Client.objects.create(
            user=self.client_user,
            first_name="Иван",
            last_name="Клиент",
            phone="+70000000000",
        )
        self.project = Project.objects.create(
            name="Проект клиента",
            client=self.client_profile,
            status=self.status,
        )
        self.milestone = ProjectMilestone.objects.create(
            project=self.project,
            name="Этап 1",
            status=ProjectMilestone.Status.PENDING,
        )

        self.pm_user = get_user_model().objects.create_user(
            email="pm@example.com",
            username="pm",
            password="StrongPass123!",
            first_name="Пётр",
            last_name="Менеджер",
            role=self.pm_role,
        )
        self.dev_user = get_user_model().objects.create_user(
            email="dev@example.com",
            username="dev",
            password="StrongPass123!",
            first_name="Дэн",
            last_name="Разработчик",
            role=self.dev_role,
        )

        self.doc_visible = Document.objects.create(
            title="Договор",
            document_type=self.doc_type,
            client=self.client_profile,
            is_visible_to_client=True,
            file_name="dogovor.pdf",
            mime_type="application/pdf",
            created_by=self.pm_user,
        )
        self.doc_invisible = Document.objects.create(
            title="Черновик",
            document_type=self.doc_type,
            client=self.client_profile,
            is_visible_to_client=False,
            file_name="draft.pdf",
            mime_type="application/pdf",
            created_by=self.pm_user,
        )

        self.invoice = Invoice.objects.create(
            number="INV-001",
            project=self.project,
            client=self.client_profile,
            amount=10000,
            status="sent",
            issued_date=date(2026, 1, 1),
            due_date=date(2026, 1, 31),
        )

        self.api = APIClient()

    def test_requires_authentication(self):
        response = self.api.get("/api/v1/cabinet/projects/")
        self.assertIn(response.status_code, (401, 403))

    def test_manager_sees_portfolio(self):
        self.api.force_authenticate(self.pm_user)

        response = self.api.get("/api/v1/cabinet/projects/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Проект клиента")
        self.assertEqual(response.data[0]["milestones"]["pending"], 1)

    def test_client_sees_only_own_projects(self):
        other_client = Client.objects.create(
            first_name="Другой", last_name="Клиент", phone="+70000000001"
        )
        Project.objects.create(
            name="Чужой проект", client=other_client, status=self.status
        )
        self.api.force_authenticate(self.client_user)

        response = self.api.get("/api/v1/cabinet/projects/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([p["name"] for p in response.data], ["Проект клиента"])

    def test_developer_sees_only_team_projects(self):
        self.api.force_authenticate(self.dev_user)
        self.assertEqual(self.api.get("/api/v1/cabinet/projects/").data, [])

        ProjectTeamMember.objects.create(
            project=self.project, user=self.dev_user, role_in_project="developer"
        )

        response = self.api.get("/api/v1/cabinet/projects/")
        self.assertEqual(len(response.data), 1)

    def test_client_without_profile_gets_empty_cabinet(self):
        orphan = get_user_model().objects.create_user(
            email="orphan@example.com",
            username="orphan",
            password="StrongPass123!",
            first_name="Без",
            last_name="Профиля",
            role=self.client_role,
        )
        self.api.force_authenticate(orphan)

        response = self.api.get("/api/v1/cabinet/dashboard/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["active_projects"], 0)

    def test_manager_dashboard_counts_pending_approvals(self):
        self.api.force_authenticate(self.pm_user)

        response = self.api.get("/api/v1/cabinet/dashboard/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["pending_approvals"], 1)

    def test_client_can_approve_milestone(self):
        self.api.force_authenticate(self.client_user)

        response = self.api.post(
            f"/api/v1/cabinet/projects/{self.project.pk}"
            f"/milestones/{self.milestone.pk}/approve/"
        )

        self.assertEqual(response.status_code, 200)
        self.milestone.refresh_from_db()
        self.assertEqual(self.milestone.status, ProjectMilestone.Status.APPROVED)

    def test_outsider_cannot_touch_foreign_milestone(self):
        self.api.force_authenticate(self.dev_user)

        response = self.api.post(
            f"/api/v1/cabinet/projects/{self.project.pk}"
            f"/milestones/{self.milestone.pk}/approve/"
        )

        self.assertEqual(response.status_code, 404)

    def test_client_documents_are_filtered(self):
        self.api.force_authenticate(self.client_user)
        response = self.api.get("/api/v1/cabinet/documents/")
        self.assertEqual(response.status_code, 200)
        titles = {d["title"] for d in response.data}
        self.assertIn("Договор", titles)
        self.assertNotIn("Черновик", titles)

    def test_client_invoices_visible(self):
        self.api.force_authenticate(self.client_user)
        response = self.api.get("/api/v1/cabinet/invoices/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["number"], "INV-001")
