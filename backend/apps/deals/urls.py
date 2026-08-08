from django.urls import path

from . import views

urlpatterns = [
    path("", views.DealListCreateView.as_view(), name="deals-list"),
    path(
        "leads-available/",
        views.DealAvailableLeadsView.as_view(),
        name="deals-leads-available",
    ),
    path("<uuid:pk>/", views.DealDetailView.as_view(), name="deal-detail"),
    path("<uuid:pk>/status/", views.DealStatusView.as_view(), name="deal-status"),
    path(
        "<uuid:pk>/payments/",
        views.DealPaymentCreateView.as_view(),
        name="deal-payments",
    ),
    path(
        "<uuid:pk>/attach-document/",
        views.DealAttachDocumentView.as_view(),
        name="deal-attach-document",
    ),
]
