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


def admin(user):
    return user.is_authenticated and user.role_id and user.role.name in ("owner", "superadmin")


def supervisor(user):
    return bool(admin(user) or SalesSettings.objects.filter(pk=1, supervisor=user).exists())


def member(user):
    return (
        user.is_authenticated
        and user.is_active
        and user.role_id
        and user.role.name != "client"
        and SalesMember.objects.filter(user=user, active=True).exists()
    )


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
