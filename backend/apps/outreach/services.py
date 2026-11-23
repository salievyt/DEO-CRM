import json
import re
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import Contact, DailyAssignment, SalesMember, SalesSettings

BISHKEK = ZoneInfo("Asia/Bishkek")
LABELS = {
    "Компания": "company",
    "Телефон": "phone",
    "Сфера": "industry",
    "Предложение": "offer",
    "УТП": "usp",
    "Начало разговора": "script",
    "Возражения": "objections",
}


def local_now():
    return timezone.now().astimezone(BISHKEK)


def working(now):
    return now.weekday() < 5 and 9 <= now.hour < 19


def next_workday(now):
    day = now.date() + timedelta(days=1)
    while day.weekday() >= 5:
        day += timedelta(days=1)
    return datetime.combine(day, time(9), BISHKEK)


ADMIN_ROLES = ("owner", "superadmin")
# Roles that may be named head of the department and receive interested leads.
HEAD_ROLES = ("owner", "superadmin", "project_manager", "sales_head")


def admin(user):
    """Owner/superadmin: configures the department whether or not they lead it."""
    return bool(
        user.is_authenticated and user.is_active and user.role_id and user.role.name in ADMIN_ROLES
    )


def sales_settings():
    return SalesSettings.objects.get_or_create(pk=1)[0]


def supervisor(user, settings=None):
    """Sees the whole department, imports, sets limits, reassigns contacts."""
    if not (user.is_authenticated and user.is_active and user.role_id):
        return False
    if user.role.name == "sales_head":
        return True
    settings = settings or sales_settings()
    if settings.supervisor_id == user.id and user.role.name in HEAD_ROLES:
        return True
    return admin(user) and settings.owner_is_head


def head(settings=None):
    """Who receives interested leads, or ``None``.

    An explicitly named head wins; otherwise the owner while ``owner_is_head``
    is on, otherwise the longest-serving active sales head.
    """
    from apps.accounts.models import User

    settings = settings or sales_settings()
    boss = settings.supervisor
    if boss and boss.is_active and boss.role_id and boss.role.name in HEAD_ROLES:
        return boss
    active = User.objects.filter(is_active=True).order_by("date_joined", "id")
    if settings.owner_is_head:
        found = (
            active.filter(role__name="owner").first()
            or active.filter(role__name="superadmin").first()
        )
        if found:
            return found
    return active.filter(role__name="sales_head").first()


def sync_members():
    """Every active sales manager joins the call rotation automatically.

    Only missing rows are created, so a paused manager stays paused.
    """
    from apps.accounts.models import User

    for uid in User.objects.filter(
        is_active=True, role__name="sales_manager", salesmember__isnull=True
    ).values_list("id", flat=True):
        SalesMember.objects.get_or_create(user_id=uid)


def member(user):
    if not (
        user.is_authenticated and user.is_active and user.role_id and user.role.name != "client"
    ):
        return False
    row = SalesMember.objects.filter(user=user).first()
    if row is None:
        return user.role.name == "sales_manager"
    return row.active


def parse_batch(raw):
    if not isinstance(raw, str) or not raw.strip() or len(raw) > 1_000_000:
        raise ValidationError("Вставьте подборку D2C размером до 1 МБ.")
    raw = raw.strip()
    if raw.startswith("["):
        try:
            rows = json.loads(raw)
        except ValueError:
            raise ValidationError("Некорректный JSON D2C.")
    else:
        rows = []
        for block in re.split(r"(?m)^\s*---\s*$", raw):
            if not block.strip():
                continue
            row, current = {}, None
            for line in block.strip().splitlines():
                label, sep, value = line.partition(":")
                if sep and label.strip() in LABELS:
                    current = LABELS[label.strip()]
                    if current in row:
                        raise ValidationError("Повтор поля. Разделяйте компании строкой ---.")
                    row[current] = value.strip()
                elif current:
                    row[current] += "\n" + line
                else:
                    raise ValidationError(
                        "Используйте шаблон D2C: Компания:, Телефон:, Предложение: и разделитель ---."
                    )
            rows.append(row)
    if not isinstance(rows, list) or not 1 <= len(rows) <= 500:
        raise ValidationError("В одной подборке должно быть от 1 до 500 контактов.")
    seen = set(Contact.objects.values_list("phone", flat=True))
    result = []
    for i, row in enumerate(rows, 1):
        if not isinstance(row, dict) or any(not isinstance(v, str) for v in row.values()):
            raise ValidationError(f"Контакт {i}: поля должны быть текстом.")
        unknown = set(row) - set(LABELS.values())
        if unknown:
            raise ValidationError(f"Контакт {i}: неизвестные поля {', '.join(sorted(unknown))}.")
        row = {k: row.get(k, "").strip() for k in LABELS.values()}
        phone = re.sub(r"[\s()\-]", "", row["phone"])
        if not re.fullmatch(r"\+?[1-9][0-9]{7,14}", phone):
            raise ValidationError(
                f"Контакт {i}: укажите телефон с кодом страны, например +996700123456."
            )
        row["phone"] = "+" + phone.lstrip("+")
        if not row["company"] or len(row["company"]) > 255 or not row["offer"]:
            raise ValidationError(f"Контакт {i}: нужны компания (до 255 символов) и предложение.")
        if any(len(v) > 10000 for v in row.values()):
            raise ValidationError(f"Контакт {i}: поле длиннее 10 000 символов.")
        row["duplicate"] = row["phone"] in seen
        seen.add(row["phone"])
        result.append(row)
    return result


@transaction.atomic
def allocate():
    now = local_now()
    if not working(now):
        return
    SalesSettings.objects.get_or_create(pk=1)
    SalesSettings.objects.select_for_update().get(pk=1)
    sync_members()
    members = list(
        SalesMember.objects.filter(active=True, user__is_active=True, user__role__isnull=False)
        .exclude(user__role__name="client")
        .order_by("user_id")
    )
    counts = {}
    for m in members:
        # Carry-over and unanswered retries occupy today's quota; callbacks never do.
        counts[m.user_id] = DailyAssignment.objects.filter(user=m.user, date=now.date()).count()
        pending = (
            Contact.objects.filter(assigned_to=m.user, status__in=["new", "no_answer"])
            .filter(Q(next_call_at__isnull=True) | Q(next_call_at__lte=now))
            .exclude(pk__in=DailyAssignment.objects.filter(date=now.date()).values("contact_id"))
            .order_by("next_call_at", "created_at", "id")
        )
        remaining = max(0, m.daily_limit - counts[m.user_id])
        for c in pending[:remaining]:
            DailyAssignment.objects.create(contact=c, date=now.date(), user=m.user)
            counts[m.user_id] += 1
    pool = Contact.objects.filter(assigned_to__isnull=True, status__in=["new", "no_answer"]).filter(
        Q(next_call_at__isnull=True) | Q(next_call_at__lte=now)
    )
    for contact in pool.iterator():
        eligible = [m for m in members if counts[m.user_id] < m.daily_limit]
        if not eligible:
            break
        target = min(eligible, key=lambda m: (counts[m.user_id], str(m.user_id)))
        contact.assigned_to = target.user
        contact.assigned_on = now.date()
        contact.save(update_fields=["assigned_to", "assigned_on", "updated_at"])
        DailyAssignment.objects.get_or_create(
            contact=contact, date=now.date(), defaults={"user": target.user}
        )
        counts[target.user_id] += 1
