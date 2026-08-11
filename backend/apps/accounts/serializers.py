from django.conf import settings
from django.core.mail import send_mail
from django.utils.crypto import get_random_string
from rest_framework import serializers

from .models import Role, User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    role_name = serializers.CharField(source="role.name", read_only=True, allow_null=True)

    class Meta:
        model = User
        fields = (
            "id", "email", "first_name", "last_name", "full_name",
            "phone", "avatar", "role_id", "role_name", "is_active", "date_joined",
        )
        read_only_fields = ("id", "is_active", "date_joined")

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
    INVITABLE_ROLES = ("owner", "project_manager", "developer", "designer", "marketer")

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
