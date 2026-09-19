from django.urls import path

from . import views

urlpatterns = [
    path("", views.DocumentListCreateView.as_view(), name="document-list"),
    path("<uuid:pk>/", views.DocumentDetailView.as_view(), name="document-detail"),
    path(
        "<uuid:pk>/download/",
        views.DocumentDownloadView.as_view(),
        name="document-download",
    ),
    path(
        "<uuid:pk>/versions/",
        views.DocumentVersionListCreateView.as_view(),
        name="document-versions",
    ),
    path(
        "<uuid:pk>/comments/",
        views.DocumentCommentListCreateView.as_view(),
        name="document-comments",
    ),
    path("<uuid:pk>/activity/", views.DocumentActivityListView.as_view(), name="document-activity"),
    path("types/", views.DocumentTypeListView.as_view(), name="document-types"),
    path(
        "templates/",
        views.DocumentTemplateListView.as_view(),
        name="document-templates",
    ),
]
