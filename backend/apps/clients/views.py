from django.db.models import Count, Q, Sum
from rest_framework import filters, generics, status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.finance.models import ClientPurchase, Invoice, Payment
from apps.leads.models import Lead
from apps.messenger.models import Message
from apps.projects.models import Project
from apps.tasks.models import Task
from common.pagination import StandardPagination
from common.permissions import IsAdmin, IsProjectManager

from .models import (
    Client,
    ClientInteraction,
    ClientStatus,
    ClientTag,
    ClientTagAssignment,
)
from .serializers import (
    ActivityItemSerializer,
    ClientCreateSerializer,
    ClientDetailSerializer,
    ClientInteractionSerializer,
    ClientListSerializer,
    ClientOverviewSerializer,
    ClientPurchaseCreateSerializer,
    ClientPurchaseSerializer,
    ClientStatusSerializer,
    ClientTagSerializer,
)
from .services import client_last_contact_at, compute_client_health


class ClientListCreateView(generics.ListCreateAPIView):
    """List all clients or create a new one."""
    permission_classes = [IsAuthenticated, IsProjectManager]
    search_fields = ["first_name", "last_name", "company_name", "email", "phone"]
    ordering_fields = ["created_at", "last_name", "company_name"]
    filterset_fields = ["is_active", "source"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ClientCreateSerializer
        return ClientListSerializer

    def get_queryset(self):
        qs = Client.objects.select_related("created_by").prefetch_related(
            "tag_assignments__tag"
        )
        # Filter by tag
        tag_id = self.request.query_params.get("tag")
        if tag_id:
            qs = qs.filter(tag_assignments__tag_id=tag_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ClientDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a client."""
    permission_classes = [IsAuthenticated, IsProjectManager]
    queryset = Client.objects.prefetch_related("tag_assignments__tag").all()
    serializer_class = ClientDetailSerializer


class ClientStatsView(views.APIView):
    """Client statistics for dashboard."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        total = Client.objects.count()
        active = Client.objects.filter(is_active=True).count()
        by_source = Client.objects.values("source").annotate(
            count=Count("id")
        ).order_by("-count")
        return Response({
            "total": total,
            "active": active,
            "by_source": by_source,
        })


class ClientInteractionListView(generics.ListCreateAPIView):
    """List or create interactions for a client."""
    permission_classes = [IsAuthenticated, IsProjectManager]
    serializer_class = ClientInteractionSerializer

    def get_queryset(self):
        return ClientInteraction.objects.filter(
            client_id=self.kwargs["client_pk"]
        ).select_related("user").order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(
            client_id=self.kwargs["client_pk"],
            user=self.request.user,
        )


class ClientTagListView(generics.ListCreateAPIView):
    """List and create client tags."""
    permission_classes = [IsAuthenticated]
    queryset = ClientTag.objects.all().order_by("name")
    serializer_class = ClientTagSerializer


class ClientTagDeleteView(generics.DestroyAPIView):
    """Delete a client tag."""
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = ClientTag.objects.all()
    serializer_class = ClientTagSerializer


class ClientAssignTagsView(views.APIView):
    """Assign tags to a client."""
    permission_classes = [IsAuthenticated, IsProjectManager]

    def post(self, request, client_pk):
        try:
            client = Client.objects.get(pk=client_pk)
        except Client.DoesNotExist:
            return Response({"error": "Клиент не найден"}, status=404)

        tag_ids = request.data.get("tags", [])
        for tag_id in tag_ids:
            try:
                tag = ClientTag.objects.get(pk=tag_id)
                ClientTagAssignment.objects.get_or_create(client=client, tag=tag)
            except ClientTag.DoesNotExist:
                pass
        return Response({"status": "ok"})

    def delete(self, request, client_pk, tag_pk):
        try:
            assignment = ClientTagAssignment.objects.get(
                client_id=client_pk, tag_id=tag_pk
            )
            assignment.delete()
            return Response(status=204)
        except ClientTagAssignment.DoesNotExist:
            return Response({"error": "Тег не назначен клиенту"}, status=404)


class ClientStatusListView(generics.ListCreateAPIView):
    """List or create client statuses."""
    permission_classes = [IsAuthenticated, IsProjectManager]
    queryset = ClientStatus.objects.all()
    serializer_class = ClientStatusSerializer
    pagination_class = None


class ClientStatusDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Update or delete a client status."""
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = ClientStatus.objects.all()
    serializer_class = ClientStatusSerializer


class ClientPurchaseListView(generics.ListCreateAPIView):
    """List or create purchases for a client."""
    permission_classes = [IsAuthenticated, IsProjectManager]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ClientPurchaseCreateSerializer
        return ClientPurchaseSerializer

    def get_queryset(self):
        return ClientPurchase.objects.filter(
            client_id=self.kwargs["client_pk"]
        ).select_related("product", "invoice").order_by("-purchased_at")

    def perform_create(self, serializer):
        serializer.save(
            client_id=self.kwargs["client_pk"],
            created_by=self.request.user,
        )


class ClientOverviewView(views.APIView):
    """Aggregated Client 360 overview: summary, status, health, counts.

    Per-tab detail is fetched lazily by dedicated list endpoints.
    """
    permission_classes = [IsAuthenticated, IsProjectManager]

    def get(self, request, client_pk):
        try:
            client = Client.objects.prefetch_related(
                "tag_assignments__tag"
            ).get(pk=client_pk)
        except Client.DoesNotExist:
            return Response({"error": "Клиент не найден"}, status=404)

        # Deals are leads in the sales pipeline
        leads = Lead.objects.filter(client=client)
        active_deals = leads.filter(is_active=True)
        won_deals = active_deals.filter(current_stage__probability=100)
        lost_deals = leads.filter(is_active=False)

        budgets = list(
            active_deals.exclude(budget=None).values_list("budget", flat=True)
        )
        avg_deal_size = (
            sum(budgets) / len(budgets) if budgets else 0
        )

        paid_total = Invoice.objects.filter(
            client=client, status="paid"
        ).aggregate(total=Sum("amount"))["total"] or 0

        last_contact = client_last_contact_at(client)

        next_deal = active_deals.exclude(
            next_action_at=None
        ).order_by("next_action_at").first()

        summary = {
            "total_revenue": f"{paid_total:.2f}",
            "deals_total": leads.count(),
            "deals_active": active_deals.count(),
            "deals_won": won_deals.count(),
            "deals_lost": lost_deals.count(),
            "avg_deal_size": f"{round(avg_deal_size, 2):.2f}",
            "current_stage": (
                next_deal.current_stage.name if next_deal else None
            ),
            "last_contact": last_contact.isoformat() if last_contact else None,
            "next_action": next_deal.next_action if next_deal else None,
            "next_action_at": (
                next_deal.next_action_at.isoformat()
                if next_deal and next_deal.next_action_at else None
            ),
        }

        counts = {
            "interactions": client.interactions.count(),
            "deals": leads.count(),
            "projects": client.projects.count(),
            "tasks": Task.objects.filter(project__client=client).count(),
            "documents": client.documents.count(),
            "invoices": client.invoices.count(),
            "payments": Payment.objects.filter(invoice__client=client).count(),
            "purchases": client.purchases.count(),
            "messages": Message.objects.filter(
                chat__participants__client=client
            ).count(),
        }

        return Response(ClientOverviewSerializer({
            "client": client,
            "summary": summary,
            "counts": counts,
        }).data)


def _build_activity_items(client, limit_per_source=100):
    """Merge related activity sources into a unified timeline.

    Returns a plain list of dicts sorted by timestamp descending.
    `limit_per_source` keeps the merge cheap for lazy-loaded tabs.
    """
    from apps.clients.models import ClientInteraction
    from apps.documents.models import Document
    from apps.finance.models import ClientPurchase, Invoice, Payment
    from apps.leads.models import Lead
    from apps.messenger.models import Message
    from apps.projects.models import Project
    from apps.tasks.models import Task

    items = []

    for obj in ClientInteraction.objects.filter(client=client).select_related("user")[:limit_per_source]:
        items.append({
            "id": obj.id,
            "entity_type": "interaction",
            "title": obj.get_type_display(),
            "description": obj.description,
            "actor": obj.user.get_full_name() if obj.user else "",
            "ref_id": obj.id,
            "ref_label": obj.get_type_display(),
            "timestamp": obj.created_at,
            "meta": {"type": obj.type},
        })

    for obj in Lead.objects.filter(client=client).select_related(
        "current_stage", "created_by", "assigned_to"
    )[:limit_per_source]:
        items.append({
            "id": obj.id,
            "entity_type": "deal",
            "title": obj.contact_name,
            "description": obj.notes,
            "actor": (
                obj.assigned_to.get_full_name()
                if obj.assigned_to else
                obj.created_by.get_full_name() if obj.created_by else ""
            ),
            "ref_id": obj.id,
            "ref_label": obj.current_stage.name,
            "timestamp": obj.created_at,
            "meta": {"stage": obj.current_stage.name, "budget": str(obj.budget) if obj.budget else None},
        })

    for obj in Project.objects.filter(client=client).select_related("status", "created_by")[:limit_per_source]:
        items.append({
            "id": obj.id,
            "entity_type": "project",
            "title": obj.name,
            "description": obj.description,
            "actor": obj.created_by.get_full_name() if obj.created_by else "",
            "ref_id": obj.id,
            "ref_label": obj.status.name,
            "timestamp": obj.created_at,
            "meta": {"status": obj.status.name, "progress": obj.progress},
        })

    for obj in Task.objects.filter(project__client=client).select_related(
        "project", "status", "assignee", "created_by"
    )[:limit_per_source]:
        items.append({
            "id": obj.id,
            "entity_type": "task",
            "title": obj.title,
            "description": obj.description,
            "actor": (
                obj.assignee.get_full_name()
                if obj.assignee else
                obj.created_by.get_full_name() if obj.created_by else ""
            ),
            "ref_id": obj.id,
            "ref_label": obj.project.name,
            "timestamp": obj.created_at,
            "meta": {"status": obj.status.name, "deadline": obj.deadline.isoformat() if obj.deadline else None},
        })

    for obj in Invoice.objects.filter(client=client).select_related("created_by")[:limit_per_source]:
        items.append({
            "id": obj.id,
            "entity_type": "invoice",
            "title": f"Счет {obj.number}",
            "description": obj.description,
            "actor": obj.created_by.get_full_name() if obj.created_by else "",
            "ref_id": obj.id,
            "ref_label": obj.get_status_display(),
            "timestamp": obj.created_at,
            "meta": {"status": obj.status, "amount": str(obj.amount)},
        })

    for obj in Payment.objects.filter(invoice__client=client).select_related("invoice")[:limit_per_source]:
        items.append({
            "id": obj.id,
            "entity_type": "payment",
            "title": f"Оплата {obj.get_method_display()}",
            "description": obj.notes,
            "actor": "",
            "ref_id": obj.id,
            "ref_label": obj.invoice.number if obj.invoice else "",
            "timestamp": obj.paid_at,
            "meta": {"amount": str(obj.amount), "method": obj.method},
        })

    for obj in Document.objects.filter(client=client).select_related("document_type", "created_by")[:limit_per_source]:
        items.append({
            "id": obj.id,
            "entity_type": "document",
            "title": obj.title,
            "description": obj.file_name,
            "actor": obj.created_by.get_full_name() if obj.created_by else "",
            "ref_id": obj.id,
            "ref_label": obj.document_type.name,
            "timestamp": obj.created_at,
            "meta": {"type": obj.document_type.name, "status": obj.status},
        })

    for obj in ClientPurchase.objects.filter(client=client).select_related("product", "created_by")[:limit_per_source]:
        items.append({
            "id": obj.id,
            "entity_type": "purchase",
            "title": f"Покупка: {obj.product.name}",
            "description": "",
            "actor": obj.created_by.get_full_name() if obj.created_by else "",
            "ref_id": obj.id,
            "ref_label": obj.product.name,
            "timestamp": obj.purchased_at,
            "meta": {"quantity": str(obj.quantity), "amount": str(obj.total_price)},
        })

    for obj in Message.objects.filter(
        chat__participants__client=client
    ).select_related("sender", "client_sender", "chat")[:limit_per_source]:
        items.append({
            "id": obj.id,
            "entity_type": "message",
            "title": obj.sender.get_full_name() if obj.sender else (
                obj.client_sender.full_name if obj.client_sender else "Сообщение"
            ),
            "description": obj.content,
            "actor": obj.sender.get_full_name() if obj.sender else (
                obj.client_sender.full_name if obj.client_sender else ""
            ),
            "ref_id": obj.id,
            "ref_label": obj.chat.name or "Чат",
            "timestamp": obj.created_at,
            "meta": {"chat": str(obj.chat.id)},
        })

    items.sort(key=lambda item: item["timestamp"], reverse=True)
    return items


class ClientActivityView(views.APIView):
    """Unified paginated activity timeline for a client.

    Merge of interactions, deals, projects, tasks, invoices, payments,
    documents, purchases and chat messages, ordered newest first.
    """
    permission_classes = [IsAuthenticated, IsProjectManager]
    pagination_class = StandardPagination

    def get(self, request, client_pk):
        if not Client.objects.filter(pk=client_pk).exists():
            return Response({"error": "Клиент не найден"}, status=404)

        items = _build_activity_items(
            Client.objects.get(pk=client_pk)
        )
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(items, request, view=self)
        return paginator.get_paginated_response(
            ActivityItemSerializer(page, many=True).data
        )
