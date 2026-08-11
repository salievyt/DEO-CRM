import secrets
import uuid

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsOwner, IsProjectManager

from .enums import CallDirection, CallRecordStatus
from .models import CallRecord, PBXConnection, SipAccount
from .serializers import (
    CallRecordSerializer,
    PBXConnectionSerializer,
    SipAccountSerializer,
)
from .services import call_stats, ingest_cdr, test_connection


def _safe_uuid(value) -> str | None:
    """Return a valid UUID string or None (guards against 500 on bad input)."""
    if not value:
        return None
    try:
        return str(uuid.UUID(str(value)))
    except (ValueError, TypeError, AttributeError):
        return None


# ------------------------------------------------------------ PBX connections
class PBXConnectionListView(generics.ListAPIView):
    """List PBX connections (no credentials in output)."""

    permission_classes = [permissions.IsAuthenticated, IsProjectManager]
    queryset = PBXConnection.objects.all()
    serializer_class = PBXConnectionSerializer


class PBXConnectionCreateView(generics.CreateAPIView):
    """Create a PBX connection (owner/superadmin only)."""

    permission_classes = [permissions.IsAuthenticated, IsOwner]
    queryset = PBXConnection.objects.all()
    serializer_class = PBXConnectionSerializer


class PBXConnectionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get/update/delete a PBX connection (owner/superadmin only)."""

    permission_classes = [permissions.IsAuthenticated, IsOwner]
    queryset = PBXConnection.objects.all()
    serializer_class = PBXConnectionSerializer


class PBXConnectionTestView(APIView):
    """Probe PBX connectivity (HTTP API + AMI port).

    POST with ``pk`` tests a saved connection; without ``pk`` tests draft
    credentials from the request body (nothing is saved). Owner/superadmin only.
    """

    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def post(self, request, pk=None):
        if pk:
            connection = get_object_or_404(PBXConnection, pk=pk)
        else:
            api_key = (request.data.get("api_key") or "").strip()
            ami_password = (request.data.get("ami_password") or "").strip()
            connection = PBXConnection(
                name="draft",
                provider=request.data.get("provider") or "other",
                api_url=(request.data.get("api_url") or "").strip(),
                ami_host=(request.data.get("ami_host") or "").strip(),
                ami_port=int(request.data.get("ami_port") or 5038),
                ami_user=(request.data.get("ami_user") or "").strip(),
                ws_url=(request.data.get("ws_url") or "").strip(),
                sip_domain=(request.data.get("sip_domain") or "").strip(),
            )
            connection.set_api_key(api_key)
            connection.set_ami_password(ami_password)

        result = test_connection(connection)
        return Response(result)


# ---------------------------------------------------------------- SIP accounts
class SipAccountListView(generics.ListAPIView):
    """List SIP accounts (no passwords in output)."""

    permission_classes = [permissions.IsAuthenticated, IsProjectManager]
    queryset = SipAccount.objects.select_related("user", "connection").all()
    serializer_class = SipAccountSerializer


class SipAccountQuickCreateView(generics.CreateAPIView):
    """Быстрое подключение SIP: create an account by extension/password/name."""

    permission_classes = [permissions.IsAuthenticated, IsOwner]
    queryset = SipAccount.objects.all()
    serializer_class = SipAccountSerializer

    def perform_create(self, serializer):
        # Optionally bind to the default connection if none was provided.
        connection_id = self.request.data.get("connection_id")
        connection = None
        if connection_id:
            connection = PBXConnection.objects.filter(pk=connection_id).first()
        if connection is None:
            connection = PBXConnection.get_default(active_only=False)
        serializer.save(connection=connection)


class SipAccountDetailView(generics.RetrieveDestroyAPIView):
    """Get/delete a SIP account (owner/superadmin only)."""

    permission_classes = [permissions.IsAuthenticated, IsOwner]
    queryset = SipAccount.objects.all()
    serializer_class = SipAccountSerializer


# ---------------------------------------------------------------- call records
class CallRecordListView(generics.ListAPIView):
    """Company call log with filters (direction, status, search, date range)."""

    permission_classes = [permissions.IsAuthenticated, IsProjectManager]
    serializer_class = CallRecordSerializer
    ordering_fields = ("started_at", "duration_seconds", "phone_number")

    def get_queryset(self):
        qs = CallRecord.objects.select_related("client", "employee", "connection").all()

        direction = self.request.query_params.get("direction")
        if direction in CallDirection.values:
            qs = qs.filter(direction=direction)
        cstatus = self.request.query_params.get("status")
        if cstatus in CallRecordStatus.values:
            qs = qs.filter(status=cstatus)
        client_id = _safe_uuid(self.request.query_params.get("client_id"))
        if client_id:
            qs = qs.filter(client_id=client_id)
        employee_id = _safe_uuid(self.request.query_params.get("employee"))
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(phone_number__icontains=search)
                | Q(employee__first_name__icontains=search)
                | Q(employee__last_name__icontains=search)
                | Q(client__first_name__icontains=search)
                | Q(client__last_name__icontains=search)
            )
        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(started_at__date__gte=date_from)
        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(started_at__date__lte=date_to)
        return qs


class CallStatsView(APIView):
    """Aggregated call stats honoring the same filters as the call log."""

    permission_classes = [permissions.IsAuthenticated, IsProjectManager]

    def get(self, request):
        qs = CallRecord.objects.all()
        direction = request.query_params.get("direction")
        if direction in CallDirection.values:
            qs = qs.filter(direction=direction)
        cstatus = request.query_params.get("status")
        if cstatus in CallRecordStatus.values:
            qs = qs.filter(status=cstatus)
        client_id = _safe_uuid(request.query_params.get("client_id"))
        if client_id:
            qs = qs.filter(client_id=client_id)
        employee_id = _safe_uuid(request.query_params.get("employee"))
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        date_from = request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(started_at__date__gte=date_from)
        date_to = request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(started_at__date__lte=date_to)
        return Response(call_stats(qs))


class CallRecordIngestView(APIView):
    """CDR ingestion endpoint for the PBX.

    Two auth paths:
      * a CRM staff member with a valid JWT (superadmin/owner/PM) — for
        testing and manual import;
      * the PBX itself via ``X-API-Key`` header (or ``api_key`` in the body)
        matching the connection's stored API key.
    Records are deduplicated on ``(connection, external_call_id)``.
    """

    authentication_classes = ()
    permission_classes = ()
    throttle_classes = ()

    def post(self, request):
        connection_id = request.data.get("connection_id") or (
            request.query_params.get("connection_id") or ""
        )
        connection = None
        if connection_id:
            connection = PBXConnection.objects.filter(pk=connection_id).first()
        if connection is None:
            return Response(
                {"error": "connection_id обязателен и должен указывать на существующую АТС"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not self._authorized(request, connection):
            return Response(
                {"error": "Недостаточно прав или неверный API ключ АТС"},
                status=status.HTTP_403_FORBIDDEN,
            )

        records = request.data.get("records")
        if not isinstance(records, list):
            return Response(
                {"error": "Поле records должно быть массивом"}, status=400
            )

        result = ingest_cdr(connection, records)
        return Response(result)

    def _authorized(self, request, connection) -> bool:
        user = request.user
        if user.is_authenticated and user.role is not None and \
                user.role.name in ("superadmin", "owner", "project_manager"):
            return True
        api_key = request.headers.get("X-API-Key") or request.data.get("api_key") or ""
        stored = connection.api_key
        return bool(api_key and stored) and secrets.compare_digest(api_key, stored)
