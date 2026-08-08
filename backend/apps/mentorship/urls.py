from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"pairs", views.MentorshipPairViewSet, basename="mentorship-pair")
router.register(r"tasks", views.MenteeTaskViewSet, basename="mentee-task")
router.register(r"checklists", views.ChecklistViewSet, basename="checklist")
router.register(r"checklist-progress", views.MenteeChecklistProgressViewSet, basename="checklist-progress")
router.register(r"evaluations", views.MenteeEvaluationViewSet, basename="mentee-evaluation")

urlpatterns = [
    path("", include(router.urls)),
]
