from django.urls import path

from . import views

urlpatterns = [
    path("invoices/", views.InvoiceListCreateView.as_view(), name="invoice-list"),
    path("invoices/<uuid:pk>/", views.InvoiceDetailView.as_view(), name="invoice-detail"),
    path(
        "invoices/<uuid:pk>/mark-paid/",
        views.InvoiceMarkPaidView.as_view(),
        name="invoice-mark-paid",
    ),
    path("payments/", views.PaymentCreateView.as_view(), name="payment-create"),
    path("expenses/", views.ExpenseListCreateView.as_view(), name="expense-list"),
    path(
        "expense-categories/",
        views.ExpenseCategoryListView.as_view(),
        name="expense-categories",
    ),
    path("salaries/", views.SalaryListCreateView.as_view(), name="salary-list"),
    path("reports/summary/", views.FinancialSummaryView.as_view(), name="finance-summary"),
    path(
        "reports/profit-by-project/",
        views.ProfitByProjectView.as_view(),
        name="finance-profit-project",
    ),
]
