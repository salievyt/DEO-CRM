"""Cash-based management reporting in the installation's base currency."""
from decimal import Decimal
from django.conf import settings
from django.db.models import Sum
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from common.permissions import IsOwner
from apps.projects.models import Project
from apps.deals.models import DealPayment
from apps.partners.models import PartnerPayout
from .models import Invoice, Income, Expense, Salary

ZERO = Decimal("0")


def total(qs, field="amount"):
    return qs.aggregate(value=Sum(field))["value"] or ZERO


def received(invoice):
    # Legacy "mark paid" records may lack Payment rows. Never count both.
    return max(invoice.paid_amount, sum((p.amount for p in invoice.payments.all()), ZERO), invoice.amount if invoice.status == "paid" else ZERO)


def balance(invoice):
    return max(invoice.amount - received(invoice), ZERO) if invoice.status != "cancelled" else ZERO


def project_finance(project):
    revenue = sum((received(i) for i in project.invoices.exclude(status="cancelled").prefetch_related("payments")), ZERO)
    revenue += total(Income.objects.filter(project=project, income_date__lte=timezone.localdate()))
    revenue += total(DealPayment.objects.filter(deal__project=project))
    expenses = total(Expense.objects.filter(project=project, expense_date__lte=timezone.localdate()))
    profit = revenue - expenses
    return {"id": str(project.pk), "name": project.name, "revenue": revenue, "expenses": expenses, "profit": profit,
            "margin": (profit / revenue * 100).quantize(Decimal("0.01")) if revenue else None}


class FinancialControl(APIView):
    permission_classes = [IsOwner]
    def get(self, request):
        today = timezone.localdate()
        invoices = list(Invoice.objects.exclude(status="cancelled").prefetch_related("payments"))
        revenue = sum((received(i) for i in invoices), ZERO) + total(Income.objects.filter(income_date__lte=today)) + total(DealPayment.objects.all())
        expenses = total(Expense.objects.filter(expense_date__lte=today))
        salaries = total(Salary.objects.filter(paid_at__lte=today))
        partner_payouts = total(PartnerPayout.objects.all())
        return Response({"currency": getattr(settings, "CRM_BASE_CURRENCY", "KGS"), "basis": "cash", "revenue": revenue,
                         "expenses": expenses, "salaries": salaries, "partner_payouts": partner_payouts,
                         "profit": revenue-expenses-salaries-partner_payouts,
                         "receivables": sum((balance(i) for i in invoices if i.status != "paid" and (i.status != "draft" or hasattr(i, "payment_milestone"))), ZERO),
                         "projects": [project_finance(p) for p in Project.objects.all()]})
