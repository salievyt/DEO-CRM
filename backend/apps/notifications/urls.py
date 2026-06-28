from django.urls import path

from . import views

urlpatterns = [
    path("", views.NotificationListView.as_view(), name="notification-list"),
    path("mark-all-read/", views.MarkAllReadView.as_view(), name="notification-mark-all-read"),
    path("unread-count/", views.UnreadCountView.as_view(), name="notification-unread-count"),
    path("preferences/", views.NotificationPreferencesView.as_view(), name="notification-preferences"),
    path("archive/", views.ArchiveNotificationsView.as_view(), name="notification-archive"),
    path("archive-all/", views.MarkAsArchivedView.as_view(), name="notification-archive-all"),
    path("<uuid:pk>/archive/", views.MarkAsArchivedView.as_view(), name="notification-archive-one"),
]
