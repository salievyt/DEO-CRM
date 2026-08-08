from django.urls import path

from . import views

urlpatterns = [
    path("", views.ClientListCreateView.as_view(), name="client-list"),
    path("stats/", views.ClientStatsView.as_view(), name="client-stats"),
    path("statuses/", views.ClientStatusListView.as_view(), name="client-status-list"),
    path("statuses/<int:pk>/", views.ClientStatusDetailView.as_view(), name="client-status-detail"),
    path(
        "<uuid:client_pk>/360/",
        views.ClientOverviewView.as_view(),
        name="client-overview",
    ),
    path(
        "<uuid:client_pk>/activity/",
        views.ClientActivityView.as_view(),
        name="client-activity",
    ),
    path(
        "<uuid:client_pk>/purchases/",
        views.ClientPurchaseListView.as_view(),
        name="client-purchases",
    ),
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
