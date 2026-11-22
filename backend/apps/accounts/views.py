from django.contrib.auth import authenticate, get_user_model
from django.core import signing
from django.db import transaction
from django.utils import timezone
from django_otp.plugins.otp_totp.models import TOTPDevice
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from common.permissions import IsProjectManager

from .serializers import (
    InviteUserSerializer,
    UserSerializer,
    profile_change_error,
    role_change_error,
)
from .two_factor import (
    build_setup_payload,
    clear_rate_limit,
    confirmed_device,
    generate_recovery_codes,
    is_rate_limited,
    issue_login_challenge,
    issue_tokens,
    load_login_challenge,
    pending_device,
    verify_second_factor,
)

User = get_user_model()


REGISTRATION_CLOSED = "Регистрация закрыта. Доступ выдаёт администратор по приглашению."


class RegisterView(APIView):
    """Public self-registration is closed.

    Self-registered accounts had no role and were treated as staff by
    endpoints that only checked authentication. Employees are created via
    ``users/invite/``; client accounts are linked by an administrator.
    """

    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()

    @extend_schema(request=None, responses={403: None})
    def post(self, request):
        return Response({"detail": REGISTRATION_CLOSED}, status=status.HTTP_403_FORBIDDEN)


class LoginView(APIView):
    """Authenticate a password, then require a second factor when enabled."""

    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
        identifier = f"{request.META.get('REMOTE_ADDR', 'unknown')}:{email}"
        if is_rate_limited("login", identifier, limit=10):
            return Response(
                {"detail": "Слишком много попыток. Попробуйте позже."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        user = authenticate(request=request, email=email, password=password)
        if user is None or not user.is_active:
            return Response(
                {"detail": "Неверный email или пароль"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        clear_rate_limit("login", identifier)
        if user.is_2fa_enabled and confirmed_device(user):
            return Response(
                {
                    "requires_2fa": True,
                    "challenge": issue_login_challenge(user),
                    "expires_in": 300,
                }
            )
        return Response(issue_tokens(user))


class Login2FAView(APIView):
    """Complete a login challenge with TOTP or a recovery code."""

    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()

    def post(self, request):
        challenge = request.data.get("challenge") or ""
        code = request.data.get("code") or ""
        try:
            payload = load_login_challenge(challenge)
            user = User.objects.get(pk=payload["user_id"], is_active=True)
        except (signing.BadSignature, signing.SignatureExpired, User.DoesNotExist, KeyError):
            return Response(
                {"detail": "Проверка истекла. Войдите ещё раз."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        identifier = f"{request.META.get('REMOTE_ADDR', 'unknown')}:{user.pk}"
        if is_rate_limited("login-2fa", identifier):
            return Response(
                {"detail": "Слишком много попыток. Попробуйте позже."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        if not verify_second_factor(user, code):
            return Response(
                {"detail": "Неверный код подтверждения"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        clear_rate_limit("login-2fa", identifier)
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])
        return Response(issue_tokens(user))


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


class UserInviteView(generics.CreateAPIView):
    """Invite a new employee (superadmin/owner/PM). Creates the account and returns temporary credentials."""

    queryset = User.objects.all()
    serializer_class = InviteUserSerializer
    permission_classes = (IsProjectManager,)


class UserListView(generics.ListAPIView):
    """List all users (superadmin/owner/PM)."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = (IsProjectManager,)
    search_fields = ("email", "first_name", "last_name", "phone")
    ordering_fields = ("email", "date_joined", "last_login")


class UserDetailView(generics.RetrieveUpdateAPIView):
    """User details (superadmin/owner/PM).

    Editing follows the role hierarchy (``profile_change_error``): owner/hr/
    superadmin profiles only by owner/superadmin, superadmin only by superadmin.
    """
    queryset = User.objects.select_related("role")
    serializer_class = UserSerializer
    permission_classes = (IsProjectManager,)

    def perform_update(self, serializer):
        error = profile_change_error(self.request.user, serializer.instance)
        if error:
            raise PermissionDenied(error)
        serializer.save()


class AssignRoleView(APIView):
    """Assign role to user (superadmin/owner/PM).

    owner/hr/superadmin are granted only by owner or superadmin (superadmin
    only by superadmin); own role cannot be changed. See ``role_change_error``.
    """
    permission_classes = (IsProjectManager,)

    def post(self, request, pk):
        from .models import Role

        role_name = request.data.get("role") if hasattr(request.data, "get") else None
        if not isinstance(role_name, str) or not role_name:
            return Response(
                {"error": "Поле role должно быть строкой."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            # Lock the target so the hierarchy check and the write see the same role.
            try:
                user = (
                    User.objects.select_for_update(of=("self",)).select_related("role").get(pk=pk)
                )
                role = Role.objects.get(name=role_name)
            except (User.DoesNotExist, Role.DoesNotExist):
                return Response({"error": "Пользователь или роль не найдены"}, status=404)
            if user.pk == request.user.pk:
                return Response(
                    {"error": "Нельзя менять роль самому себе."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            error = role_change_error(request.user, role.name, target=user)
            if error:
                return Response({"error": error}, status=status.HTTP_403_FORBIDDEN)
            user.role = role
            user.save(update_fields=["role"])
        return Response(UserSerializer(user).data)


class Enable2FAView(APIView):
    """Start TOTP setup and return a QR code for an authenticator app."""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        if request.user.is_2fa_enabled:
            return Response(
                {"detail": "2FA уже включена"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(build_setup_payload(request.user, pending_device(request.user)))


class Verify2FAView(APIView):
    """Confirm a pending TOTP setup and issue recovery codes once."""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        code = str(request.data.get("code") or "").strip()
        device = TOTPDevice.objects.filter(
            user=request.user, confirmed=False
        ).order_by("-id").first()
        if device is None:
            return Response(
                {"detail": "Сначала начните настройку 2FA"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if is_rate_limited("setup", request.user.pk):
            return Response(
                {"detail": "Слишком много попыток. Попробуйте позже."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        if not device.verify_token(code):
            return Response(
                {"detail": "Неверный код подтверждения"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        TOTPDevice.objects.filter(user=request.user, confirmed=True).delete()
        device.confirmed = True
        device.save(update_fields=["confirmed"])
        request.user.is_2fa_enabled = True
        request.user.two_factor_secret = ""
        request.user.save(update_fields=["is_2fa_enabled", "two_factor_secret"])
        clear_rate_limit("setup", request.user.pk)
        return Response(
            {
                "detail": "2FA включена",
                "recovery_codes": generate_recovery_codes(request.user),
            }
        )


class TwoFactorStatusView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        return Response(
            {
                "enabled": bool(request.user.is_2fa_enabled and confirmed_device(request.user)),
                "recovery_codes_remaining": request.user.recovery_codes.filter(
                    used_at__isnull=True
                ).count(),
            }
        )


class RegenerateRecoveryCodesView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        if not request.user.check_password(request.data.get("password") or ""):
            return Response(
                {"detail": "Неверный пароль"}, status=status.HTTP_400_BAD_REQUEST
            )
        if not verify_second_factor(request.user, request.data.get("code")):
            return Response(
                {"detail": "Неверный код подтверждения"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"recovery_codes": generate_recovery_codes(request.user)})


class Disable2FAView(APIView):
    """Disable two-factor authentication."""
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user
        if not user.is_2fa_enabled:
            return Response({"detail": "2FA уже отключена"})
        if not user.check_password(request.data.get("password") or ""):
            return Response(
                {"detail": "Неверный пароль"}, status=status.HTTP_400_BAD_REQUEST
            )
        if not verify_second_factor(user, request.data.get("code")):
            return Response(
                {"detail": "Неверный код подтверждения"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_2fa_enabled = False
        user.two_factor_secret = ""
        user.save(update_fields=["is_2fa_enabled", "two_factor_secret"])
        TOTPDevice.objects.filter(user=user).delete()
        user.recovery_codes.all().delete()
        return Response({"detail": "2FA отключен"})
