"""Business Reminders rules engine.

Evaluates CRM state (clients, deals, tasks, invoices) against enabled
:class:`~apps.reminders.models.ReminderRule` rules and produces
:class:`Reminder` records. Runs asynchronously via the Celery beat task
``apps.reminders.tasks.process_reminders`` — never on the API request path.
"""
import logging
from dataclasses import dataclass, field
from datetime import datetime, time as dtime, timedelta
from typing import Optional

from django.apps import apps as django_apps
from django.db.models import Max, OuterRef, Subquery
from django.utils import timezone

from apps.clients.models import Client
from apps.finance.models import Invoice
from apps.leads.models import Lead, LeadHistory, LeadStage
from apps.tasks.models import Task

from .models import (
    Reminder,
    ReminderLog,
    ReminderPriority,
    ReminderRule,
    ReminderRuleType,
    ReminderStatus,
)

logger = logging.getLogger(__name__)

# Task statuses considered "done" — these must never generate reminders.
DONE_STATUS_NAMES = ["Выполнена", "Отклонена", "Завершена", "Закрыта", "Done", "Closed"]

# Default priority per rule type (used by seeding and as documentation).
DEFAULT_PRIORITIES = {
    ReminderRuleType.CLIENT_NO_RESPONSE: ReminderPriority.MEDIUM,
    ReminderRuleType.DEAL_STAGE_TIMEOUT: ReminderPriority.MEDIUM,
    ReminderRuleType.TASK_OVERDUE: ReminderPriority.HIGH,
    ReminderRuleType.TASK_DEADLINE_SOON: ReminderPriority.MEDIUM,
    ReminderRuleType.DEAL_NO_NEXT_ACTION: ReminderPriority.LOW,
    ReminderRuleType.LEAD_UNPROCESSED: ReminderPriority.HIGH,
    ReminderRuleType.CLIENT_NO_CONTACT: ReminderPriority.LOW,
    ReminderRuleType.DEAL_NO_CHANGES: ReminderPriority.LOW,
    ReminderRuleType.CLIENT_OPEN_DEALS_NO_CONTACT: ReminderPriority.MEDIUM,
    ReminderRuleType.FINANCE_DEADLINE_SOON: ReminderPriority.HIGH,
}

DEFAULT_MANAGER_ROLES = ["superadmin", "owner", "project_manager", "marketer"]

DEFAULT_RULE_TEMPLATES = [
    {
        "type": ReminderRuleType.CLIENT_NO_RESPONSE,
        "name": "Клиент не отвечает",
        "conditions": {"days": 3},
        "priority": ReminderPriority.MEDIUM,
    },
    {
        "type": ReminderRuleType.DEAL_STAGE_TIMEOUT,
        "name": "Сделка долго на этапе",
        "conditions": {"days": 8},
        "priority": ReminderPriority.MEDIUM,
    },
    {
        "type": ReminderRuleType.TASK_OVERDUE,
        "name": "Просроченная задача",
        "conditions": {"days": 1},
        "priority": ReminderPriority.HIGH,
    },
    {
        "type": ReminderRuleType.TASK_DEADLINE_SOON,
        "name": "Близкий дедлайн задачи",
        "conditions": {"within_hours": 24},
        "priority": ReminderPriority.MEDIUM,
    },
    {
        "type": ReminderRuleType.DEAL_NO_NEXT_ACTION,
        "name": "Нет следующего действия по сделке",
        "conditions": {},
        "priority": ReminderPriority.LOW,
    },
    {
        "type": ReminderRuleType.LEAD_UNPROCESSED,
        "name": "Лид не обработан",
        "conditions": {"hours": 2},
        "priority": ReminderPriority.HIGH,
    },
    {
        "type": ReminderRuleType.CLIENT_NO_CONTACT,
        "name": "Клиент давно не контактировал",
        "conditions": {"days": 14},
        "priority": ReminderPriority.LOW,
    },
    {
        "type": ReminderRuleType.DEAL_NO_CHANGES,
        "name": "Сделка без изменений",
        "conditions": {"days": 5},
        "priority": ReminderPriority.LOW,
    },
    {
        "type": ReminderRuleType.CLIENT_OPEN_DEALS_NO_CONTACT,
        "name": "Клиент с открытыми сделками без контакта",
        "conditions": {"days": 7},
        "priority": ReminderPriority.MEDIUM,
    },
    {
        "type": ReminderRuleType.FINANCE_DEADLINE_SOON,
        "name": "Дедлайн счёта близко",
        "conditions": {"within_days": 3},
        "priority": ReminderPriority.HIGH,
    },
]


