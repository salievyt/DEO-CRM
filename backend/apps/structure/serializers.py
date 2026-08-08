from rest_framework import serializers

from .models import Team, TeamMembership


class TeamMembershipSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()

    class Meta:
        model = TeamMembership
        fields = "__all__"

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.email

    def get_user_email(self, obj):
        return obj.user.email

    def get_user_role(self, obj):
        if obj.user.role:
            return obj.user.role.name
        return None


class TeamSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    children_count = serializers.SerializerMethodField()
    parent_name = serializers.SerializerMethodField()
    head_name = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = "__all__"

    def get_members(self, obj):
        memberships = obj.memberships.select_related("user__role").filter(is_active=True)
        return TeamMembershipSerializer(memberships, many=True).data

    def get_member_count(self, obj):
        return obj.memberships.filter(is_active=True).count()

    def get_children_count(self, obj):
        return obj.children.filter(is_active=True).count()

    def get_parent_name(self, obj):
        return obj.parent.name if obj.parent else None

    def get_head_name(self, obj):
        if obj.head:
            return obj.head.get_full_name() or obj.head.email
        return None


class TeamTreeNodeSerializer(serializers.Serializer):
    """Lightweight tree node for org chart."""
    id = serializers.UUIDField()
    name = serializers.CharField()
    team_type = serializers.CharField()
    color = serializers.CharField()
    head_name = serializers.SerializerMethodField()
    member_count = serializers.IntegerField()
    children = serializers.ListField(child=serializers.DictField(), default=[])

    def get_head_name(self, obj):
        if obj.get("head"):
            return obj["head"].get_full_name() or obj["head"].email
        return None
