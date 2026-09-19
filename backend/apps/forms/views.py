from django.db import transaction
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import APIException, NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsOwner

from .models import FormInvitation, FormTemplate
from .serializers import (
    FormInvitationCreateSerializer,
    FormInvitationSerializer,
    FormTemplateSerializer,
)


class TokenGone(APIException):
    status_code = status.HTTP_410_GONE
    default_detail = "Ссылка истекла."
    default_code = "gone"


class FormTemplateListCreateView(generics.ListCreateAPIView):
    """List and create form templates (admin section)."""

    permission_classes = [permissions.IsAuthenticated, IsOwner]
    serializer_class = FormTemplateSerializer

    def get_queryset(self):
        qs = FormTemplate.objects.all().select_related("created_by")
        entity_type = self.request.query_params.get("entity_type")
        if entity_type in FormTemplate.EntityType.values:
            qs = qs.filter(entity_type=entity_type)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class FormTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    serializer_class = FormTemplateSerializer
    queryset = FormTemplate.objects.all()


class InvitationListCreateView(generics.ListCreateAPIView):
    """Generated links for forms."""

    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        qs = FormInvitation.objects.all().select_related("form", "created_by")
        form_id = self.request.query_params.get("form")
        if form_id:
            qs = qs.filter(form_id=form_id)
        status_filter = self.request.query_params.get("status")
        if status_filter in FormInvitation.Status.values:
            qs = qs.filter(status=status_filter)
        return qs

    def get_serializer_class(self):
        if self.request.method == "POST":
            return FormInvitationCreateSerializer
        return FormInvitationSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class InvitationDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    serializer_class = FormInvitationSerializer
    queryset = FormInvitation.objects.all()


class PublicFormView(APIView):
    """Anonymous endpoint for filling in a form via its token link."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        form = self._get_usable_form(token)
        return Response(
            {
                "form": FormTemplateSerializer(form).data,
                "invitation": {
                    "id": str(form.id),
                    "token": str(form.public_token),
                    "recipient_name": "",
                    "entity_type": form.entity_type,
                    "status": FormInvitation.Status.SENT,
                },
            }
        )

    def post(self, request, token):
        form = self._get_usable_form(token)
        response = request.data.get("response")
        if not isinstance(response, dict):
            return Response(
                {"detail": "Поле response должно быть объектом."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            invitation = FormInvitation.objects.create(
                form=form,
                entity_type=form.entity_type,
                response=response,
                status=FormInvitation.Status.FILLED,
                submitted_at=timezone.now(),
            )
        return Response(
            {"detail": "Ответ сохранён.", "id": str(invitation.id)},
            status=status.HTTP_200_OK,
        )

    def _get_usable_form(self, token):
        try:
            form = FormTemplate.objects.get(public_token=token)
        except (FormTemplate.DoesNotExist, ValueError):
            raise NotFound({"detail": "Ссылка не найдена или неактивна."})
        if not form.is_active:
            raise NotFound({"detail": "Ссылка не найдена или неактивна."})
        if form.is_public_link_expired():
            raise TokenGone()
        return form
