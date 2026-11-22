"""Role helpers and querysets of projects/tasks a user may access.

``user.role`` is a ``Role`` object or ``None``. A user without a role is
*untrusted*: they are neither staff nor a client and get nothing.
"""


def role_name(user):
    if user is None or not getattr(user, "is_authenticated", False):
        return None
    role = getattr(user, "role", None)
    return role.name if role is not None else None


def is_client(user):
    return role_name(user) == "client"


def is_staff_member(user):
    """Has a role and that role is not ``client``."""
    name = role_name(user)
    return name is not None and name != "client"


def scope_projects(user, queryset=None):
    """Projects visible to ``user``: all for staff, own for clients, none otherwise."""
    if queryset is None:
        from apps.projects.models import Project

        queryset = Project.objects.all()
    if is_staff_member(user):
        return queryset
    if is_client(user):
        return queryset.filter(client__user=user)
    return queryset.none()


def scope_tasks(user, queryset=None):
    """Tasks visible to ``user``: all for staff, own projects' for clients, none otherwise."""
    if queryset is None:
        from apps.tasks.models import Task

        queryset = Task.objects.all()
    if is_staff_member(user):
        return queryset
    if is_client(user):
        return queryset.filter(project__client__user=user)
    return queryset.none()
