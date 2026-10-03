from django.urls import path
from . import views

urlpatterns = [
    path("state/", views.FocusStateView.as_view(), name="focus-state"),
    path("timer/stop/", views.FocusTimerStopView.as_view(), name="focus-timer-stop"),
    path("start/", views.FocusStartView.as_view(), name="focus-start"),
    path("sessions/", views.FocusHistoryView.as_view(), name="focus-history"),
    *[
        path(
            "sessions/<uuid:pk>/" + action + "/",
            views.FocusActionView.as_view(),
            {"action": action},
            name="focus-" + action,
        )
        for action in ["pause", "resume", "finish", "cancel", "result"]
    ],
    path("settings/", views.FocusProfileView.as_view(), name="focus-settings"),
    path("stats/", views.FocusStatsView.as_view(), name="focus-stats"),
    path("notes/", views.FocusNotesView.as_view(), name="focus-notes"),
    path("notes/<uuid:pk>/", views.FocusNoteDetailView.as_view(), name="focus-note-detail"),
    path("shop/", views.FocusShopView.as_view(), name="focus-shop"),
]
