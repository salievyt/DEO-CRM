from django.db.models import Count, Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from common.permissions import IsProjectManager

from .models import Team, TeamMembership
from .serializers import TeamMembershipSerializer, TeamSerializer


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.select_related("parent", "head").prefetch_related(
        "memberships__user__role", "children"
    ).all()
    serializer_class = TeamSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectManager]
    search_fields = ["name", "description"]
    ordering_fields = ["order", "name", "created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        team_type = self.request.query_params.get("type")
        parent_id = self.request.query_params.get("parent")
        if team_type:
            qs = qs.filter(team_type=team_type)
        if parent_id:
            qs = qs.filter(parent_id=parent_id)
        elif parent_id == "":
            qs = qs.filter(parent__isnull=True)
        return qs

    @action(detail=False, methods=["get"])
    def tree(self, request):
        """Return full org tree structure."""
        def build_tree(parent=None):
            teams = Team.objects.filter(parent=parent, is_active=True).select_related(
                "head"
            ).prefetch_related("memberships__user__role").order_by("order", "name")
            return [
                {
                    "id": t.id,
                    "name": t.name,
                    "team_type": t.team_type,
                    "color": t.color,
                    "description": t.description,
                    "head_name": t.head.get_full_name() or t.head.email if t.head else None,
                    "member_count": t.memberships.filter(is_active=True).count(),
                    "children": build_tree(t),
                }
                for t in teams
            ]

        tree = build_tree()
        return Response(tree)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Aggregate stats for dashboard."""
        total_teams = Team.objects.filter(is_active=True).count()
        total_members = TeamMembership.objects.filter(is_active=True).count()
        total_heads = Team.objects.filter(is_active=True, head__isnull=False).count()
        team_types = (
            Team.objects.filter(is_active=True)
            .values("team_type")
            .annotate(count=Count("id"))
        )
        return Response({
            "total_teams": total_teams,
            "total_members": total_members,
            "total_heads": total_heads,
            "by_type": {t["team_type"]: t["count"] for t in team_types},
        })


class TeamMembershipViewSet(viewsets.ModelViewSet):
    queryset = TeamMembership.objects.select_related("team", "user__role").all()
    serializer_class = TeamMembershipSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectManager]
    search_fields = ["user__email", "user__first_name", "user__last_name", "position"]
    ordering_fields = ["role", "joined_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        team_id = self.request.query_params.get("team")
        user_id = self.request.query_params.get("user")
        role = self.request.query_params.get("role")
        if team_id:
            qs = qs.filter(team_id=team_id)
        if user_id:
            qs = qs.filter(user_id=user_id)
        if role:
            qs = qs.filter(role=role)
        return qs
