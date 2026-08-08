from django.urls import path

from . import views

urlpatterns = [
    path("", views.ReminderListView.as_view(), name="reminder-list"),
    path("summary/", views.ReminderSummaryView.as_view(), name="reminder-summary"),
    path("logs/", views.ReminderLogListView.as_view(), name="reminder-logs"),
    path("rules/", views.ReminderRuleListCreateView.as_view(), name="reminder-rule-list"),
    path("rules/<uuid:pk>/", views.ReminderRuleRetrieveUpdateDestroyView.as_view(), name="reminder-rule-detail"),
    path("<uuid:pk>/view/", views.ReminderMarkViewedView.as_view(), name="reminder-view"),
    path("<uuid:pk>/complete/", views.ReminderCompleteView.as_view(), name="reminder-complete"),
    path("<uuid:pk>/dismiss/", views.ReminderDismissView.as_view(), name="reminder-dismiss"),
    path("<uuid:pk>/snooze/", views.ReminderSnoozeView.as_view(), name="reminder-snooze"),
]
