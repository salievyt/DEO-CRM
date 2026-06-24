from django.urls import path

from . import views

urlpatterns = [
    path("", views.ClientListCreateView.as_view(), name="client-list"),
    path("stats/", views.ClientStatsView.as_view(), name="client-stats"),
    path("<uuid:pk>/", views.ClientDetailView.as_view(), name="client-detail"),
    path(
        "<uuid:client_pk>/interactions/",
        views.ClientInteractionListView.as_view(),
        name="client-interactions",
    ),
    path(
        "<uuid:client_pk>/tags/",
        views.ClientAssignTagsView.as_view(),
        name="client-tags",
    ),
    path(
        "<uuid:client_pk>/tags/<uuid:tag_pk>/",
        views.ClientAssignTagsView.as_view(),
        name="client-tag-delete",
    ),
    path("tags/", views.ClientTagListView.as_view(), name="client-tag-list"),
    path("tags/<uuid:pk>/", views.ClientTagDeleteView.as_view(), name="client-tag-delete"),
]
