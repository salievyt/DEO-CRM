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
    path("payments/", views.PaymentListCreateView.as_view(), name="payment-list"),
    path("products/", views.ProductListCreateView.as_view(), name="product-list"),
    path("products/<uuid:pk>/", views.ProductDetailView.as_view(), name="product-detail"),
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
