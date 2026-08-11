from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views
from .profile_views import (
    EmployeeCertificateCreateView,
    EmployeeCertificateDeleteView,
    EmployeeProfileDetailView,
    EmployeeStatsView,
)

urlpatterns = [
    # Auth
    path("login/", TokenObtainPairView.as_view(), name="auth-login"),
    path("register/", views.RegisterView.as_view(), name="auth-register"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("me/", views.MeView.as_view(), name="auth-me"),
    path("change-password/", views.ChangePasswordView.as_view(), name="auth-change-password"),
    # 2FA
    path("2fa/enable/", views.Enable2FAView.as_view(), name="auth-2fa-enable"),
    path("2fa/verify/", views.Verify2FAView.as_view(), name="auth-2fa-verify"),
    path("2fa/disable/", views.Disable2FAView.as_view(), name="auth-2fa-disable"),
    # Users management
    path("users/", views.UserListView.as_view(), name="user-list"),
    path("users/invite/", views.UserInviteView.as_view(), name="user-invite"),
    path("users/<uuid:pk>/", views.UserDetailView.as_view(), name="user-detail"),
    path("users/<uuid:pk>/assign-role/", views.AssignRoleView.as_view(), name="user-assign-role"),
    # Employee profiles
    path("users/<uuid:user_id>/profile/", EmployeeProfileDetailView.as_view(), name="employee-profile-detail"),
    path("users/<uuid:user_id>/stats/", EmployeeStatsView.as_view(), name="employee-stats"),
    path("users/<uuid:user_id>/certificates/", EmployeeCertificateCreateView.as_view(), name="employee-certificate-create"),
    path("users/<uuid:user_id>/certificates/<uuid:pk>/", EmployeeCertificateDeleteView.as_view(), name="employee-certificate-delete"),
]
