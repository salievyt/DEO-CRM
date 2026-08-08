"""Tests for Business Analytics metrics (all calculated on the backend)."""

from datetime import timedelta

import pytest
from django.utils import timezone

from django.contrib.auth import get_user_model

from apps.analytics.constants import resolve_period
from apps.analytics.funnel import get_lead_outcomes, get_stage_classification
from apps.analytics.services import (
    AnalyticsScope,
    Period,
    compute_churn,
    compute_ltv,
    compute_managers,
    compute_retention,
    compute_sources,
    get_funnel,
    get_revenue_breakdown,
    get_summary,
)
from apps.analytics.models import SourceAcquisitionCost
from apps.finance.models import Expense, ExpenseCategory, Salary

User = get_user_model()

COMPANY = AnalyticsScope("company", None)


def _period(**kwargs):
    start, end = resolve_period(**kwargs)
    return Period(start, end)


@pytest.mark.django_db
class TestEmptyData:
    """Edge case: no leads, no clients, no deals, no invoices."""

    def test_summary_all_zero(self, today_period):
        s = get_summary(COMPANY, today_period)
        assert s["revenue"] == 0
        assert s["net_profit"] == 0
        assert s["total_leads"] == 0
        assert s["won_deals"] == 0
        assert s["conversion_rate"] == 0
        assert s["avg_deal_size"] == 0
        assert s["sales_cycle_days"] == 0
        assert s["ltv"] == 0
        assert s["cac"] == 0
        assert s["churn"]["churn_rate"] == 0

    def test_funnel_empty(self, today_period):
        f = get_funnel(COMPANY, today_period)
        assert f["total_leads"] == 0
        assert f["deal_to_won"] == 0

    def test_sources_empty(self, today_period):
        rows = compute_sources(today_period, COMPANY)
        assert all(r["leads"] == 0 for r in rows)
        assert all(r["cac"] == 0 for r in rows)


@pytest.mark.django_db
class TestRevenue:
    def test_revenue_from_paid_invoices(self, today_period, make_invoice):
        make_invoice(amount=1000)
        make_invoice(amount=2500)
        s = get_summary(COMPANY, today_period)
        assert s["revenue"] == 3500
        assert s["gross_profit"] == 3500  # no costs yet
        assert s["net_profit"] == 3500

    def test_revenue_excludes_unpaid(self, today_period, make_invoice, make_client):
        make_invoice(amount=1000)
        inv = make_invoice(amount=5000)
        inv.status = "sent"
        inv.save()
        s = get_summary(COMPANY, today_period)
        assert s["revenue"] == 1000

    def test_cancelled_invoice_not_revenue(self, today_period, make_invoice):
        make_invoice(amount=1000)
        make_invoice(amount=700, paid=False)  # cancelled
        s = get_summary(COMPANY, today_period)
        assert s["revenue"] == 1000
        # ...but the returned money is reported as refunds (informational)
        assert s["refunds"] == 700

    def test_outside_period_excluded(self, make_invoice):
        make_invoice(amount=1000, paid_days_ago=100)
        s = get_summary(COMPANY, _period(period_key="30d"))
        assert s["revenue"] == 0

    def test_profit_with_cogs_expenses_salaries(
        self, today_period, make_invoice, make_project, admin_user
    ):
        project = make_project(cost=300, budget=1000)
        make_invoice(amount=1000, project=project)
        cat = ExpenseCategory.objects.create(name="Маркетинг")
        Expense.objects.create(
            category=cat,
            amount=100,
            description="Реклама",
            expense_date=timezone.localdate(),
        )
        Salary.objects.create(
            user=User.objects.first(),
            amount=200,
            month=timezone.localdate().month,
            year=timezone.localdate().year,
            paid_at=timezone.localdate(),
        )
        s = get_summary(COMPANY, today_period)
        assert s["revenue"] == 1000
        assert s["cogs"] == 300
        assert s["gross_profit"] == 700
        assert s["expenses"] == 100  # expenses and salaries are separate
        assert s["salaries"] == 200
        assert s["net_profit"] == 400

    def test_revenue_dynamics_series(self, today_period, make_invoice):
        make_invoice(amount=1000)
        make_invoice(amount=2000)
        data = get_revenue_breakdown(COMPANY, today_period)
        series = data["dynamics"]["series"]
        assert series
        total = sum(p["revenue"] for p in series)
        assert total == 3000

    def test_revenue_by_product_and_source(
        self, today_period, make_invoice, make_client, make_project
    ):
        project = make_project(cost=0)
        client_a = make_client(source="telegram")
        make_invoice(amount=1000, client_obj=client_a, project=project)
        data = get_revenue_breakdown(COMPANY, today_period)
        products = {r["product"]: r["revenue"] for r in data["by_product"]}
        sources = {r["source"]: r["revenue"] for r in data["by_source"]}
        assert products.get("Веб-разработка") == 1000
        assert sources.get("telegram") == 1000


