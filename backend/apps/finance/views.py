from datetime import datetime, timedelta

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import generics, status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.permissions import IsAdmin, IsOwner

from .models import (
    Expense, ExpenseCategory, Income, Invoice, Payment, Product, Salary
)
from .serializers import (
    ExpenseCategorySerializer,
    ExpenseSerializer,
    IncomeSerializer,
    InvoiceCreateSerializer,
    InvoiceDetailSerializer,
    InvoiceListSerializer,
    PaymentSerializer,
    ProductSerializer,
    SalarySerializer,
)


class ProductListCreateView(generics.ListCreateAPIView):
    """List or create catalog products."""
    permission_classes = [IsAuthenticated]
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filterset_fields = ["is_active"]
    search_fields = ["name"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a catalog product."""
    permission_classes = [IsAuthenticated]
    queryset = Product.objects.all()
    serializer_class = ProductSerializer


class InvoiceListCreateView(generics.ListCreateAPIView):
    """List or create invoices."""
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return InvoiceCreateSerializer
        return InvoiceListSerializer

    def get_queryset(self):
        qs = Invoice.objects.select_related("client", "project").all()
        project = self.request.query_params.get("project")
        client = self.request.query_params.get("client")
        if project:
            qs = qs.filter(project_id=project)
        if client:
            qs = qs.filter(client_id=client)
        return qs


class InvoiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete an invoice."""
    permission_classes = [IsAuthenticated]
    queryset = Invoice.objects.prefetch_related("items", "payments").all()
    serializer_class = InvoiceDetailSerializer


class InvoiceMarkPaidView(views.APIView):
    """Mark invoice as paid."""
    permission_classes = [IsAuthenticated, IsOwner]

    def post(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk)
        except Invoice.DoesNotExist:
            return Response({"error": "Счет не найден"}, status=404)

        invoice.status = "paid"
        invoice.paid_at = timezone.now()
        invoice.paid_amount = invoice.amount
        invoice.save()
        return Response(InvoiceDetailSerializer(invoice).data)


class PaymentListCreateView(generics.ListCreateAPIView):
    """List or register payments."""
    permission_classes = [IsAuthenticated, IsOwner]
    serializer_class = PaymentSerializer
    filterset_fields = ["method"]

    def get_queryset(self):
        qs = Payment.objects.select_related("invoice").all()
        client = self.request.query_params.get("client")
        invoice = self.request.query_params.get("invoice")
        if client:
            qs = qs.filter(invoice__client_id=client)
        if invoice:
            qs = qs.filter(invoice_id=invoice)
        return qs

    def perform_create(self, serializer):
        payment = serializer.save()
        # Update invoice paid amount
        invoice = payment.invoice
        total_paid = Payment.objects.filter(invoice=invoice).aggregate(
            total=Sum("amount")
        )["total"] or 0
        invoice.paid_amount = total_paid
        if total_paid >= invoice.amount:
            invoice.status = "paid"
            invoice.paid_at = timezone.now()
        invoice.save()


class IncomeListCreateView(generics.ListCreateAPIView):
    """List or create manual income records."""
    permission_classes = [IsAuthenticated, IsOwner]
    serializer_class = IncomeSerializer
    filterset_fields = ["method"]

    def get_queryset(self):
        qs = Income.objects.select_related("client", "project").all()
        project = self.request.query_params.get("project")
        client = self.request.query_params.get("client")
        if project:
            qs = qs.filter(project_id=project)
        if client:
            qs = qs.filter(client_id=client)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ExpenseListCreateView(generics.ListCreateAPIView):
    """List or create expenses."""
    permission_classes = [IsAuthenticated, IsOwner]
    serializer_class = ExpenseSerializer
    filterset_fields = ["category"]

    def get_queryset(self):
        qs = Expense.objects.select_related("category").all()
        project = self.request.query_params.get("project")
        if project:
            qs = qs.filter(project_id=project)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ExpenseCategoryListView(generics.ListCreateAPIView):
    """List or create expense categories."""
    permission_classes = [IsAuthenticated]
    queryset = ExpenseCategory.objects.all().order_by("name")
    serializer_class = ExpenseCategorySerializer


class SalaryListCreateView(generics.ListCreateAPIView):
    """List or create salaries."""
    permission_classes = [IsAuthenticated, IsOwner]
    serializer_class = SalarySerializer

    def get_queryset(self):
        qs = Salary.objects.select_related("user").all()
        month = self.request.query_params.get("month")
        year = self.request.query_params.get("year")
        if month:
            qs = qs.filter(month=month)
        if year:
            qs = qs.filter(year=year)
        return qs

    def perform_create(self, serializer):
        serializer.save(paid_by=self.request.user)


class FinancialSummaryView(views.APIView):
    """Financial summary for dashboard."""
    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request):
        now = timezone.now()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0)

        # Revenue (paid invoices this month)
        revenue = Invoice.objects.filter(
            status="paid", paid_at__gte=start_of_month
        ).aggregate(total=Sum("amount"))["total"] or 0

        # Manual income this month
        income = Income.objects.filter(
            income_date__gte=start_of_month.date()
        ).aggregate(total=Sum("amount"))["total"] or 0

        # Expenses this month
        expenses = Expense.objects.filter(
            expense_date__gte=start_of_month.date()
        ).aggregate(total=Sum("amount"))["total"] or 0

        # Salaries this month
        salaries = Salary.objects.filter(
            month=now.month, year=now.year
        ).aggregate(total=Sum("amount"))["total"] or 0

        # Outstanding invoices
        outstanding = Invoice.objects.filter(
            status__in=["sent", "overdue"]
        ).aggregate(total=Sum("amount"))["total"] or 0

        total_income = revenue + income
        return Response({
            "revenue": revenue,
            "income": income,
            "total_income": total_income,
            "expenses": expenses + salaries,
            "profit": total_income - expenses - salaries,
            "outstanding": outstanding,
            "month": now.month,
            "year": now.year,
        })


class ProfitByProjectView(views.APIView):
    """Profit breakdown by project."""
    permission_classes = [IsAuthenticated, IsOwner]

    def get(self, request):
        from apps.projects.models import Project
        projects = Project.objects.annotate(
            revenue=Sum("invoices__amount", filter=Q(invoices__status="paid")),
            income_total=Sum("incomes__amount"),
            expense_total=Sum("expenses__amount"),
        )
        data = []
        for p in projects:
            # Revenue = paid invoices + manual income linked to the project.
            rev = (p.revenue or 0) + (p.income_total or 0)
            exp = p.expense_total or 0
            data.append({
                "id": str(p.id),
                "name": p.name,
                "revenue": rev,
                "expenses": exp,
                "profit": rev - exp,
            })
        return Response(data)
