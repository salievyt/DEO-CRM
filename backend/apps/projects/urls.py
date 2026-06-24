from django.urls import path

from . import views

urlpatterns = [
    path("", views.ProjectListCreateView.as_view(), name="project-list"),
    path("stats/", views.ProjectStatsView.as_view(), name="project-stats"),
    path("<uuid:pk>/", views.ProjectDetailView.as_view(), name="project-detail"),
    path(
        "<uuid:project_pk>/team/",
        views.ProjectTeamView.as_view(),
        name="project-team",
    ),
    path(
        "<uuid:project_pk>/team/<uuid:user_pk>/",
        views.ProjectTeamDeleteView.as_view(),
        name="project-team-delete",
    ),
    path("statuses/", views.ProjectStatusListView.as_view(), name="project-statuses"),
    path("service-types/", views.ServiceTypeListView.as_view(), name="service-types"),
]
