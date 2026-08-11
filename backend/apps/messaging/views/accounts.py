from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsOwner

from ..models import WhatsAppAccount
from ..permissions import IsInboxStaff
from ..serializers import WhatsAppAccountSerializer
from ..services.base import MessagingServiceError
from ..services.whatsapp import WhatsAppService


class WhatsAppAccountListView(generics.ListAPIView):
    """List configured WhatsApp accounts (no access tokens in output)."""

    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]
    queryset = WhatsAppAccount.objects.all()
    serializer_class = WhatsAppAccountSerializer


class WhatsAppAccountCreateView(generics.CreateAPIView):
    """Create a WhatsApp account (owner/superadmin only; token is write-only)."""

    permission_classes = [permissions.IsAuthenticated, IsOwner]
    queryset = WhatsAppAccount.objects.all()
    serializer_class = WhatsAppAccountSerializer


class WhatsAppAccountDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get/update/delete a WhatsApp account (owner/superadmin only)."""

    permission_classes = [permissions.IsAuthenticated, IsOwner]
    queryset = WhatsAppAccount.objects.all()
    serializer_class = WhatsAppAccountSerializer


class WhatsAppAccountTestView(APIView):
    """Validate WhatsApp credentials against the Graph API.

    POST with ``pk`` tests a saved account; without ``pk`` tests draft
    credentials from the request body (nothing is saved). Owner/superadmin only.
    """

    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def post(self, request, pk=None):
        if pk:
            account = get_object_or_404(WhatsAppAccount, pk=pk)
        else:
            token = (request.data.get("access_token") or "").strip()
            if not token:
                return Response(
                    {"ok": False, "error": "Укажите access token для проверки"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            account = WhatsAppAccount(
                name="draft",
                business_account_id=(request.data.get("business_account_id") or "").strip(),
                phone_number_id=(request.data.get("phone_number_id") or "").strip(),
                display_phone_number=(request.data.get("display_phone_number") or "").strip(),
            )
            account.set_access_token(token)

        try:
            result = WhatsAppService(account).test_connection()
        except MessagingServiceError as exc:
            return Response(
                {"ok": False, "error": exc.user_message, "code": exc.code},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response(result)
