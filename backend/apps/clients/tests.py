"""Tests for the Client 360 view: overview, activity timeline, health,
statuses, purchases and per-client filters."""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Role
from apps.documents.models import Document, DocumentType
from apps.finance.models import (
    ClientPurchase,
    Invoice,
    Payment,
    Product,
)
from apps.leads.models import Lead, LeadStage
from apps.messenger.models import Chat, ChatParticipant, Message
from apps.projects.models import Project, ProjectStatus
from apps.tasks.models import Task, TaskStatus

from .models import Client, ClientInteraction, ClientStatus
from .services import (
    HEALTH_AT_RISK,
    HEALTH_CRITICAL,
    HEALTH_HEALTHY,
    client_last_contact_at,
    compute_client_health,
)

User = get_user_model()


class Client360BaseTestCase(TestCase):
    def setUp(self):
        self.manager_role = Role.objects.create(name="project_manager")
        self.owner_role = Role.objects.create(name="owner")
        self.admin_role = Role.objects.create(name="superadmin")
        self.manager = User.objects.create_user(
            username="manager@test.local",
            email="manager@test.local",
            password="pass1234",
            first_name="Менеджер",
            last_name="Иванов",
            role=self.manager_role,
        )
        self.owner = User.objects.create_user(
            username="owner@test.local",
            email="owner@test.local",
            password="pass1234",
            first_name="Владелец",
            last_name="Сидоров",
            role=self.owner_role,
        )
        self.admin = User.objects.create_user(
            username="admin@test.local",
            email="admin@test.local",
            password="pass1234",
            first_name="Админ",
            last_name="Петров",
            role=self.admin_role,
        )
        self.client_entity = Client.objects.create(
            first_name="Иван",
            last_name="Петров",
            company_name="ООО Ромашка",
            phone="+79123456789",
            email="petrov@example.com",
            source="other",
            created_by=self.manager,
        )
        self.lead_stage = LeadStage.objects.create(
            name="Новый", order=1, probability=10
        )
        self.won_stage = LeadStage.objects.create(
            name="Выиграно", order=2, probability=100
        )
        self.project_status = ProjectStatus.objects.create(name="Активный")
        self.project = Project.objects.create(
            name="Сайт для Ромашки",
            client=self.client_entity,
            status=self.project_status,
            budget="500000",
            created_by=self.manager,
        )
        self.task_status = TaskStatus.objects.create(name="В работе")
        self.api = APIClient()


