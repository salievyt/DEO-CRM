from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"teams", views.TeamViewSet, basename="team")
router.register(r"memberships", views.TeamMembershipViewSet, basename="team-membership")

urlpatterns = [
    path("", include(router.urls)),
]
