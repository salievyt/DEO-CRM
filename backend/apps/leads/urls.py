from django.urls import path

from . import views

urlpatterns = [
    path("", views.LeadListCreateView.as_view(), name="lead-list"),
    path("public/", views.PublicLeadCreateView.as_view(), name="lead-public-create"),
    path("kanban/", views.LeadKanbanView.as_view(), name="lead-kanban"),
    path("stats/", views.LeadStatsView.as_view(), name="lead-stats"),
    path("<uuid:pk>/", views.LeadDetailView.as_view(), name="lead-detail"),
    path("<uuid:pk>/move/", views.LeadMoveView.as_view(), name="lead-move"),
    path("stages/", views.LeadStageListView.as_view(), name="lead-stage-list"),
    path("stages/<uuid:pk>/", views.LeadStageDetailView.as_view(), name="lead-stage-detail"),
]
