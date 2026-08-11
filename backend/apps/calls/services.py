"""Business logic for the calls module: PBX connection testing, CDR
ingestion (dedupe + client/employee matching) and stats.
"""
import logging
import socket

import requests
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone

from common.phone import normalize_phone, phone_matches

from .enums import CallDirection, CallRecordStatus, CallRecordType
from .models import CallRecord, PBXConnection, SipAccount
from .realtime import notify_missed_call

logger = logging.getLogger("calls")

HTTP_TIMEOUT = 10
AMI_PORT_DEFAULT = 5038


def test_connection(connection) -> dict:
    """Probe the PBX connectivity (best-effort, never raises).

    Checks ``api_url`` reachability over HTTP(S) and the AMI TCP port. Returns
    a structured result dict with ``ok`` + human-readable errors.
    """
    result: dict = {"ok": False, "api_reachable": False, "ami_reachable": False}
    configured_any = False

    api_url = (connection.api_url or "").strip()
    if api_url:
        configured_any = True
        headers = {}
        api_key = getattr(connection, "api_key", "") or ""
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
            headers["X-API-Key"] = api_key
        try:
            response = requests.get(api_url, headers=headers, timeout=HTTP_TIMEOUT)
            result["api_reachable"] = response.status_code < 500
            result["api_status"] = response.status_code
            if response.status_code >= 500:
                result["api_error"] = f"АТС вернула HTTP {response.status_code}"
        except requests.RequestException as exc:
            result["api_error"] = f"Нет соединения с АТС: {exc.__class__.__name__}"

    ami_host = (connection.ami_host or "").strip()
    if ami_host:
        configured_any = True
        port = connection.ami_port or AMI_PORT_DEFAULT
        try:
            with socket.create_connection((ami_host, port), timeout=5):
                result["ami_reachable"] = True
        except OSError as exc:
            result["ami_error"] = f"AMI недоступен ({ami_host}:{port}): {exc.strerror or exc}"

    if not configured_any:
        result["error"] = "Укажите URL API АТС или AMI-доступ для проверки."
        return result

    if not (result["api_reachable"] or result["ami_reachable"]):
        result["error"] = (
            result.get("api_error") or result.get("ami_error")
            or "Не удалось подключиться к АТС."
        )
        return result

    result["ok"] = True
    return result


# -------------------------------------------------------------- CDR ingestion
def ingest_cdr(connection, records: list[dict]) -> dict:
    """Persist CDR records idempotently.

    Records are deduplicated on ``(connection, external_call_id)``. Phone
    numbers are matched to existing clients; employees can be linked by
    ``employee_id`` or by ``employee_extension`` (resolved via SipAccount).
    """
    created = 0
    skipped = 0

    with transaction.atomic():
        for raw in records:
            external_id = (raw.get("external_call_id") or "").strip()
            if not external_id:
                skipped += 1
                continue

            direction = _pick_choice(
                raw.get("direction"), CallDirection, CallDirection.INCOMING
            )
            status = _pick_choice(
                raw.get("status"), CallRecordStatus, CallRecordStatus.ANSWERED
            )
            call_type = _pick_choice(
                raw.get("call_type"), CallRecordType, CallRecordType.EXTERNAL
            )
            phone = (raw.get("phone_number") or "").strip()

            employee = _resolve_employee(raw)
            client = _resolve_client(phone)

            record, was_created = CallRecord.objects.get_or_create(
                connection=connection,
                external_call_id=external_id,
                defaults={
                    "direction": direction,
                    "status": status,
                    "call_type": call_type,
                    "phone_number": phone,
                    "client": client,
                    "employee": employee,
                    "duration_seconds": max(int(raw.get("duration_seconds") or 0), 0),
                    "started_at": raw.get("started_at") or timezone.now(),
                    "ended_at": raw.get("ended_at"),
                    "metadata": raw.get("metadata") or {},
                },
            )
            if was_created:
                created += 1
                if status == CallRecordStatus.MISSED:
                    notify_missed_call(record)
            else:
                skipped += 1

    return {"created": created, "skipped": skipped}


def _pick_choice(value, choices_cls, default):
    if value in choices_cls.values:
        return value
    return default


def _resolve_employee(raw: dict):
    from apps.accounts.models import User

    employee_id = raw.get("employee_id")
    if employee_id:
        user = User.objects.filter(pk=employee_id, is_active=True).first()
        if user:
            return user

    extension = (raw.get("employee_extension") or "").strip()
    if extension:
        account = (
            SipAccount.objects.filter(extension=extension, is_active=True)
            .select_related("user")
            .first()
        )
        if account and account.user_id:
            return account.user
    return None


def _resolve_client(phone: str):
    if not phone:
        return None
    from apps.clients.models import Client

    e164 = normalize_phone(phone)
    if not e164:
        return None
    client = Client.objects.filter(phone=e164).order_by("-created_at").first()
    if client is None:
        pattern = rf"\D*" + r"\D*".join(e164[-10:]) + r"\D*"
        client = Client.objects.filter(phone__iregex=pattern).order_by("-created_at").first()
    return client


# --------------------------------------------------------------------- stats
def call_stats(queryset) -> dict:
    """Aggregate stats for a (already filtered) call record queryset."""
    total = queryset.count()
    incoming = queryset.filter(direction=CallDirection.INCOMING).count()
    outgoing = queryset.filter(direction=CallDirection.OUTGOING).count()
    missed = queryset.filter(status=CallRecordStatus.MISSED).count()
    answered = queryset.filter(status=CallRecordStatus.ANSWERED).count()
    duration = queryset.aggregate(total_seconds=Sum("duration_seconds"))[
        "total_seconds"
    ] or 0
    return {
        "total": total,
        "incoming": incoming,
        "outgoing": outgoing,
        "missed": missed,
        "answered": answered,
        "total_duration_seconds": int(duration),
    }