@dataclass
class ReminderCandidate:
    """A reminder ready to be persisted for a specific user."""

    user_id: str
    title: str
    description: str = ""
    priority: str = ""
    due_at: datetime = field(default_factory=timezone.now)
    client_id: Optional[str] = None
    deal_id: Optional[str] = None
    task_id: Optional[str] = None
    invoice_id: Optional[str] = None


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #


def _target_roles(rule) -> Optional[set]:
    roles = rule.target_roles or []
    if not roles:
        return None
    return set(roles)


def _user_matches(user, roles: Optional[set]) -> bool:
    if user is None:
        return False
    if roles is None:
        return True
    role_name = user.role.name if user.role else ""
    return role_name in roles


def _client_responsible(client):
    return client.created_by or client.user


def _deal_responsible(deal):
    return deal.assigned_to or deal.created_by


def _invoice_responsible(invoice):
    return invoice.created_by or _client_responsible(invoice.client)


def _last_contact(client):
    """Latest client contact across interactions and messaging."""
    values = [
        client.last_interaction,
        getattr(client, "last_message", None),
    ]
    values = [v for v in values if v is not None]
    return max(values) if values else None


def _client_base_qs():
    annotations = {
        "last_interaction": Max("interactions__created_at"),
    }
    if django_apps.is_installed("apps.messaging"):
        annotations["last_message"] = Max("messaging_messages__created_at")
    return Client.objects.filter(is_active=True).annotate(**annotations)


def _end_of_day(day):
    return timezone.make_aware(datetime.combine(day, dtime.max))


# --------------------------------------------------------------------------- #
# rule handlers
# --------------------------------------------------------------------------- #


def _client_no_response(rule):
    days = int(rule.conditions.get("days", 3))
    cutoff = timezone.now() - timedelta(days=days)
    roles = _target_roles(rule)
    candidates = []
    for client in _client_base_qs():
        last_contact = _last_contact(client)
        if last_contact is None or last_contact >= cutoff:
            continue
        user = _client_responsible(client)
        if not _user_matches(user, roles):
            continue
        days_no = max(0, (timezone.now() - last_contact).days)
        candidates.append(ReminderCandidate(
            user_id=user.id,
            client_id=client.id,
            title=f"{client.full_name} не отвечает",
            description=(
                f"{client.full_name} не отвечал {days_no} дн. "
                f"(последний контакт {last_contact:%d.%m.%Y}). "
                f"Рекомендуется связаться с клиентом."
            ),
            priority=rule.priority,
            due_at=timezone.now(),
        ))
    return candidates


def _deal_stage_timeout(rule):
    days = int(rule.conditions.get("days", 8))
    cutoff = timezone.now() - timedelta(days=days)
    roles = _target_roles(rule)
    stage_since = (
        LeadHistory.objects.filter(
            lead_id=OuterRef("pk"),
            to_stage_id=OuterRef("current_stage_id"),
        )
        .values("lead_id")
        .annotate(max_created=Max("created_at"))
        .values("max_created")
    )
    deals = (
        Lead.objects.filter(is_active=True)
        .select_related("current_stage", "assigned_to", "created_by")
        .annotate(stage_since=Subquery(stage_since))
    )
    candidates = []
    for deal in deals:
        since = deal.stage_since or deal.created_at
        if since >= cutoff:
            continue
        user = _deal_responsible(deal)
        if not _user_matches(user, roles):
            continue
        days_on = max(0, (timezone.now() - since).days)
        candidates.append(ReminderCandidate(
            user_id=user.id,
            deal_id=deal.id,
            title=f"Сделка «{deal.contact_name}» долго на этапе",
            description=(
                f"Сделка «{deal.contact_name}» находится на этапе "
                f"«{deal.current_stage.name}» уже {days_on} дн."
            ),
            priority=rule.priority,
            due_at=timezone.now(),
        ))
    return candidates


