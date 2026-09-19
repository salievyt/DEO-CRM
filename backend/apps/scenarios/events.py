"""Event-driven scenario engine.

While :mod:`apps.scenarios.services` handles inbound-message auto-responders,
this module reacts to CRM events (lead created, deal won, unpaid invoice,
...) and runs business actions configured on a :class:`Scenario`
(create a task, create a reminder, create a project with demo access).

``emit_event`` is the single entry point called from CRM hooks; it is fully
defensive — any failure inside is logged and swallowed so automation never
breaks the caller (e.g. a lead save).
"""

import logging
import uuid
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from .models import ActionType, EventType, Scenario, ScenarioTrigger, TriggerStatus

logger = logging.getLogger("scenarios")

MANAGER_ROLES = {"superadmin", "owner", "project_manager"}

# Role names that count as "manager" targets for automated actions.
DEFAULT_ASSIGNEE = "manager"


def emit_event(event_type, *, actor=None, entity=None, entity_type="", entity_label=""):
    """Run all active scenarios bound to ``event_type``.

    Returns the list of created :class:`ScenarioTrigger` rows. Never raises.
    """
    entity_id = getattr(entity, "id", None)
    scenarios = Scenario.objects.filter(
        is_active=True, event_type=event_type
    ).order_by("priority", "created_at")
    if not scenarios.exists():
        return []

    triggers = []
    for scenario in scenarios:
        try:
            trigger = run_action(
                scenario,
                actor=actor,
                entity=entity,
                entity_type=entity_type,
                entity_id=entity_id,
                entity_label=entity_label,
            )
        except Exception:  # noqa: BLE001 - automation must never crash the caller
            logger.exception(
                "scenarios.event.error event=%s scenario=%s", event_type, scenario.id
            )
            trigger = None
        if trigger:
            triggers.append(trigger)
    return triggers


def run_action(
    scenario, *, actor=None, entity=None, entity_type="", entity_id=None, entity_label=""
):
    """Execute one scenario action and record a trigger row.

    Returns the created :class:`ScenarioTrigger` or None when the scenario is
    not applicable (e.g. a reply scenario fired by an event, or a duplicate).
    """
    if not scenario.is_active:
        # Defensive: never fire a disabled scenario even if called directly.
        return None

    if scenario.event_type == EventType.MESSAGE:
        # Message scenarios are executed by maybe_auto_respond().
        return None

    if entity_id is None and entity is not None:
        entity_id = getattr(entity, "id", None)

    if entity_id and ScenarioTrigger.objects.filter(
        scenario=scenario,
        entity_type=entity_type,
        entity_id=entity_id,
        status=TriggerStatus.RESPONDED,
    ).exists():
        # Already handled this entity — never run the same action twice.
        return None

    handlers = {
        ActionType.CREATE_TASK: _create_task_action,
        ActionType.CREATE_REMINDER: _create_reminder_action,
        ActionType.CREATE_PROJECT_DEMO: _create_project_demo_action,
    }
    handler = handlers.get(scenario.action_type)
    if handler is None:
        return None
    return handler(
        scenario,
        actor=actor,
        entity=entity,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_label=entity_label,
    )


def _create_task_action(
    scenario, *, actor, entity, entity_type, entity_id, entity_label
):
    """Create a task (e.g. for the manager after a lead is created)."""
    from apps.tasks.models import Task, TaskPriority, TaskStatus

    config = scenario.action_config or {}
    status = TaskStatus.objects.order_by("order", "pk").first()
    if status is None:
        return _record_error(
            scenario,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_label=entity_label,
            error="Не настроены статусы задач",
        )

    assignee = _resolve_target(config, entity, actor)
    if assignee is None:
        return _record_error(
            scenario,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_label=entity_label,
            error="Не удалось определить ответственного",
        )

    title = _render_text(config.get("title", ""), entity, entity_label) or (
        f"Обработать: {entity_label or entity_type}"
    )
    description = _render_text(config.get("description", ""), entity, entity_label)

    project_id = None
    project = getattr(entity, "project", None)
    if project is not None:
        project_id = project.id if hasattr(project, "id") else project

    priority = None
    priority_name = config.get("priority")
    if priority_name:
        priority = TaskPriority.objects.filter(name=priority_name).first()

    Task.objects.create(
        project_id=project_id,
        title=title,
        description=description,
        assignee=assignee,
        status=status,
        priority=priority,
        created_by=actor,
    )
    _bump(scenario)
    return ScenarioTrigger.objects.create(
        scenario=scenario,
        event_type=scenario.event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_label=entity_label,
        status=TriggerStatus.RESPONDED,
    )


