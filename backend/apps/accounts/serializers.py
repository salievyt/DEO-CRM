from django.conf import settings
from django.core.mail import send_mail
from django.utils.crypto import get_random_string
from rest_framework import serializers

from .models import Role, User

# Roles that grant access to company-wide data (finance, analytics, HR surveys).
PRIVILEGED_ROLES = ("superadmin", "owner", "hr")
ROLE_GRANTERS = ("superadmin", "owner")


def _role_name(user):
    role = getattr(user, "role", None)
    return role.name if role is not None else None


def role_change_error(actor, role_name, target=None):
    """Why ``actor`` may not give ``role_name`` (to ``target``), or ``None`` if allowed.

    * owner, hr, superadmin: only superadmin and owner may grant;
    * superadmin: only another superadmin (owner is below superadmin, e.g.
      ``IsAdmin`` is superadmin-only, so an owner must not mint one);
    * a user who already has a privileged role can only be changed by
      superadmin/owner (a PM must not demote the owner), and a superadmin
      only by a superadmin;
    * nobody changes their own role.
    """
    actor_role = _role_name(actor)
    if target is not None and target.pk == actor.pk:
        return "Нельзя менять роль самому себе."
    if role_name in PRIVILEGED_ROLES and actor_role not in ROLE_GRANTERS:
        return "Назначать эту роль могут только владелец и суперадмин."
    if role_name == "superadmin" and actor_role != "superadmin":
        return "Роль суперадмина может назначить только суперадмин."
    if target is not None:
        target_role = _role_name(target)
        if target_role in PRIVILEGED_ROLES and actor_role not in ROLE_GRANTERS:
            return "Роль этого пользователя могут менять только владелец и суперадмин."
        if target_role == "superadmin" and actor_role != "superadmin":
            return "Роль суперадмина может изменить только суперадмин."
    return None


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    role_name = serializers.CharField(source="role.name", read_only=True, allow_null=True)

    class Meta:
        model = User
        fields = (
            "id", "email", "first_name", "last_name", "full_name",
            "phone", "avatar", "role_id", "role_name", "is_active", "date_joined",
            "is_2fa_enabled",
        )
        read_only_fields = ("id", "is_active", "date_joined", "is_2fa_enabled")

    def get_full_name(self, obj):
        return obj.get_full_name()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("email", "password", "first_name", "last_name", "phone")

    def create(self, validated_data):
        email = validated_data.pop("email")
        password = validated_data.pop("password")
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            **validated_data,
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class InviteUserSerializer(serializers.ModelSerializer):
    """Admin creates an employee account and receives temporary credentials."""

    # Roles an admin may invite. Superadmin and client are intentionally excluded.
    # owner and hr additionally require an owner/superadmin (see role_change_error).
    INVITABLE_ROLES = ("owner", "project_manager", "developer", "designer", "marketer", "hr")

    role_name = serializers.CharField(write_only=True)
    temporary_password = serializers.CharField(read_only=True)
    email_sent = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = (
            "email", "first_name", "last_name", "phone",
            "role_name", "temporary_password", "email_sent",
        )

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "Пользователь с таким email уже существует"
            )
        return value

    def validate_role_name(self, value):
        if value not in self.INVITABLE_ROLES:
            raise serializers.ValidationError("Недопустимая роль для приглашения")
        request = self.context.get("request")
        error = role_change_error(request.user, value) if request is not None else None
        if error:
            raise serializers.ValidationError(error)
        if not Role.objects.filter(name=value).exists():
            raise serializers.ValidationError("Роль не найдена")
        return value

    def create(self, validated_data):
        role_name = validated_data.pop("role_name")
        role = Role.objects.get(name=role_name)
        password = get_random_string(length=10)

        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=password,
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            phone=validated_data.get("phone", ""),
            role=role,
        )
        user.temporary_password = password
        user.email_sent = self._send_invite_email(user, password)
        return user

    def _send_invite_email(self, user, password):
        """Best-effort invite email. Returns False when SMTP is not configured."""
        if not settings.EMAIL_HOST_USER:
            return False
        send_mail(
            subject="Приглашение в DEO STUDIO CRM",
            message=(
                f"Здравствуйте, {user.get_full_name() or user.email}!\n\n"
                "Вас пригласили в команду DEO STUDIO CRM.\n"
                f"Email: {user.email}\n"
                f"Временный пароль: {password}\n\n"
                "Рекомендуем сменить пароль после первого входа."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
        return True
