from django.urls import path
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register("sections", views.SurveySectionViewSet, basename="survey-section")
router.register("questions", views.QuestionViewSet, basename="survey-question")
router.register("", views.SurveyViewSet, basename="survey")

urlpatterns = [
    path("public/<uuid:token>/", views.PublicSurveyView.as_view(), name="survey-public"),
    *router.urls,
]