def _task_overdue(rule):
    days = int(rule.conditions.get("days", 1))
    today = timezone.localdate()
    cutoff = today - timedelta(days=days)
    roles = _target_roles(rule)
    tasks = (
        Task.objects.filter(assignee__isnull=False, deadline__lt=cutoff)
        .select_related("assignee", "status")
    )
    candidates = []
    for task in tasks:
        if task.status.name in DONE_STATUS_NAMES:
            continue
        user = task.assignee
        if not _user_matches(user, roles):
            continue
        overdue = max(0, (today - task.deadline).days)
        candidates.append(ReminderCandidate(
            user_id=user.id,
            task_id=task.id,
            title=f"Задача «{task.title}» просрочена",
            description=f"Задача «{task.title}» просрочена на {overdue} дн.",
            priority=rule.priority,
            due_at=timezone.now(),
        ))
    return candidates


def _task_deadline_soon(rule):
    within_hours = int(rule.conditions.get("within_hours", 24))
    now = timezone.now()
    horizon = now + timedelta(hours=within_hours)
    today = timezone.localdate()
    roles = _target_roles(rule)
    tasks = (
        Task.objects.filter(
            assignee__isnull=False,
            deadline__gte=today,
            deadline__lte=horizon.date(),
        )
        .select_related("assignee", "status")
    )
    candidates = []
    for task in tasks:
        if task.status.name in DONE_STATUS_NAMES:
            continue
        user = task.assignee
        if not _user_matches(user, roles):
            continue
        due_at = _end_of_day(task.deadline)
        hours_left = int((due_at - now).total_seconds() // 3600)
        if hours_left < 0:
            continue
        left_txt = f"{hours_left} ч." if hours_left < 24 else f"{(due_at.date() - today).days} дн."
        candidates.append(ReminderCandidate(
            user_id=user.id,
            task_id=task.id,
            title=f"Срок задачи «{task.title}» скоро",
            description=f"До завершения задачи «{task.title}» осталось {left_txt}.",
            priority=rule.priority,
            due_at=due_at,
        ))
    return candidates


def _deal_no_next_action(rule):
    roles = _target_roles(rule)
    deals = Lead.objects.filter(is_active=True).select_related("assigned_to", "created_by")
    now = timezone.now()
    candidates = []
    for deal in deals:
        has_next = (deal.next_action or "").strip()
        if has_next and (deal.next_action_at is None or deal.next_action_at > now):
            continue
        user = _deal_responsible(deal)
        if not _user_matches(user, roles):
            continue
        if not has_next:
            title = f"У сделки «{deal.contact_name}» нет следующего действия"
            description = (
                f"У сделки «{deal.contact_name}» отсутствует следующее действие. "
                f"Запланируйте звонок, встречу или задачу."
            )
        else:
            title = f"Следующее действие по сделке «{deal.contact_name}» просрочено"
            description = (
                f"Следующее действие по сделке «{deal.contact_name}» было запланировано "
                f"на {deal.next_action_at:%d.%m.%Y %H:%M}, но не выполнено."
            )
        candidates.append(ReminderCandidate(
            user_id=user.id,
            deal_id=deal.id,
            title=title,
            description=description,
            priority=rule.priority,
            due_at=now,
        ))
    return candidates


def _lead_unprocessed(rule):
    hours = int(rule.conditions.get("hours", 2))
    cutoff = timezone.now() - timedelta(hours=hours)
    first_stage = LeadStage.objects.order_by("order").first()
    if first_stage is None:
        return []
    roles = _target_roles(rule)
    leads = (
        Lead.objects.filter(is_active=True, current_stage=first_stage, created_at__lt=cutoff)
        .select_related("client", "assigned_to", "created_by")
    )
    candidates = []
    for lead in leads:
        if lead.history.exclude(to_stage=first_stage).exists():
            continue
        user = _deal_responsible(lead)
        if not _user_matches(user, roles):
            continue
        hours_wait = max(0, int((timezone.now() - lead.created_at).total_seconds() // 3600))
        candidates.append(ReminderCandidate(
            user_id=user.id,
            client_id=lead.client_id,
            deal_id=lead.id,
            title=f"Лид «{lead.contact_name}» ждёт обработки",
            description=f"Новый лид «{lead.contact_name}» ожидает обработки уже {hours_wait} ч.",
            priority=rule.priority,
            due_at=timezone.now(),
        ))
    return candidates


def _client_no_contact(rule):
    days = int(rule.conditions.get("days", 14))
    cutoff = timezone.now() - timedelta(days=days)
    roles = _target_roles(rule)
    candidates = []
    for client in _client_base_qs():
        last_contact = _last_contact(client)
        has_deal = client.leads.filter(is_active=True).exists()
        if last_contact is None and not has_deal:
            continue
        if last_contact is not None and last_contact >= cutoff:
            continue
        user = _client_responsible(client)
        if not _user_matches(user, roles):
            continue
        if last_contact is None:
            description = f"Клиент {client.full_name} ещё ни разу не контактировал с компанией."
        else:
            days_ago = max(0, (timezone.now() - last_contact).days)
            description = (
                f"Клиент {client.full_name} давно не контактировал с компанией "
                f"(последний контакт {last_contact:%d.%m.%Y}, {days_ago} дн. назад)."
            )
        candidates.append(ReminderCandidate(
            user_id=user.id,
            client_id=client.id,
            title=f"Клиент {client.full_name} давно не контактировал",
            description=description,
            priority=rule.priority,
            due_at=timezone.now(),
        ))
    return candidates


def _deal_no_changes(rule):
    days = int(rule.conditions.get("days", 5))
    cutoff = timezone.now() - timedelta(days=days)
    roles = _target_roles(rule)
    deals = (
        Lead.objects.filter(is_active=True, updated_at__lt=cutoff)
        .select_related("assigned_to", "created_by")
    )
    candidates = []
    for deal in deals:
        user = _deal_responsible(deal)
        if not _user_matches(user, roles):
            continue
        days_ago = max(0, (timezone.now() - deal.updated_at).days)
        candidates.append(ReminderCandidate(
            user_id=user.id,
            deal_id=deal.id,
            title=f"Сделка «{deal.contact_name}» без изменений",
            description=f"Сделка «{deal.contact_name}» находится без изменений уже {days_ago} дн.",
            priority=rule.priority,
            due_at=timezone.now(),
        ))
    return candidates


def _client_open_deals_no_contact(rule):
    days = int(rule.conditions.get("days", 7))
    cutoff = timezone.now() - timedelta(days=days)
    roles = _target_roles(rule)
    annotations = {
        "last_interaction": Max("interactions__created_at"),
    }
    if django_apps.is_installed("apps.messaging"):
        annotations["last_message"] = Max("messaging_messages__created_at")
    clients = (
        Client.objects.filter(is_active=True, leads__is_active=True)
        .distinct()
        .annotate(**annotations)
    )
    candidates = []
    for client in clients:
        last_contact = _last_contact(client)
        if last_contact is not None and last_contact >= cutoff:
            continue
        for deal in client.leads.filter(is_active=True).select_related("assigned_to", "created_by"):
            user = _deal_responsible(deal)
            if not _user_matches(user, roles):
                continue
            if last_contact is None:
                desc = (
                    f"Клиент {client.full_name} имеет открытые сделки, "
                    f"но контактов с ним ещё не было."
                )
            else:
                days_ago = max(0, (timezone.now() - last_contact).days)
                desc = (
                    f"Клиент {client.full_name} имеет открытые сделки, "
                    f"но вы не взаимодействовали с ним {days_ago} дн."
                )
            candidates.append(ReminderCandidate(
                user_id=user.id,
                client_id=client.id,
                deal_id=deal.id,
                title=f"Клиент {client.full_name} без контакта",
                description=desc,
                priority=rule.priority,
                due_at=timezone.now(),
            ))
    return candidates


def _finance_deadline_soon(rule):
    within_days = int(rule.conditions.get("within_days", 3))
    today = timezone.localdate()
    horizon = today + timedelta(days=within_days)
    roles = _target_roles(rule)
    invoices = (
        Invoice.objects.filter(status__in=["draft", "sent"], due_date__lte=horizon)
        .select_related("client", "created_by")
    )
    candidates = []
    for invoice in invoices:
        user = _invoice_responsible(invoice)
        if not _user_matches(user, roles):
            continue
        amount = f"{invoice.amount:.0f} ₽" if invoice.amount == invoice.amount.to_integral() else f"{invoice.amount} ₽"
        due_at = _end_of_day(invoice.due_date)
        if invoice.due_date < today:
            title = f"Счёт {invoice.number} просрочен"
            description = (
                f"Счёт {invoice.number} на {amount} просрочен "
                f"(срок оплаты был {invoice.due_date:%d.%m.%Y})."
            )
        else:
            days_left = (invoice.due_date - today).days
            title = f"Дедлайн счёта {invoice.number} скоро"
            description = (
                f"Счёт {invoice.number} на {amount} приближается к дедлайну "
                f"({invoice.due_date:%d.%m.%Y}). Осталось {days_left} дн."
            )
        candidates.append(ReminderCandidate(
            user_id=user.id,
            client_id=invoice.client_id,
            invoice_id=invoice.id,
            title=title,
            description=description,
            priority=rule.priority,
            due_at=due_at,
        ))
    return candidates


RULE_HANDLERS = {
    ReminderRuleType.CLIENT_NO_RESPONSE: _client_no_response,
    ReminderRuleType.DEAL_STAGE_TIMEOUT: _deal_stage_timeout,
    ReminderRuleType.TASK_OVERDUE: _task_overdue,
    ReminderRuleType.TASK_DEADLINE_SOON: _task_deadline_soon,
    ReminderRuleType.DEAL_NO_NEXT_ACTION: _deal_no_next_action,
    ReminderRuleType.LEAD_UNPROCESSED: _lead_unprocessed,
    ReminderRuleType.CLIENT_NO_CONTACT: _client_no_contact,
    ReminderRuleType.DEAL_NO_CHANGES: _deal_no_changes,
    ReminderRuleType.CLIENT_OPEN_DEALS_NO_CONTACT: _client_open_deals_no_contact,
    ReminderRuleType.FINANCE_DEADLINE_SOON: _finance_deadline_soon,
}


def scan_reminders(rule) -> list:
    """Evaluate a single rule and return candidate reminders."""
    handler = RULE_HANDLERS.get(rule.type)
    if handler is None:
        logger.warning("No handler for reminder rule type %s", rule.type)
        return []
    return handler(rule)


# --------------------------------------------------------------------------- #
# persistence
# --------------------------------------------------------------------------- #


def build_dedup_key(rule, candidate: ReminderCandidate) -> str:
    """Key that identifies a reminder instance.

    Based on rule *type* + target user + entity refs so that the same logical
    reminder is never created twice (even if several rules of one type exist).
    """
    return ":".join([
        rule.type,
        str(candidate.user_id),
        candidate.client_id and str(candidate.client_id) or "-",
        candidate.deal_id and str(candidate.deal_id) or "-",
        candidate.task_id and str(candidate.task_id) or "-",
        candidate.invoice_id and str(candidate.invoice_id) or "-",
    ])


def sync_reminders():
    """Evaluate all enabled rules and sync the pending reminder set.

    Creates reminders that do not exist yet (idempotent, no duplicates) and
    expires pending/viewed reminders whose condition no longer holds.
    """
    now = timezone.now()
    fresh_keys = set()
    planned = []

    for rule in ReminderRule.objects.filter(enabled=True):
        try:
            candidates = scan_reminders(rule)
        except Exception:
            logger.exception("Failed to evaluate reminder rule %s", rule.name)
            continue
        for candidate in candidates:
            key = build_dedup_key(rule, candidate)
            fresh_keys.add(key)
            planned.append((rule, candidate, key))

    existing = {
        r.dedup_key: r
        for r in Reminder.objects.filter(
            status__in=[ReminderStatus.PENDING, ReminderStatus.VIEWED]
        ).select_related("rule")
    }

    # Create new reminders (skip keys already planned or already present).
    new_reminders = []
    seen = set()
    for rule, candidate, key in planned:
        if key in seen or key in existing:
            continue
        seen.add(key)
        new_reminders.append(Reminder(
            user_id=candidate.user_id,
            client_id=candidate.client_id,
            deal_id=candidate.deal_id,
            task_id=candidate.task_id,
            invoice_id=candidate.invoice_id,
            rule=rule,
            title=candidate.title,
            description=candidate.description,
            priority=candidate.priority or rule.priority,
            status=ReminderStatus.PENDING,
            due_at=candidate.due_at,
            dedup_key=key,
        ))

    created_count = len(new_reminders)
    if new_reminders:
        Reminder.objects.bulk_create(new_reminders, batch_size=500)
        ReminderLog.objects.bulk_create([
            ReminderLog(
                reminder=r,
                action=ReminderLog.Actions.CREATED,
                details={"rule": r.rule.name if r.rule else ""},
            )
            for r in new_reminders
        ])

    # Expire reminders whose condition no longer holds.
    stale = [r for r in existing.values() if r.dedup_key not in fresh_keys]
    expired_count = len(stale)
    if stale:
        stale_ids = [r.id for r in stale]
        Reminder.objects.filter(id__in=stale_ids).update(
            status=ReminderStatus.EXPIRED,
            dismissed_at=now,
        )
        ReminderLog.objects.bulk_create([
            ReminderLog(
                reminder_id=rid,
                action=ReminderLog.Actions.EXPIRED,
                details={"reason": "condition_no_longer_holds"},
            )
            for rid in stale_ids
        ])

    return {
        "created": created_count,
        "expired": expired_count,
        "active": len(fresh_keys),
    }


def expire_orphaned_reminders():
    """Expire pending/viewed reminders that have no related entity left."""
    now = timezone.now()
    qs = Reminder.objects.filter(
        status__in=[ReminderStatus.PENDING, ReminderStatus.VIEWED],
        client__isnull=True,
        deal__isnull=True,
        task__isnull=True,
        invoice__isnull=True,
    )
    ids = list(qs.values_list("id", flat=True))
    if not ids:
        return 0
    qs.update(status=ReminderStatus.EXPIRED, dismissed_at=now)
    ReminderLog.objects.bulk_create([
        ReminderLog(
            reminder_id=rid,
            action=ReminderLog.Actions.EXPIRED,
            details={"reason": "related_entity_removed"},
        )
        for rid in ids
    ])
    return len(ids)


def seed_default_rules():
    """Create default rules if the rule type is not yet present."""
    created = []
    for template in DEFAULT_RULE_TEMPLATES:
        rule, was_created = ReminderRule.objects.get_or_create(
            type=template["type"],
            defaults={
                "name": template["name"],
                "conditions": template["conditions"],
                "priority": template["priority"],
                "target_roles": DEFAULT_MANAGER_ROLES,
            },
        )
        if was_created:
            created.append(rule)
    return created
