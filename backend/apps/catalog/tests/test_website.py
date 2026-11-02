from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from apps.catalog.models import CatalogItem

TOKEN = "catalog-test-token-with-at-least-32-characters"

@override_settings(WEBSITE_INGEST_TOKEN=TOKEN)
class WebsiteCatalogTests(TestCase):
    def test_auth_and_no_internal_fields(self):
        client = APIClient()
        self.assertEqual(client.get("/api/v1/catalog/website-services/").status_code, 401)
        CatalogItem.objects.create(name="Website", type="service", description="Public description", cost_price=12345)
        CatalogItem.objects.create(name="Draft", type="service", status="inactive")
        CatalogItem.objects.create(name="Product", type="product")
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {TOKEN}")
        response = client.get("/api/v1/catalog/website-services/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["services"]), 1)
        self.assertEqual(set(response.data["services"][0]), {"id", "name", "description", "category"})
        self.assertEqual(client.post("/api/v1/catalog/website-services/", {}).status_code, 405)
