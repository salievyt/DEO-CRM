"""Permissions for the deals module."""

from rest_framework.permissions import BasePermission

_EDIT_ROLES = ("superadmin", "owner", "project_manager", "marketer")
_DELETE_ROLES = ("superadmin", "owner", "project_manager")


def _is_staff(user):
    return user.is_authenticated and user.role is not None and user.role.name != "client"


class CanViewDeals(BasePermission):
    def has_permission(self, request, view):
        return _is_staff(request.user)


class CanCreateDeal(BasePermission):
    def has_permission(self, request, view):
        return _is_staff(request.user) and request.user.role.name in _EDIT_ROLES


class CanEditDeal(BasePermission):
    def has_permission(self, request, view):
        return _is_staff(request.user) and request.user.role.name in _EDIT_ROLES


class CanDeleteDeal(BasePermission):
    def has_permission(self, request, view):
        return _is_staff(request.user) and request.user.role.name in _DELETE_ROLES
