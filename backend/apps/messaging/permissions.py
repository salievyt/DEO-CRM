from rest_framework.permissions import BasePermission

# Roles that may use the client-facing inbox.
INBOX_ROLES = {"superadmin", "owner", "project_manager", "marketer"}


def has_inbox_role(user) -> bool:
    return (
        user.is_authenticated
        and user.role is not None
        and user.role.name in INBOX_ROLES
    )


class IsInboxStaff(BasePermission):
    """Superadmin / owner / PM / marketer — everyone who works with clients."""

    def has_permission(self, request, view):
        return has_inbox_role(request.user)