def _create_reminder_action(
    scenario, *, actor, entity, entity_type, entity_id, entity_label
):
    """Create a reminder assigned to the manager/owner of the entity."""
    from apps.reminders.models import Reminder, ReminderPriority, ReminderStatus

    config = scenario.action_config or {}
    target = _resolve_target(config, entity, actor)
    if target is None:
        return _record_error(
            scenario,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_label=entity_label,
            error="Не удалось определить ответственного",
        )

    title = _render_text(config.get("title", "Напоминание"), entity, entity_label)
    description = _render_text(config.get("description", ""), entity, entity_label)

    days = int(config.get("days", 0) or 0)
    due_at = timezone.now() + timedelta(days=days)

    dedup_key = f"scenario:{scenario.id}:{entity_type}:{entity_id}"
    if Reminder.objects.filter(dedup_key=dedup_key).exists():
        return _record_skipped(
            scenario,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_label=entity_label,
            reason="Напоминание уже создано",
        )

    Reminder.objects.create(
        user=target,
        client=getattr(entity, "client", None),
        deal=entity if entity_type == "lead" else getattr(entity, "lead", None),
        invoice=entity if entity_type == "invoice" else None,
        title=title,
        description=description,
        priority=config.get("priority", ReminderPriority.MEDIUM),
        status=ReminderStatus.PENDING,
        due_at=due_at,
        dedup_key=dedup_key,
    )
    _bump(scenario)
    return ScenarioTrigger.objects.create(
        scenario=scenario,
        event_type=scenario.event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_label=entity_label,
        status=TriggerStatus.RESPONDED,
    )


def _create_project_demo_action(
    scenario, *, actor, entity, entity_type, entity_id, entity_label
):
    """Create a project from a won deal plus demo access for the client."""
    from apps.cabinet.models import ProjectShareLink
    from apps.projects.models import Project, ProjectStatus, ProjectTeamMember

    config = scenario.action_config or {}
    if entity_type != "deal":
        return _record_skipped(
            scenario,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_label=entity_label,
            reason="Действие доступно только для выигранной сделки",
        )

    deal = entity
    if deal.client is None:
        return _record_error(
            scenario,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_label=entity_label,
            error="У сделки нет клиента",
        )

    status = ProjectStatus.objects.order_by("order", "pk").first()
    if status is None:
        return _record_error(
            scenario,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_label=entity_label,
            error="Не настроены статусы проектов",
        )

    name = _render_text(config.get("name", ""), deal, entity_label) or (
        deal.title or f"Проект {deal.number}"
    )
    project = Project.objects.create(
        name=name,
        client=deal.client,
        budget=deal.total or None,
        cost=deal.total_cost or None,
        deadline=config.get("deadline"),
        status=status,
        progress=0,
        description=_render_text(config.get("description", ""), deal, entity_label),
        created_by=actor,
    )

    # Team: the actor is added as a project participant (PM by default).
    team_owner = actor or deal.created_by or deal.assigned_to
    if team_owner:
        ProjectTeamMember.objects.get_or_create(
            project=project,
            user=team_owner,
            defaults={"role_in_project": config.get("project_role", "pm")},
        )

    # Demo access: a shareable cabinet link (and optionally a milestone).
    link_creator = team_owner or _first_manager()
    ProjectShareLink.objects.create(project=project, created_by=link_creator)

    if config.get("create_milestone"):
        milestone_name = config.get("milestone_name", "Демо-доступ")
        from apps.cabinet.models import ProjectMilestone

        ProjectMilestone.objects.create(
            project=project,
            name=milestone_name,
            description="Автоматически создано после выигрыша сделки",
            status=ProjectMilestone.Status.IN_PROGRESS,
            due_date=project.deadline,
        )

    _bump(scenario)
    return ScenarioTrigger.objects.create(
        scenario=scenario,
        event_type=scenario.event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_label=entity_label,
        status=TriggerStatus.RESPONDED,
    )


