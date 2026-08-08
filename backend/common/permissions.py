from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Superadmin only."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role is not None
            and request.user.role.name == "superadmin"
        )


class IsOwner(BasePermission):
    """Company owner."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role is not None
            and request.user.role.name in ("superadmin", "owner")
        )


class IsProjectManager(BasePermission):
    """PM and above."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role is not None
            and request.user.role.name in (
                "superadmin", "owner", "project_manager"
            )
        )


class IsClient(BasePermission):
    """Client role only."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role is not None
            and request.user.role.name == "client"
        )


class IsStaff(BasePermission):
    """Any staff member (not client)."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role is not None
            and request.user.role.name != "client"
        )


class IsAnalyticsAdmin(BasePermission):
    """Company-wide analytics: superadmin and owner only."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role is not None
            and request.user.role.name in ("superadmin", "owner")
        )


class IsAnalyticsViewer(BasePermission):
    """Any staff member may view analytics, but only their own data.

    Non-admins are automatically scoped to their own records by the views.
    """

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role is not None
            and request.user.role.name != "client"
        )


class IsOwnerOrAdmin(BasePermission):
    """Object-level permission: only owner or admin can edit."""

    def has_object_permission(self, request, view, obj):
        return (
            request.user.role is not None
            and request.user.role.name in ("superadmin", "owner")
        ) or obj.created_by == request.user
