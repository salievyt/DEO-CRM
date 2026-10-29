import hashlib
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import Role
from apps.notifications.models import Notification

from .models import Lead, LeadHistory, LeadStage
from .website_models import CHUNK_BYTES, WebsiteAttachmentChunk, WebsiteSubmission

TOKEN = "website-integration-test-token-more-than-32-chars"
ROOT = "/api/v1/leads/website/"


@override_settings(WEBSITE_INGEST_TOKEN=TOKEN)
class WebsiteIntakeTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {TOKEN}")
        role, _ = Role.objects.get_or_create(name="project_manager")
        self.manager = get_user_model().objects.create_user(
            username="website-test-manager", email="manager@example.com", role=role
        )
        self.stage = LeadStage.objects.order_by("order", "pk").first() or LeadStage.objects.create(
            name="New", order=1
        )

    def payload(self, content=None):
        data = {
            "protocol_version": 1,
            "id": str(uuid4()),
            "created_at": timezone.now().isoformat(),
            "name": "Website test",
            "company": "Demo company",
            "email": "demo@example.com",
            "contact": "@demo_user",
            "project_type": "CRM",
            "description": "A test project request from the website.",
            "budget": "3000-5000",
            "timeline": "1-2 months",
            "locale": "ru",
            "consent": True,
            "consent_version": "2026-10-28",
            "utm_source": "website-test",
            "referrer": "https://www.deo-core.codes/",
        }
        if content is not None:
            data["attachment"] = {
                "name": "brief.txt",
                "size": len(content),
                "sha256": hashlib.sha256(content).hexdigest(),
                "parts": (len(content) + CHUNK_BYTES - 1) // CHUNK_BYTES,
            }
        return data

    def submit(self, data):
        return self.client.post(ROOT, data, format="json", HTTP_IDEMPOTENCY_KEY=data["id"])

    def chunk(self, data, index, content):
        return self.client.post(
            f"{ROOT}{data['id']}/attachment/{index}/",
            content,
            content_type="application/octet-stream",
            HTTP_IDEMPOTENCY_KEY=data["id"],
        )

    def test_authentication_and_fail_closed_configuration(self):
        self.client.credentials()
        self.assertEqual(self.client.get(ROOT + "health/").status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer wrong")
        self.assertEqual(self.client.get(ROOT + "health/").status_code, 401)
        with override_settings(WEBSITE_INGEST_TOKEN=""):
            self.assertEqual(self.client.get(ROOT + "health/").status_code, 503)

    def test_health_checks_protocol_and_funnel(self):
        response = self.client.get(ROOT + "health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["protocol_version"], 1)
        self.assertTrue(response.data["stage_ready"])
        self.assertEqual(response.data["chunk_bytes"], 512 * 1024)

    def test_create_is_idempotent_and_maps_website_fields(self):
        data = self.payload()
        first = self.submit(data)
        second = self.submit(data)
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(second.status_code, 200, second.data)
        self.assertEqual(first.data["lead_id"], second.data["lead_id"])
        self.assertEqual(Lead.objects.count(), 1)
        self.assertEqual(LeadHistory.objects.count(), 1)
        self.assertEqual(Notification.objects.filter(user=self.manager).count(), 1)
        lead = Lead.objects.get()
        self.assertEqual(lead.source, "website")
        self.assertEqual(lead.telegram, "@demo_user")
        self.assertEqual(lead.phone, "")
        self.assertIsNone(lead.budget)
        self.assertIn("$3,000–5,000", lead.notes)
        self.assertEqual(lead.business_need, data["description"])
        self.assertEqual(WebsiteSubmission.objects.get().utm, {"utm_source": "website-test"})
        self.client.force_authenticate(self.manager)
        detail = self.client.get(f"/api/v1/leads/{lead.pk}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["website"]["budget_label"], "$3,000–5,000")
        self.assertNotIn("payload_digest", detail.data["website"])

    def test_mismatched_key_changed_payload_and_deleted_lead(self):
        data = self.payload()
        self.assertEqual(
            self.client.post(
                ROOT, data, format="json", HTTP_IDEMPOTENCY_KEY=str(uuid4())
            ).status_code,
            400,
        )
        first = self.submit(data)
        data["description"] = "Different project under the same request ID."
        self.assertEqual(self.submit(data).status_code, 409)
        data["description"] = "A test project request from the website."
        Lead.objects.get(pk=first.data["lead_id"]).delete()
        self.assertEqual(self.submit(data).status_code, 410)
        self.assertEqual(Lead.objects.count(), 0)
        self.assertEqual(WebsiteSubmission.objects.count(), 1)

    def test_chunks_are_idempotent_checked_and_private(self):
        content = b"Project brief. " * (CHUNK_BYTES // 15 + 5000)
        data = self.payload(content)
        first = self.submit(data)
        self.assertEqual(first.status_code, 201)
        self.assertFalse(first.data["attachment_complete"])
        self.assertEqual(self.chunk(data, 0, content[:CHUNK_BYTES]).status_code, 200)
        self.assertEqual(self.chunk(data, 0, content[:CHUNK_BYTES]).status_code, 200)
        self.assertEqual(self.chunk(data, 0, b"x" * CHUNK_BYTES).status_code, 409)
        self.assertEqual(self.chunk(data, 1, b"x" * len(content[CHUNK_BYTES:])).status_code, 409)
        self.assertEqual(WebsiteAttachmentChunk.objects.count(), 1)
        last = self.chunk(data, 1, content[CHUNK_BYTES:])
        self.assertEqual(last.status_code, 200, last.data)
        self.assertTrue(last.data["attachment_complete"])
        self.assertEqual(WebsiteAttachmentChunk.objects.count(), 2)
        self.assertTrue(self.submit(data).data["attachment_complete"])
        download = f"/api/v1/leads/{first.data['lead_id']}/website-attachment/?part=0"
        self.client.credentials()
        self.assertEqual(self.client.get(download).status_code, 401)
        role, _ = Role.objects.get_or_create(name="client")
        customer = get_user_model().objects.create_user(
            username="website-test-client", email="client@example.com", role=role
        )
        self.client.force_authenticate(customer)
        self.assertEqual(self.client.get(download).status_code, 403)
        self.client.force_authenticate(self.manager)
        response = self.client.get(download)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, content[:CHUNK_BYTES])
        self.assertEqual(response["Cache-Control"], "private, no-store")

    def test_full_five_mb_attachment_uses_small_requests(self):
        content = b"a" * (5 * 1024 * 1024)
        data = self.payload(content)
        self.assertEqual(self.submit(data).status_code, 201)
        for index, start in enumerate(range(0, len(content), CHUNK_BYTES)):
            part = content[start : start + CHUNK_BYTES]
            self.assertLessEqual(len(part), 512 * 1024)
            response = self.chunk(data, index, part)
            self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data["attachment_complete"])

    def test_consent_path_traversal_and_large_descriptor_are_rejected(self):
        data = self.payload()
        data["consent"] = False
        self.assertEqual(self.submit(data).status_code, 400)
        for value in ["../brief.txt", "brief.exe"]:
            data = self.payload(b"data")
            data["attachment"]["name"] = value
            self.assertEqual(self.submit(data).status_code, 400)
        data = self.payload(b"data")
        data["attachment"]["size"] = 6 * 1024 * 1024
        self.assertEqual(self.submit(data).status_code, 400)
        self.assertFalse(Lead.objects.exists())

    def test_missing_funnel_and_invalid_assignee_roll_back(self):
        with override_settings(WEBSITE_LEAD_ASSIGNEE_ID=str(uuid4())):
            self.assertEqual(self.submit(self.payload()).status_code, 503)
        self.assertFalse(Lead.objects.exists())
        self.assertFalse(WebsiteSubmission.objects.exists())
        LeadStage.objects.all().delete()
        self.assertEqual(self.submit(self.payload()).status_code, 503)
        self.assertFalse(WebsiteSubmission.objects.exists())
