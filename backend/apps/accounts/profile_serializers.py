from rest_framework import serializers

from .models import User
from .profile_models import EmployeeCertificate, EmployeeProfile


class EmployeeCertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeCertificate
        fields = "__all__"
        read_only_fields = ["profile"]


class EmployeeProfileSerializer(serializers.ModelSerializer):
    certificates = EmployeeCertificateSerializer(many=True, read_only=True)
    user_email = serializers.SerializerMethodField()
    user_full_name = serializers.SerializerMethodField()
    user_first_name = serializers.SerializerMethodField()
    user_last_name = serializers.SerializerMethodField()
    user_phone = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    user_is_active = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()
    user_date_joined = serializers.SerializerMethodField()
    teams = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeProfile
        fields = "__all__"

    def get_user_email(self, obj):
        return obj.user.email

    def get_user_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.email

    def get_user_first_name(self, obj):
        return obj.user.first_name

    def get_user_last_name(self, obj):
        return obj.user.last_name

    def get_user_phone(self, obj):
        return obj.user.phone

    def get_user_role(self, obj):
        if obj.user.role:
            return {
                "id": obj.user.role.id,
                "name": obj.user.role.name,
            }
        return None

    def get_user_is_active(self, obj):
        return obj.user.is_active

    def get_user_avatar(self, obj):
        return obj.user.avatar

    def get_user_date_joined(self, obj):
        return obj.user.date_joined

    def get_teams(self, obj):
        memberships = obj.user.team_memberships.select_related(
            "team"
        ).filter(is_active=True)
        return [
            {
                "id": m.team_id,
                "name": m.team.name,
                "team_type": m.team.team_type,
                "role": m.role,
                "position": m.position,
                "color": m.team.color,
            }
            for m in memberships
        ]