@pytest.mark.django_db
class TestFunnel:
    def test_funnel_steps(self, today_period, make_lead, make_history, stages):
        make_lead(stage="new")  # plain lead
        qualified = make_lead(stage="new")
        make_history(qualified, stages["qualified"])  # worked → qualified
        make_lead(stage="deal")  # already in deal stage
        won = make_lead(stage="won")  # won
        make_history(won, stages["won"])

        f = get_funnel(COMPANY, today_period)
        assert f["total_leads"] == 4
        assert f["qualified_leads"] == 3  # qualified + deal + won
        assert f["deals"] == 1  # only the stage classified as a deal
        assert f["won_deals"] == 1
        assert f["deal_to_won"] == 100.0

    def test_won_lost_counts(self, today_period, make_lead, make_history, stages):
        won = make_lead(stage="new")
        make_history(won, stages["won"])
        lost = make_lead(stage="new")
        make_history(lost, stages["lost"])
        f = get_funnel(COMPANY, today_period)
        assert f["won_deals"] == 1
        assert f["lost_deals"] == 1

    def test_won_revenue_and_avg_deal_size(self, today_period, make_lead, make_history, stages):
        for budget in (1000, 2000):
            lead = make_lead(stage="new", budget=budget)
            make_history(lead, stages["won"])
        s = get_summary(COMPANY, today_period)
        assert s["won_revenue"] == 3000
        assert s["avg_deal_size"] == 1500

    def test_null_budget_won_deal_ignored_in_size(
        self, today_period, make_lead, make_history, stages
    ):
        lead = make_lead(stage="new", budget=None)
        make_history(lead, stages["won"])
        s = get_summary(COMPANY, today_period)
        assert s["won_deals"] == 1
        assert s["won_revenue"] == 0
        assert s["avg_deal_size"] == 0

    def test_sales_cycle_days(self, today_period, make_lead, make_history, stages):
        lead = make_lead(stage="new", created_days_ago=10)
        make_history(lead, stages["won"], days_ago=0)
        s = get_summary(COMPANY, today_period)
        assert s["sales_cycle_days"] == pytest.approx(10, abs=1)

    def test_stage_keyword_fallback(self, db, stages, make_lead):
        """All stages at probability 0 → name keywords drive the classification."""
        from apps.leads.models import LeadStage

        LeadStage.objects.all().update(probability=0)
        from apps.analytics.funnel import clear_stage_classification_cache

        clear_stage_classification_cache()
        classification = get_stage_classification()
        kinds = {s.id: k for s in LeadStage.objects.all() for k in [classification.get(s.id)]}
        assert kinds[stages["won"].id] == "won"
        assert kinds[stages["lost"].id] == "lost"
        assert kinds[stages["new"].id] == "lead"


