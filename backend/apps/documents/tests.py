from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import Role

from .models import Document, DocumentType


class DocumentWorkflowTest(TestCase):
    def setUp(self):
        role = Role.objects.create(name="superadmin")
        self.user = get_user_model().objects.create_user(
            email="docs@example.com",
            username="docs",
            password="StrongPass123!",
            first_name="Doc",
            last_name="Admin",
            role=role,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.document_type = DocumentType.objects.get(code="other")

    def test_google_document_can_be_added_without_file(self):
        response = self.client.post(
            "/api/v1/documents/",
            {
                "title": "Рабочий документ",
                "document_type": self.document_type.pk,
                "source": "google_docs",
                "external_url": "https://docs.google.com/document/d/example/edit",
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 201)
        document = Document.objects.get()
        self.assertEqual(document.source, "google_docs")
        self.assertIn("/preview", document.preview_url)

    def test_new_file_version_updates_document(self):
        first = SimpleUploadedFile("brief.txt", b"first", content_type="text/plain")
        document = Document.objects.create(
            title="Бриф",
            document_type=self.document_type,
            file=first,
            file_name=first.name,
            mime_type=first.content_type,
            created_by=self.user,
        )
        second = SimpleUploadedFile("brief-v2.txt", b"second", content_type="text/plain")
        response = self.client.post(
            f"/api/v1/documents/{document.pk}/versions/",
            {"file": second, "comment": "Правки клиента"},
            format="multipart",
        )
        self.assertEqual(response.status_code, 201)
        document.refresh_from_db()
        self.assertEqual(document.versions.count(), 1)
        self.assertEqual(document.file_name, "brief-v2.txt")


# TODO: Define tests for this app
