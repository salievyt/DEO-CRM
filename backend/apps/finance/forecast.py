from datetime import timedelta
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from common.permissions import IsOwner
from apps.deals.models import Deal
from .control import balance
from .models import Invoice, PaymentMilestone


class CashFlowForecast(APIView):
    permission_classes = [IsAuthenticated, IsOwner]
    def get(self, request):
        today = timezone.localdate()
        plans = list(PaymentMilestone.objects.select_related("invoice").prefetch_related("invoice__payments"))
        invoices = list(Invoice.objects.exclude(status__in=["cancelled", "paid", "draft"]).prefetch_related("payments"))
        invoices.extend(plan.invoice for plan in plans if plan.invoice.status == "draft" and balance(plan.invoice))
        pipeline = list(Deal.objects.filter(status="open", expected_close_date__isnull=False).select_related("lead__current_stage"))
        overdue = sum((balance(i) for i in invoices if i.due_date < today), Decimal("0"))
        windows = {}
        for days in (7, 30, 90):
            end = today + timedelta(days=days)
            planned = sum((balance(i) for i in invoices if today <= i.due_date <= end), Decimal("0"))
            weighted = sum((d.total * Decimal(d.lead.current_stage.probability) / 100 for d in pipeline if today <= d.expected_close_date <= end), Decimal("0"))
            windows[str(days)] = {"end_date": end.isoformat(), "scheduled_invoices": planned,
                                  "weighted_open_deals": weighted, "expected": planned+weighted,
                                  "deals_count": sum(today <= d.expected_close_date <= end for d in pipeline)}
        return Response({"currency": getattr(settings, "CRM_BASE_CURRENCY", "KGS"), "as_of": today.isoformat(),
                         "overdue": overdue, "unforecasted_deals": sum(d.expected_close_date is None for d in Deal.objects.filter(status="open")),
                         "windows": windows})
