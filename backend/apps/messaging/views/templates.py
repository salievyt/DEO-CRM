from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import WhatsAppAccount
from ..permissions import IsInboxStaff
from ..services.base import MessagingServiceError
from ..services.templates import get_cached_templates


class WhatsAppTemplateListView(APIView):
    """List approved/pending templates of a WABA (cached 5 minutes)."""

    permission_classes = [permissions.IsAuthenticated, IsInboxStaff]

    def get(self, request):
        account_id = request.query_params.get("account_id")
        account = None
        if account_id:
            account = WhatsAppAccount.objects.filter(pk=account_id).first()
        if account is None:
            account = WhatsAppAccount.get_default()
        if account is None:
            return Response(
                {"error": "Не настроен ни один WhatsApp аккаунт"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            templates = get_cached_templates(account)
        except MessagingServiceError as exc:
            return Response(
                {"error": exc.user_message, "code": exc.code},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"templates": templates})
