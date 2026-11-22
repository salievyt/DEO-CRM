from django.urls import path
from . import views

urlpatterns = [
    path("settings/", views.BootstrapView.as_view()),
    path("queue/", views.QueueView.as_view()),
    path("import/", views.ImportView.as_view()),
    path("contacts/<uuid:pk>/", views.ContactView.as_view()),
    path("contacts/<uuid:pk>/outcome/", views.OutcomeView.as_view()),
    path("recordings/", views.RecordingView.as_view()),
    path("recordings/<uuid:pk>/parts/<int:index>/", views.RecordingPartView.as_view()),
]
