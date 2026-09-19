from django.urls import path

from . import views

urlpatterns = [
    path("", views.FormTemplateListCreateView.as_view(), name="form-template-list"),
    path(
        "templates/<uuid:pk>/",
        views.FormTemplateDetailView.as_view(),
        name="form-template-detail",
    ),
    path(
        "invitations/",
        views.InvitationListCreateView.as_view(),
        name="form-invitation-list",
    ),
    path(
        "invitations/<uuid:pk>/",
        views.InvitationDetailView.as_view(),
        name="form-invitation-detail",
    ),
    path(
        "i/<uuid:token>/",
        views.PublicFormView.as_view(),
        name="form-public",
    ),
]