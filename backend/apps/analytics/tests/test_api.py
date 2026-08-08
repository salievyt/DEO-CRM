"""API tests for the Business Analytics endpoints."""

import pytest
from django.urls import reverse
from rest_framework import status as http_status

SUMMARY_URL = reverse("business-summary")
REVENUE_URL = reverse("business-revenue")
FUNNEL_URL = reverse("business-funnel")
MANAGERS_URL = reverse("business-managers")
SOURCES_URL = reverse("business-sources")
LTV_URL = reverse("business-ltv")
CHURN_URL = reverse("business-churn")
RETENTION_URL = reverse("business-retention")
CONFIG_URL = reverse("business-config")
EXPORT_URL = reverse("business-export")
COSTS_URL = reverse("business-acquisition-costs")


@pytest.mark.django_db
class TestPermissions:
    def test_anonymous_forbidden(self, api_client):
        assert api_client.get(SUMMARY_URL).status_code == http_status.HTTP_401_UNAUTHORIZED

    def test_client_role_forbidden(self, api_client, client_user):
        api_client.force_authenticate(client_user)
        assert api_client.get(SUMMARY_URL).status_code == http_status.HTTP_403_FORBIDDEN

    def test_staff_allowed_own_scope(self, api_client, manager):
        api_client.force_authenticate(manager)
        response = api_client.get(SUMMARY_URL)
        assert response.status_code == http_status.HTTP_200_OK

    def test_admin_sees_company(self, api_client, admin_user, manager, make_lead):
        make_lead(assigned=manager)
        api_client.force_authenticate(admin_user)
        response = api_client.get(SUMMARY_URL)
        assert response.data["total_leads"] == 1

    def test_manager_forced_to_own_data(self, api_client, manager, manager2, make_lead):
        make_lead(assigned=manager)
        make_lead(assigned=manager2)
        api_client.force_authenticate(manager)
        response = api_client.get(SUMMARY_URL)
        assert response.data["total_leads"] == 1
        # manager cannot fetch company scope
        response = api_client.get(SUMMARY_URL, {"scope": "company"})
        assert response.data["total_leads"] == 1


@pytest.mark.django_db
class TestEndpoints:
    def test_summary_shape(self, api_client, admin_user):
        api_client.force_authenticate(admin_user)
        data = api_client.get(SUMMARY_URL).data
        for key in ("revenue", "net_profit", "conversion_rate", "ltv", "cac", "avg_deal_size"):
            assert key in data
        assert "churn" in data

    def test_period_presets(self, api_client, admin_user):
        api_client.force_authenticate(admin_user)
        for period in ("today", "yesterday", "7d", "30d", "90d", "year"):
            response = api_client.get(SUMMARY_URL, {"period": period})
            assert response.status_code == 200

    def test_custom_range(self, api_client, admin_user):
        api_client.force_authenticate(admin_user)
        response = api_client.get(
            SUMMARY_URL,
            {"period": "custom", "start_date": "2024-01-01", "end_date": "2024-12-31"},
        )
        assert response.status_code == 200

    def test_funnel_endpoint(self, api_client, admin_user):
        api_client.force_authenticate(admin_user)
        data = api_client.get(FUNNEL_URL).data
        assert "stages" in data and "deal_to_won" in data

    def test_revenue_breakdown(self, api_client, admin_user, make_invoice):
        make_invoice(amount=1500)
        api_client.force_authenticate(admin_user)
        data = api_client.get(REVENUE_URL).data
        assert data["money"]["revenue"] == 1500
        assert data["dynamics"]["series"]

    def test_managers_sources_endpoints(self, api_client, admin_user):
        api_client.force_authenticate(admin_user)
        assert api_client.get(MANAGERS_URL).status_code == 200
        assert api_client.get(SOURCES_URL).status_code == 200

    def test_ltv_churn_retention(self, api_client, admin_user):
        api_client.force_authenticate(admin_user)
        assert api_client.get(LTV_URL).status_code == 200
        assert api_client.get(CHURN_URL).status_code == 200
        assert api_client.get(RETENTION_URL).status_code == 200

    def test_stage_config(self, api_client, admin_user, stages):
        api_client.force_authenticate(admin_user)
        data = api_client.get(CONFIG_URL).data
        kinds = {s["name"]: s["kind"] for s in data["stages"]}
        assert kinds["Победа"] == "won"
        assert kinds["Проигрыш"] == "lost"


@pytest.mark.django_db
class TestExport:
    def test_csv_export(self, api_client, admin_user):
        api_client.force_authenticate(admin_user)
        response = api_client.get(EXPORT_URL, {"export": "csv"})
        assert response.status_code == 200
        assert response["Content-Type"].startswith("text/csv")
        assert "attachment" in response["Content-Disposition"]
        assert "=== KPI ===" in response.content.decode("utf-8-sig")

    def test_pdf_export(self, api_client, admin_user):
        api_client.force_authenticate(admin_user)
        response = api_client.get(EXPORT_URL, {"export": "pdf"})
        assert response.status_code == 200
        assert response["Content-Type"] == "application/pdf"
        assert response.content.startswith(b"%PDF")


@pytest.mark.django_db
class TestAcquisitionCosts:
    def test_admin_only(self, api_client, admin_user, manager):
        api_client.force_authenticate(manager)
        assert api_client.get(COSTS_URL).status_code == http_status.HTTP_403_FORBIDDEN

        api_client.force_authenticate(admin_user)
        response = api_client.post(
            COSTS_URL,
            {"source": "website", "year": 2026, "month": 7, "amount": 1500},
        )
        assert response.status_code == http_status.HTTP_201_CREATED

        assert api_client.get(COSTS_URL).data["count"] == 1

    def test_duplicate_cost_rejected(self, api_client, admin_user):
        api_client.force_authenticate(admin_user)
        payload = {"source": "website", "year": 2026, "month": 7, "amount": 100}
        assert api_client.post(COSTS_URL, payload).status_code == 201
        assert api_client.post(COSTS_URL, payload).status_code == 400

    def test_detail_update(self, api_client, admin_user):
        from apps.analytics.models import SourceAcquisitionCost

        cost = SourceAcquisitionCost.objects.create(source="call", year=2026, month=7, amount=100)
        api_client.force_authenticate(admin_user)
        response = api_client.patch(
            reverse("business-acquisition-cost-detail", kwargs={"pk": cost.id}),
            {"amount": 250},
        )
        assert response.status_code == 200
        cost.refresh_from_db()
        assert cost.amount == 250
