from django.urls import path

from . import views

urlpatterns = [
    path("", views.ScenarioListCreateView.as_view(), name="scenario-list"),
    path("templates/", views.ScenarioTemplateListView.as_view(), name="scenario-templates"),
    path("triggers/", views.ScenarioTriggerListView.as_view(), name="scenario-triggers"),
    path("stats/", views.ScenarioStatsView.as_view(), name="scenario-stats"),
    path("top/", views.ScenarioTopView.as_view(), name="scenario-top"),
    path("<uuid:pk>/", views.ScenarioDetailView.as_view(), name="scenario-detail"),
    path("<uuid:pk>/test/", views.ScenarioTestView.as_view(), name="scenario-test"),
]
