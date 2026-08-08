from rest_framework import generics, permissions

from common.permissions import IsAdmin

from ..models import WhatsAppAccount
from ..permissions import IsInboxStaff
from ..serializers import WhatsAppAccountSerializer


class WhatsAppAccountListView(generics.ListAPIView):
    """List configured WhatsApp accounts (no access tokens in output)."""

    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]
    queryset = WhatsAppAccount.objects.all()
    serializer_class = WhatsAppAccountSerializer


class WhatsAppAccountCreateView(generics.CreateAPIView):
    """Create a WhatsApp account (admin only; token is write-only)."""

    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = WhatsAppAccount.objects.all()
    serializer_class = WhatsAppAccountSerializer


class WhatsAppAccountDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = WhatsAppAccount.objects.all()
    serializer_class = WhatsAppAccountSerializer
