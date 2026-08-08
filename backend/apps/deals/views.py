"""API views for the deals app."""

from django.db.models import Count
from django.shortcuts import get_object_or_404
from django_filters import rest_framework as django_filters
from rest_framework import generics, status, views
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from common.pagination import StandardPagination

from .models import Deal, DealPayment, sync_deal_paid_amount
from .permissions import (
    CanCreateDeal,
    CanDeleteDeal,
    CanEditDeal,
    CanViewDeals,
)
from .serializers import (
    DealConvertSerializer,
    DealDetailSerializer,
    DealListSerializer,
    DealPaymentSerializer,
    DealStatusSerializer,
    DealWriteSerializer,
)
from .services import DealError, change_deal_status, convert_lead_to_deal, delete_deal


class DealListCreateView(generics.ListCreateAPIView):
    """List deals with filters / search / ordering / pagination."""

    pagination_class = StandardPagination
    filter_backends = [
        django_filters.DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]
    filterset_fields = ["status", "client", "assigned_to"]
    search_fields = ["number", "title", "lead__contact_name", "lead__company_name"]
    ordering_fields = ["created_at", "total", "status", "title"]
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanCreateDeal()]
        return [CanViewDeals()]

    def get_serializer_class(self):
        return DealListSerializer

    def get_queryset(self):
        return Deal.objects.select_related("client", "lead", "assigned_to").annotate(
            item_count=Count("items")
        )

    def post(self, request, *args, **kwargs):
        return self.convert(request)

    @staticmethod
    def convert(request):
        """Create a deal by converting an existing lead."""
        serializer = DealConvertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        from apps.leads.models import Lead

        lead = get_object_or_404(Lead, pk=data["lead"])
        try:
            deal = convert_lead_to_deal(
                user=request.user,
                lead=lead,
                items=data["items"],
                discount=data.get("discount") or 0,
                tax=data.get("tax") or 0,
                description=data.get("description", ""),
                assigned_to=data.get("assigned_to"),
            )
        except DealError as exc:
            payload = {"detail": str(exc)}
            if getattr(exc, "shortages", None):
                payload["shortages"] = exc.shortages
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            DealDetailSerializer(
                Deal.objects.select_related("client", "lead")
                .prefetch_related("items", "payments")
                .get(pk=deal.pk)
            ).data,
            status=status.HTTP_201_CREATED,
        )


class DealDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve / update / delete a deal."""

    lookup_field = "pk"

    def get_serializer_class(self):
        if self.request.method == "GET":
            return DealDetailSerializer
        return DealWriteSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [CanViewDeals()]
        if self.request.method == "DELETE":
            return [CanDeleteDeal()]
        return [CanEditDeal()]

    def get_queryset(self):
        return (
            Deal.objects.select_related("client", "lead", "assigned_to")
            .annotate(item_count=Count("items"))
            .prefetch_related("items", "payments", "documents")
        )

    def perform_destroy(self, instance):
        # Return stock of products sold by a won deal before removal
        delete_deal(self.request.user, instance)


class DealStatusView(views.APIView):
    """Transition a deal status (won/lost/cancelled...) with stock effects."""

    permission_classes = [CanEditDeal]

    def post(self, request, pk):
        deal = get_object_or_404(Deal.objects.annotate(item_count=Count("items")), pk=pk)
        serializer = DealStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            deal = change_deal_status(request.user, deal, serializer.validated_data["status"])
        except DealError as exc:
            payload = {"detail": str(exc)}
            if getattr(exc, "shortages", None):
                payload["shortages"] = exc.shortages
            return Response(payload, status=status.HTTP_400_BAD_REQUEST)
        return Response(DealListSerializer(deal).data)


class DealPaymentCreateView(views.APIView):
    """Register a payment against a deal."""

    permission_classes = [CanEditDeal]

    def post(self, request, pk):
        deal = get_object_or_404(Deal, pk=pk)
        serializer = DealPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        remaining = deal.total - deal.paid_amount
        if serializer.validated_data["amount"] > remaining:
            return Response(
                {"error": f"Платёж превышает остаток к оплате ({remaining})."},
                status=400,
            )
        payment = DealPayment.objects.create(
            deal=deal,
            amount=serializer.validated_data["amount"],
            method=serializer.validated_data["method"],
            transaction_id=serializer.validated_data.get("transaction_id", ""),
            notes=serializer.validated_data.get("notes", ""),
            created_by=request.user,
        )
        sync_deal_paid_amount(deal)
        return Response(
            DealPaymentSerializer(payment).data,
            status=status.HTTP_201_CREATED,
        )


class DealAttachDocumentView(views.APIView):
    """Link an existing document to a deal."""

    permission_classes = [CanEditDeal]

    def post(self, request, pk):
        from apps.documents.models import Document

        deal = get_object_or_404(Deal, pk=pk)
        document_id = request.data.get("document_id")
        if not document_id:
            return Response({"error": "document_id обязателен."}, status=400)
        document = get_object_or_404(Document, pk=document_id)
        if document.client_id and deal.client_id and document.client_id != deal.client_id:
            return Response(
                {"error": "Документ принадлежит другому клиенту."},
                status=400,
            )
        document.deal = deal
        document.save(update_fields=["deal"])
        return Response({"id": str(document.id), "title": document.title})


class DealAvailableLeadsView(views.APIView):
    """Leads that have not been converted into a deal yet."""

    permission_classes = [CanCreateDeal]

    def get(self, request):
        from apps.leads.models import Lead

        qs = (
            Lead.objects.filter(deal__isnull=True)
            .select_related("current_stage")
            .order_by("-created_at")[:200]
        )
        return Response(
            [
                {
                    "id": str(lead.id),
                    "contact_name": lead.contact_name,
                    "company_name": lead.company_name,
                    "phone": lead.phone,
                    "budget": lead.budget,
                    "stage_name": lead.current_stage.name,
                }
                for lead in qs
            ]
        )
