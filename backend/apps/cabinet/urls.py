from django.urls import path

from . import views

urlpatterns = [
    path("dashboard/", views.CabinetDashboardView.as_view(), name="cabinet-dashboard"),
    path("projects/", views.CabinetProjectsView.as_view(), name="cabinet-projects"),
    path(
        "projects/<uuid:pk>/",
        views.CabinetProjectDetailView.as_view(),
        name="cabinet-project-detail",
    ),
    path(
        "projects/<uuid:pk>/milestones/<uuid:milestone_pk>/approve/",
        views.CabinetMilestoneApproveView.as_view(),
        name="cabinet-milestone-approve",
    ),
    path(
        "projects/<uuid:pk>/milestones/<uuid:milestone_pk>/reject/",
        views.CabinetMilestoneRejectView.as_view(),
        name="cabinet-milestone-reject",
    ),
    path(
        "projects/<uuid:pk>/feedback/",
        views.CabinetFeedbackCreateView.as_view(),
        name="cabinet-feedback",
    ),
    path(
        "projects/<uuid:pk>/share-link/",
        views.CabinetShareLinkView.as_view(),
        name="cabinet-share-link",
    ),
    path(
        "shared/<str:token>/",
        views.CabinetSharedProjectView.as_view(),
        name="cabinet-shared-project",
    ),
    path("documents/", views.CabinetDocumentsView.as_view(), name="cabinet-documents"),
    path("invoices/", views.CabinetInvoicesView.as_view(), name="cabinet-invoices"),
    path("payments/", views.CabinetPaymentsView.as_view(), name="cabinet-payments"),
    path("messages/", views.CabinetMessagesView.as_view(), name="cabinet-messages"),
]