class ClientOverviewTests(Client360BaseTestCase):
    def setUp(self):
        super().setUp()
        self.client_entity.status = ClientStatus.objects.get(name="Активный")
        self.client_entity.save()
        self.active_lead = Lead.objects.create(
            client=self.client_entity,
            contact_name="Иван Петров",
            phone="+79123456789",
            source="call",
            budget="100000",
            current_stage=self.lead_stage,
            next_action="Позвонить клиенту",
            next_action_at=timezone.now() + timedelta(days=1),
            created_by=self.manager,
        )
        self.invoice = Invoice.objects.create(
            number="INV-001",
            client=self.client_entity,
            project=self.project,
            amount="500000",
            status="paid",
            issued_date=timezone.now().date() - timedelta(days=5),
            due_date=timezone.now().date() + timedelta(days=25),
            created_by=self.manager,
        )
        self.interaction = ClientInteraction.objects.create(
            client=self.client_entity,
            user=self.manager,
            type="call",
            description="Обсудили бриф",
        )
        self.document_type = DocumentType.objects.create(name="Договор", code="contract")
        self.api.force_authenticate(user=self.manager)

    def test_overview_returns_summary(self):
        response = self.api.get(f"/api/v1/clients/{self.client_entity.id}/360/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        summary = data["summary"]
        self.assertEqual(summary["total_revenue"], "500000.00")
        self.assertEqual(summary["deals_total"], 1)
        self.assertEqual(summary["deals_active"], 1)
        self.assertEqual(summary["deals_won"], 0)
        self.assertEqual(summary["deals_lost"], 0)
        self.assertEqual(summary["avg_deal_size"], "100000.00")
        self.assertEqual(summary["next_action"], "Позвонить клиенту")
        self.assertIsNotNone(summary["last_contact"])

    def test_overview_counts(self):
        Task.objects.create(
            project=self.project,
            title="Сверстать главную",
            status=self.task_status,
            created_by=self.manager,
        )
        Document.objects.create(
            document_type=self.document_type,
            client=self.client_entity,
            project=self.project,
            title="Договор",
            file="documents/test.pdf",
            file_name="test.pdf",
            created_by=self.manager,
        )
        product = Product.objects.create(name="Разработка", price="500000")
        ClientPurchase.objects.create(
            client=self.client_entity,
            product=product,
            quantity=1,
            unit_price="500000",
            created_by=self.manager,
        )
        Payment.objects.create(
            invoice=self.invoice,
            amount="500000",
            method="bank_transfer",
        )
        chat = Chat.objects.create(name="Чат с Ромашкой", created_by=self.manager)
        ChatParticipant.objects.create(chat=chat, client=self.client_entity)
        ChatParticipant.objects.create(chat=chat, user=self.manager)
        Message.objects.create(chat=chat, sender=self.manager, content="Привет!")

        response = self.api.get(f"/api/v1/clients/{self.client_entity.id}/360/")
        self.assertEqual(response.status_code, 200)
        counts = response.json()["counts"]
        self.assertEqual(counts["interactions"], 1)
        self.assertEqual(counts["deals"], 1)
        self.assertEqual(counts["projects"], 1)
        self.assertEqual(counts["tasks"], 1)
        self.assertEqual(counts["documents"], 1)
        self.assertEqual(counts["invoices"], 1)
        self.assertEqual(counts["payments"], 1)
        self.assertEqual(counts["purchases"], 1)
        self.assertEqual(counts["messages"], 1)

    def test_overview_includes_status_and_health(self):
        response = self.api.get(f"/api/v1/clients/{self.client_entity.id}/360/")
        data = response.json()
        client = data["client"]
        self.assertEqual(client["status"]["name"], "Активный")
        self.assertIn("health", client)
        self.assertEqual(client["health"]["level"], HEALTH_HEALTHY)

    def test_overview_unknown_client_returns_404(self):
        import uuid

        response = self.api.get(
            f"/api/v1/clients/{uuid.uuid4()}/360/"
        )
        self.assertEqual(response.status_code, 404)

    def test_detail_includes_status_and_health(self):
        response = self.api.get(f"/api/v1/clients/{self.client_entity.id}/")
        data = response.json()
        self.assertIn("health", data)
        self.assertIn("status", data)


class ClientActivityTests(Client360BaseTestCase):
    def setUp(self):
        super().setUp()
        self.invoice = Invoice.objects.create(
            number="INV-002",
            client=self.client_entity,
            project=self.project,
            amount="100000",
            status="sent",
            issued_date=timezone.now().date(),
            due_date=timezone.now().date() + timedelta(days=30),
            created_by=self.manager,
        )
        Lead.objects.create(
            client=self.client_entity,
            contact_name="Иван Петров",
            phone="+79123456789",
            source="call",
            current_stage=self.lead_stage,
            created_by=self.manager,
        )
        self.api.force_authenticate(user=self.manager)

    def test_activity_returns_paginated_sorted_items(self):
        ClientInteraction.objects.create(
            client=self.client_entity,
            user=self.manager,
            type="call",
            description="Звонок сегодня",
        )
        response = self.api.get(f"/api/v1/clients/{self.client_entity.id}/activity/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["count"], 4)
        self.assertEqual(len(data["results"]), 4)
        timestamps = [item["timestamp"] for item in data["results"]]
        self.assertEqual(timestamps, sorted(timestamps, reverse=True))
        types = {item["entity_type"] for item in data["results"]}
        self.assertIn("interaction", types)
        self.assertIn("invoice", types)
        self.assertIn("deal", types)
        self.assertIn("project", types)
        item = data["results"][0]
        for key in (
            "id", "entity_type", "title", "description",
            "actor", "ref_id", "ref_label", "timestamp",
        ):
            self.assertIn(key, item)

    def test_activity_respects_page_size(self):
        for i in range(3):
            ClientInteraction.objects.create(
                client=self.client_entity,
                user=self.manager,
                type="note",
                description=f"Заметка {i}",
            )
        response = self.api.get(
            f"/api/v1/clients/{self.client_entity.id}/activity/?page_size=2"
        )
        data = response.json()
        self.assertEqual(data["count"], 6)
        self.assertEqual(len(data["results"]), 2)
        self.assertIsNotNone(data["next"])

    def test_activity_unknown_client_returns_404(self):
        import uuid

        response = self.api.get(f"/api/v1/clients/{uuid.uuid4()}/activity/")
        self.assertEqual(response.status_code, 404)


class ClientHealthTests(Client360BaseTestCase):
    def _set_created_at(self, days_ago):
        Client.objects.filter(pk=self.client_entity.pk).update(
            created_at=timezone.now() - timedelta(days=days_ago)
        )
        self.client_entity.refresh_from_db()

    def test_healthy_client(self):
        ClientInteraction.objects.create(
            client=self.client_entity,
            user=self.manager,
            type="call",
            description="Свежий контакт",
        )
        Lead.objects.create(
            client=self.client_entity,
            contact_name="Иван Петров",
            phone="+79123456789",
            source="call",
            current_stage=self.lead_stage,
            created_by=self.manager,
        )
        Invoice.objects.create(
            number="INV-003",
            client=self.client_entity,
            amount="100000",
            status="paid",
            issued_date=timezone.now().date(),
            due_date=timezone.now().date() + timedelta(days=30),
            created_by=self.manager,
        )
        health = compute_client_health(self.client_entity)
        self.assertEqual(health["level"], HEALTH_HEALTHY)
        self.assertTrue(health["reasons"][HEALTH_HEALTHY])

    def test_inactive_client_is_critical(self):
        self.client_entity.is_active = False
        self.client_entity.save()
        health = compute_client_health(self.client_entity)
        self.assertEqual(health["level"], HEALTH_CRITICAL)

    def test_overdue_invoice_is_critical(self):
        Invoice.objects.create(
            number="INV-004",
            client=self.client_entity,
            amount="100000",
            status="sent",
            issued_date=timezone.now().date() - timedelta(days=60),
            due_date=timezone.now().date() - timedelta(days=30),
            created_by=self.manager,
        )
        health = compute_client_health(self.client_entity)
        self.assertEqual(health["level"], HEALTH_CRITICAL)
        self.assertIn(
            "Просроченных счетов: 1", health["reasons"][HEALTH_CRITICAL]
        )

    def test_long_absence_of_contact_is_at_risk(self):
        self._set_created_at(days_ago=90)
        health = compute_client_health(self.client_entity)
        self.assertEqual(health["level"], HEALTH_AT_RISK)
        self.assertTrue(any(
            "Нет контактов" in reason
            for reason in health["reasons"][HEALTH_AT_RISK]
        ))

    def test_recent_contact_without_deals_is_at_risk(self):
        ClientInteraction.objects.create(
            client=self.client_entity,
            user=self.manager,
            type="call",
            description="Недавний контакт",
        )
        health = compute_client_health(self.client_entity)
        self.assertEqual(health["level"], HEALTH_AT_RISK)
        self.assertIn(
            "Нет активных сделок", health["reasons"][HEALTH_AT_RISK]
        )

    def test_last_contact_considers_messages(self):
        chat = Chat.objects.create(name="Чат", created_by=self.manager)
        ChatParticipant.objects.create(chat=chat, client=self.client_entity)
        ChatParticipant.objects.create(chat=chat, user=self.manager)
        message = Message.objects.create(
            chat=chat, sender=self.manager, content="Привет!"
        )
        self.assertEqual(client_last_contact_at(self.client_entity), message.created_at)


class ClientStatusTests(Client360BaseTestCase):
    def test_default_statuses_are_seeded(self):
        names = set(ClientStatus.objects.values_list("name", flat=True))
        self.assertIn("Новый", names)
        self.assertIn("Активный", names)
        self.assertIn("VIP", names)
        self.assertIn("Неактивный", names)
        self.assertIn("В зоне риска", names)
        self.assertIn("Потерянный", names)

    def test_status_list_and_create(self):
        self.api.force_authenticate(user=self.manager)
        response = self.api.get("/api/v1/clients/statuses/")
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.json()), 6)

        response = self.api.post(
            "/api/v1/clients/statuses/",
            {"name": "Холодный", "color": "#111111", "order": 9},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(ClientStatus.objects.filter(name="Холодный").exists())

    def test_status_update_requires_admin(self):
        status_obj = ClientStatus.objects.first()
        self.api.force_authenticate(user=self.manager)
        response = self.api.patch(
            f"/api/v1/clients/statuses/{status_obj.id}/",
            {"name": "Переименован"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

        self.api.force_authenticate(user=self.admin)
        response = self.api.patch(
            f"/api/v1/clients/statuses/{status_obj.id}/",
            {"name": "Переименован"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        status_obj.refresh_from_db()
        self.assertEqual(status_obj.name, "Переименован")


class ClientPurchaseTests(Client360BaseTestCase):
    def setUp(self):
        super().setUp()
        self.api.force_authenticate(user=self.manager)
        self.product = Product.objects.create(name="SEO-продвижение", price="30000")

    def test_create_and_list_purchase(self):
        response = self.api.post(
            f"/api/v1/clients/{self.client_entity.id}/purchases/",
            {"product": str(self.product.id), "quantity": 2},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(str(data["unit_price"]), "30000.00")
        self.assertEqual(str(data["total_price"]), "60000.00")

        response = self.api.get(
            f"/api/v1/clients/{self.client_entity.id}/purchases/"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["results"][0]["product_name"], "SEO-продвижение")

    def test_product_catalog_endpoints(self):
        response = self.api.post(
            "/api/v1/finance/products/",
            {"name": "Лендинг", "price": "150000"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        product_id = response.json()["id"]
        response = self.api.get("/api/v1/finance/products/")
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.json()["count"], 1)
        response = self.api.patch(
            f"/api/v1/finance/products/{product_id}/",
            {"name": "Лендинг 2.0"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)


class ClientFilterTests(Client360BaseTestCase):
    def setUp(self):
        super().setUp()
        self.other_client = Client.objects.create(
            first_name="Другой",
            last_name="Клиент",
            phone="+79990001122",
            source="other",
            created_by=self.manager,
        )
        self.api.force_authenticate(user=self.manager)

    def test_projects_filter_by_client(self):
        other_project = Project.objects.create(
            name="Другой проект",
            client=self.other_client,
            status=self.project_status,
            created_by=self.manager,
        )
        response = self.api.get(
            f"/api/v1/projects/?client={self.client_entity.id}"
        )
        results = response.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(self.project.id))
        self.assertNotIn(str(other_project.id), [r["id"] for r in results])

    def test_leads_filter_by_client(self):
        Lead.objects.create(
            client=self.client_entity,
            contact_name="Иван",
            phone="+79123456789",
            source="call",
            current_stage=self.lead_stage,
            created_by=self.manager,
        )
        Lead.objects.create(
            client=self.other_client,
            contact_name="Другой",
            phone="+79990001122",
            source="call",
            current_stage=self.lead_stage,
            created_by=self.manager,
        )
        response = self.api.get(
            f"/api/v1/leads/?client={self.client_entity.id}"
        )
        results = response.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["contact_name"], "Иван")

    def test_tasks_filter_by_client(self):
        Task.objects.create(
            project=self.project,
            title="Задача Ромашки",
            status=self.task_status,
            created_by=self.manager,
        )
        other_project = Project.objects.create(
            name="Другой",
            client=self.other_client,
            status=self.project_status,
            created_by=self.manager,
        )
        Task.objects.create(
            project=other_project,
            title="Чужая задача",
            status=self.task_status,
            created_by=self.manager,
        )
        response = self.api.get(
            f"/api/v1/tasks/?client={self.client_entity.id}"
        )
        results = response.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "Задача Ромашки")

    def test_payments_filter_by_client(self):
        self.api.force_authenticate(user=self.owner)
        invoice = Invoice.objects.create(
            number="INV-010",
            client=self.client_entity,
            amount="100000",
            status="sent",
            issued_date=timezone.now().date(),
            due_date=timezone.now().date() + timedelta(days=30),
            created_by=self.manager,
        )
        Payment.objects.create(
            invoice=invoice, amount="50000", method="bank_transfer"
        )
        response = self.api.get(
            f"/api/v1/finance/payments/?client={self.client_entity.id}"
        )
        results = response.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["invoice_number"], "INV-010")

    def test_messenger_chats_filter_by_client(self):
        chat = Chat.objects.create(name="Чат Ромашки", created_by=self.manager)
        ChatParticipant.objects.create(chat=chat, user=self.manager)
        ChatParticipant.objects.create(chat=chat, client=self.client_entity)

        other_chat = Chat.objects.create(name="Чужой чат", created_by=self.manager)
        ChatParticipant.objects.create(chat=other_chat, user=self.manager)

        response = self.api.get(
            f"/api/v1/messenger/chats/?client={self.client_entity.id}"
        )
        results = response.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(chat.id))
