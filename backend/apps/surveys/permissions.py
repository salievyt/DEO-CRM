"""Survey permissions.

Managing surveys and reading results is limited to the company admin,
the owner (CEO) and HR. Other staff and clients have no access; respondents
use the public token endpoints, which need no account.
"""

from rest_framework.permissions import BasePermission

SURVEY_MANAGER_ROLES = ("superadmin", "owner", "hr")


def can_manage_surveys(user):
    return bool(
        user
        and user.is_authenticated
        and user.role is not None
        and user.role.name in SURVEY_MANAGER_ROLES
    )


class CanManageSurveys(BasePermission):
    """Create/edit surveys, view responses and export them."""

    message = "Доступ к опросам есть у администратора, владельца и HR."

    def has_permission(self, request, view):
        return can_manage_surveys(request.user)