def process_unpaid_invoices():
    """Emit ``invoice_unpaid`` events for invoices overdue past each scenario.

    Ran periodically via Celery beat. Each scenario carries its own ``days``
    threshold in ``action_config`` (defaults to 3). Returns a small report.
    """
    from django.db.models import F

    from apps.finance.models import Invoice

    today = timezone.now().date()
    scenarios = list(
        Scenario.objects.filter(is_active=True, event_type=EventType.INVOICE_UNPAID)
    )
    report = {"scenarios": len(scenarios), "processed": 0, "failed": 0}

    for scenario in scenarios:
        config = scenario.action_config or {}
        days = int(config.get("days", 3) or 3)
        cutoff = today - timedelta(days=days)
        invoices = (
            Invoice.objects.filter(
                status__in=["sent", "overdue"],
                paid_amount__lt=F("amount"),
                due_date__lte=cutoff,
            )
            .order_by("due_date")
        )
        for invoice in invoices:
            trigger = run_action(
                scenario,
                actor=invoice.created_by,
                entity=invoice,
                entity_type="invoice",
                entity_id=invoice.id,
                entity_label=invoice.number,
            )
            if trigger is None:
                continue
            if trigger.status == TriggerStatus.RESPONDED:
                report["processed"] += 1
            else:
                report["failed"] += 1
    return report


# --- helpers ---


def _resolve_target(config, entity, actor):
    """Resolve the target user for an action (assignee/reminder owner)."""
    from django.contrib.auth import get_user_model

    User = get_user_model()
    key = config.get("assignee", DEFAULT_ASSIGNEE)

    if key == "manager":
        return (
            User.objects.filter(
                is_active=True, role__name__in=MANAGER_ROLES
            )
            .order_by("date_joined")
            .first()
        )
    if key == "owner":
        return (
            User.objects.filter(is_active=True, role__name="owner")
            .order_by("date_joined")
            .first()
            or User.objects.filter(is_active=True, role__name="superadmin")
            .order_by("date_joined")
            .first()
        )
    if key == "creator":
        return actor
    if key == "entity_owner":
        return getattr(entity, "assigned_to", None) or getattr(
            entity, "created_by", None
        )
    try:
        user_id = uuid.UUID(str(key))
    except (TypeError, ValueError):
        return None
    return User.objects.filter(id=user_id, is_active=True).first()


def _first_manager():
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return (
        User.objects.filter(is_active=True, role__name__in=MANAGER_ROLES)
        .order_by("date_joined")
        .first()
    )


def _render_text(template, entity, entity_label):
    """Substitute simple {placeholders} taken from the triggering entity."""
    if not template:
        return ""
    placeholders = {
        "label": entity_label,
        "name": entity_label
        or getattr(entity, "contact_name", "")
        or getattr(entity, "title", ""),
        "number": getattr(entity, "number", ""),
        "title": getattr(entity, "title", "")
        or getattr(entity, "contact_name", "")
        or entity_label,
        "amount": getattr(entity, "total", "")
        or getattr(entity, "amount", ""),
    }
    text = template
    for key, value in placeholders.items():
        text = text.replace("{" + key + "}", str(value or ""))
    return text


def _bump(scenario):
    Scenario.objects.filter(pk=scenario.pk).update(
        trigger_count=scenario.trigger_count + 1,
        last_triggered_at=timezone.now(),
        updated_at=timezone.now(),
    )


def _record_error(scenario, *, entity_type, entity_id, entity_label, error):
    _bump(scenario)
    return ScenarioTrigger.objects.create(
        scenario=scenario,
        event_type=scenario.event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_label=entity_label,
        status=TriggerStatus.FAILED,
        error_message=error,
    )


def _record_skipped(scenario, *, entity_type, entity_id, entity_label, reason=""):
    _bump(scenario)
    return ScenarioTrigger.objects.create(
        scenario=scenario,
        event_type=scenario.event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_label=entity_label,
        status=TriggerStatus.SKIPPED,
        error_message=reason,
    )


__all__ = ["emit_event", "process_unpaid_invoices", "run_action"]