@pytest.mark.django_db
class TestLtv:
    def test_ltv_with_multiple_purchases(self, today_period, make_invoice, make_client):
        client_a = make_client()
        make_invoice(amount=1000, client_obj=client_a)
        make_invoice(amount=2000, client_obj=client_a)
        make_invoice(amount=500)  # another client
        data = compute_ltv()
        assert data["paying_clients"] == 2
        assert data["total_revenue"] == 3500
        assert data["ltv"] == 1750
        assert data["repeat_purchase_rate"] == 50.0
        assert data["avg_orders_per_client"] == 1.5

    def test_ltv_empty(self, today_period):
        data = compute_ltv()
        assert data["ltv"] == 0
        assert data["paying_clients"] == 0

    def test_ltv_cohorts(self, today_period, make_invoice, make_client):
        c = make_client()
        inv = make_invoice(amount=1000, client_obj=c)
        inv.paid_at = timezone.now() - timedelta(days=40)
        inv.save()
        data = compute_ltv()
        assert data["ltv_by_cohort"]


@pytest.mark.django_db
class TestCac:
    def test_cac_computed(self, today_period, make_client):
        make_client(source="website")
        make_client(source="website")
        SourceAcquisitionCost.objects.create(
            source="website",
            year=timezone.localdate().year,
            month=timezone.localdate().month,
            amount=1000,
        )
        s = get_summary(COMPANY, today_period)
        assert s["cac"] == 500

    def test_cac_zero_without_cost(self, today_period, make_client):
        make_client()
        s = get_summary(COMPANY, today_period)
        assert s["cac"] == 0

    def test_cac_zero_without_clients(self, today_period):
        SourceAcquisitionCost.objects.create(
            source="website",
            year=timezone.localdate().year,
            month=timezone.localdate().month,
            amount=1000,
        )
        s = get_summary(COMPANY, today_period)
        assert s["cac"] == 0


@pytest.mark.django_db
class TestChurn:
    def test_churned_client(self, make_invoice, make_client, today_period):
        client_a = make_client()
        # paid 60 days ago → active before the 30d period
        make_invoice(amount=1000, client_obj=client_a, paid_days_ago=60)
        data = compute_churn(today_period)
        assert data["active_base"] == 1
        assert data["churned"] == 1
        assert data["churn_rate"] == 100.0

    def test_retained_client(self, make_invoice, make_client, today_period):
        client_a = make_client()
        make_invoice(amount=1000, client_obj=client_a, paid_days_ago=60)
        make_invoice(amount=500, client_obj=client_a, paid_days_ago=5)
        data = compute_churn(today_period)
        assert data["active_base"] == 1
        assert data["churned"] == 0
        assert data["churn_rate"] == 0.0


@pytest.mark.django_db
class TestRetention:
    def test_retention_cohort(self, make_invoice, make_client):
        c1, c2, c3 = make_client(), make_client(), make_client()
        # All three first purchase this month (cohort); c1 & c2 buy again next month.
        make_invoice(amount=100, client_obj=c1)
        make_invoice(amount=100, client_obj=c2)
        make_invoice(amount=100, client_obj=c3)

        for c in (c1, c2):
            inv = make_invoice(amount=200, client_obj=c)
            inv.paid_at = timezone.now() + timedelta(days=32)  # next month
            inv.save()

        rows = compute_retention(max_cohorts=3)
        cohort = rows[-1]
        assert cohort["size"] == 3
        assert cohort["retention"][0] == 100.0
        assert cohort["retention"][1] == pytest.approx(66.7, abs=0.1)


