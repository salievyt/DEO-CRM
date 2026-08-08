"""Granular catalog permissions.

Role ladder used across the CRM:
superadmin / owner  — full access
project_manager    — edit, prices, inventory
marketer           — view + create/edit catalog content
developer/designer — view only
client             — no access
"""

from rest_framework.permissions import BasePermission

_EDIT_ROLES = ("superadmin", "owner", "project_manager", "marketer")
_MANAGE_ROLES = ("superadmin", "owner", "project_manager")


def _is_staff(user):
    return user.is_authenticated and user.role is not None and user.role.name != "client"


class CanViewCatalog(BasePermission):
    def has_permission(self, request, view):
        return _is_staff(request.user)


class CanCreateCatalogItem(BasePermission):
    def has_permission(self, request, view):
        return _is_staff(request.user) and request.user.role.name in _EDIT_ROLES


class CanEditCatalogItem(BasePermission):
    def has_permission(self, request, view):
        return _is_staff(request.user) and request.user.role.name in _EDIT_ROLES


class CanDeleteCatalogItem(BasePermission):
    def has_permission(self, request, view):
        return _is_staff(request.user) and request.user.role.name in _MANAGE_ROLES


class CanManagePrices(BasePermission):
    def has_permission(self, request, view):
        return _is_staff(request.user) and request.user.role.name in _MANAGE_ROLES


class CanManageInventory(BasePermission):
    def has_permission(self, request, view):
        return _is_staff(request.user) and request.user.role.name in _MANAGE_ROLES
