from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from common.permissions import IsAdmin

from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """User registration."""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)


class MeView(generics.RetrieveUpdateAPIView):
    """Get/update current user profile."""
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user


class LogoutView(APIView):
    """Blacklist refresh token."""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """Change user password."""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")

        if not user.check_password(old_password):
            return Response(
                {"error": "Неверный текущий пароль"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(new_password)
        user.save()
        return Response({"detail": "Пароль успешно изменен"})


class UserListView(generics.ListAPIView):
    """List all users (admin/manager)."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = (IsAdmin,)
    search_fields = ("email", "first_name", "last_name", "phone")
    ordering_fields = ("email", "date_joined", "last_login")


class UserDetailView(generics.RetrieveUpdateAPIView):
    """User details (admin only)."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = (IsAdmin,)


class AssignRoleView(APIView):
    """Assign role to user (admin only)."""
    permission_classes = (IsAdmin,)

    def post(self, request, pk):
        from .models import Role
        try:
            user = User.objects.get(pk=pk)
            role = Role.objects.get(name=request.data.get("role"))
            user.role = role
            user.save()
            return Response(UserSerializer(user).data)
        except (User.DoesNotExist, Role.DoesNotExist):
            return Response({"error": "Пользователь или роль не найдены"}, status=404)


class Enable2FAView(APIView):
    """Enable two-factor authentication."""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        # TODO: Generate TOTP secret and return QR code URL
        return Response({"detail": "2FA включен"})


class Verify2FAView(APIView):
    """Verify 2FA code."""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        # TODO: Verify TOTP code
        return Response({"detail": "2FA подтвержден"})


class Disable2FAView(APIView):
    """Disable two-factor authentication."""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user
        user.is_2fa_enabled = False
        user.two_factor_secret = ""
        user.save()
        return Response({"detail": "2FA отключен"})