@pytest.mark.django_db
class TestSources:
    def test_source_metrics(
        self, today_period, make_lead, make_history, stages, make_invoice, make_client
    ):
        lead = make_lead(source="instagram", budget=500)
        make_history(lead, stages["won"])
        make_lead(source="website", budget=100)
        make_invoice(amount=500, client_obj=make_client(source="instagram"))

        rows = {r["source"]: r for r in compute_sources(today_period, COMPANY)}
        assert rows["instagram"]["leads"] == 1
        assert rows["instagram"]["won"] == 1
        assert rows["instagram"]["conversion"] == 100.0
        assert rows["website"]["leads"] == 1
        assert rows["website"]["won"] == 0
        assert rows["instagram"]["revenue"] == 500
        assert rows["instagram"]["cac"] == 0
        assert rows["instagram"]["roi"] == 0

    def test_source_roi_with_cost(self, today_period, make_invoice, make_client):
        make_invoice(amount=1000, client_obj=make_client(source="website"))
        SourceAcquisitionCost.objects.create(
            source="website",
            year=timezone.localdate().year,
            month=timezone.localdate().month,
            amount=250,
        )
        rows = {r["source"]: r for r in compute_sources(today_period, COMPANY)}
        assert rows["website"]["revenue"] == 1000
        assert rows["website"]["cost"] == 250
        assert rows["website"]["roi"] == 300.0

    def test_missing_source_falls_back_to_other(self, today_period, make_client):
        # A client without source → grouped under "other"
        client_obj = make_client()
        client_obj.source = ""
        client_obj.save(update_fields=["source"])
        from apps.finance.models import Invoice

        Invoice.objects.create(
            number="INV-EDGE-1",
            client=client_obj,
            amount=500,
            status="paid",
            issued_date=timezone.localdate(),
            due_date=timezone.localdate(),
            paid_at=timezone.now(),
        )
        rows = {r["source"]: r for r in compute_sources(today_period, COMPANY)}
        assert rows["other"]["revenue"] == 500


@pytest.mark.django_db
class TestManagers:
    def test_manager_metrics(
        self, today_period, make_lead, make_history, stages, manager, manager2
    ):
        won = make_lead(budget=1000, assigned=manager)
        make_history(won, stages["won"])
        make_lead(budget=300, assigned=manager2)
        make_history(make_lead(stage="deal", assigned=manager), stages["deal"])

        rows = {r["user_id"]: r for r in compute_managers(today_period, COMPANY)}
        m = rows[str(manager.id)]
        assert m["leads"] == 2
        assert m["deals"] == 1
        assert m["won"] == 1
        assert m["conversion"] == 50.0
        assert m["avg_deal_size"] == 1000
        m2 = rows[str(manager2.id)]
        assert m2["leads"] == 1
        assert m2["won"] == 0

    def test_manager_revenue_attribution(
        self, today_period, make_lead, make_history, stages, manager, make_invoice
    ):
        from apps.clients.models import Client

        client_obj = Client.objects.create(
            first_name="К", last_name="Л", phone="+7999", source="call"
        )
        won = make_lead(budget=500, assigned=manager, client_obj=client_obj)
        make_history(won, stages["won"])
        make_invoice(amount=2000, client_obj=client_obj)

        rows = {r["user_id"]: r for r in compute_managers(today_period, COMPANY)}
        assert rows[str(manager.id)]["revenue"] == 2000


@pytest.mark.django_db
class TestScope:
    def test_manager_scope_only_own(
        self, today_period, make_lead, make_history, stages, manager, manager2
    ):
        make_lead(assigned=manager)
        make_lead(assigned=manager2)
        scope = AnalyticsScope("manager", manager.id)
        s = get_summary(scope, today_period)
        assert s["total_leads"] == 1
        # company scope sees both
        assert get_summary(COMPANY, today_period)["total_leads"] == 2


@pytest.mark.django_db
class TestOutcomes:
    def test_outcome_timestamps_via_history(self, make_lead, make_history, stages):
        lead = make_lead(created_days_ago=5)
        make_history(lead, stages["won"], days_ago=1)
        won_at, lost_at = get_lead_outcomes()
        assert lead.id in won_at
        assert lead.id not in lost_at

    def test_lead_created_in_won_stage_without_history(self, make_lead, stages):
        lead = make_lead(stage="won")
        won_at, _ = get_lead_outcomes()
        assert lead.id in won_at
