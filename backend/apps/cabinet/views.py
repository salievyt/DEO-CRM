from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsClient


class CabinetDashboardView(APIView):
    """Client's main dashboard."""
    permission_classes = [IsAuthenticated, IsClient]

    def get(self, request):
        from apps.clients.models import Client
        client = Client.objects.filter(user=request.user).first()
        if not client:
            return Response({"error": "Профиль клиента не найден"}, status=404)

        from apps.projects.models import Project
        from apps.finance.models import Invoice
        from apps.documents.models import Document

        active_projects = Project.objects.filter(
            client=client
        ).exclude(status__name="Завершен").count()

        data = {
            "active_projects": active_projects,
            "total_documents": Document.objects.filter(client=client).count(),
            "open_invoices": Invoice.objects.filter(
                client=client, status__in=["sent", "draft"]
            ).count(),
            "unread_messages": 0,  # Simplified
        }
        return Response(data)


class CabinetProjectsView(APIView):
    """Client's projects list."""
    permission_classes = [IsAuthenticated, IsClient]

    def get(self, request):
        from apps.clients.models import Client
        client = Client.objects.filter(user=request.user).first()
        if not client:
            return Response({"error": "Профиль клиента не найден"}, status=404)

        from apps.projects.models import Project
        projects = Project.objects.filter(client=client).select_related("status")
        data = [
            {
                "id": str(p.id),
                "name": p.name,
                "status_name": p.status.name,
                "status_color": p.status.color,
                "progress": p.progress,
                "deadline": p.deadline,
            }
            for p in projects
        ]
        return Response(data)


class CabinetProjectDetailView(APIView):
    """Client's project detail."""
    permission_classes = [IsAuthenticated, IsClient]

    def get(self, request, pk):
        from apps.clients.models import Client
        client = Client.objects.filter(user=request.user).first()
        if not client:
            return Response({"error": "Профиль клиента не найден"}, status=404)

        from apps.projects.models import Project
        from apps.tasks.models import Task
        project = Project.objects.filter(
            pk=pk, client=client
        ).select_related("status").first()
        if not project:
            return Response({"error": "Проект не найден"}, status=404)

        tasks = Task.objects.filter(project=project).select_related("status")
        return Response({
            "id": str(project.id),
            "name": project.name,
            "description": project.description,
            "status_name": project.status.name,
            "status_color": project.status.color,
            "progress": project.progress,
            "deadline": project.deadline,
            "tasks": [
                {
                    "id": str(t.id),
                    "title": t.title,
                    "status_name": t.status.name,
                    "status_color": t.status.color,
                }
                for t in tasks
            ],
        })


class CabinetDocumentsView(APIView):
    """Client's documents."""
    permission_classes = [IsAuthenticated, IsClient]

    def get(self, request):
        from apps.clients.models import Client
        client = Client.objects.filter(user=request.user).first()
        if not client:
            return Response({"error": "Профиль клиента не найден"}, status=404)

        from apps.documents.models import Document
        docs = Document.objects.filter(client=client).select_related("document_type")
        return Response([
            {
                "id": str(d.id),
                "title": d.title,
                "type_name": d.document_type.name,
                "status": d.status,
                "created_at": d.created_at,
            }
            for d in docs
        ])


class CabinetInvoicesView(APIView):
    """Client's invoices."""
    permission_classes = [IsAuthenticated, IsClient]

    def get(self, request):
        from apps.clients.models import Client
        client = Client.objects.filter(user=request.user).first()
        if not client:
            return Response({"error": "Профиль клиента не найден"}, status=404)

        from apps.finance.models import Invoice
        invoices = Invoice.objects.filter(client=client).order_by("-created_at")
        return Response([
            {
                "id": str(i.id),
                "number": i.number,
                "amount": i.amount,
                "status": i.status,
                "issued_date": i.issued_date,
                "due_date": i.due_date,
            }
            for i in invoices
        ])


class CabinetPaymentsView(APIView):
    """Client's payment history."""
    permission_classes = [IsAuthenticated, IsClient]

    def get(self, request):
        from apps.clients.models import Client
        client = Client.objects.filter(user=request.user).first()
        if not client:
            return Response({"error": "Профиль клиента не найден"}, status=404)

        from apps.finance.models import Payment
        payments = Payment.objects.filter(
            invoice__client=client
        ).select_related("invoice").order_by("-paid_at")
        return Response([
            {
                "id": str(p.id),
                "invoice_number": p.invoice.number,
                "amount": p.amount,
                "method": p.method,
                "paid_at": p.paid_at,
            }
            for p in payments
        ])


class CabinetMessagesView(APIView):
    """Client's messages with their manager."""
    permission_classes = [IsAuthenticated, IsClient]

    def get(self, request):
        from apps.clients.models import Client
        client = Client.objects.filter(user=request.user).first()
        if not client:
            return Response({"error": "Профиль клиента не найден"}, status=404)

        from apps.messenger.models import Message
        # Get messages where client is participant (via chat participants)
        messages = Message.objects.filter(
            chat__participants__client=client
        ).select_related("sender").order_by("-created_at")[:50]

        return Response([
            {
                "id": str(m.id),
                "content": m.content,
                "sender_name": m.sender.get_full_name() if m.sender else "Клиент",
                "created_at": m.created_at,
            }
            for m in messages
        ])

    def post(self, request):
        from apps.clients.models import Client
        client = Client.objects.filter(user=request.user).first()
        if not client:
            return Response({"error": "Профиль клиента не найден"}, status=404)

        from apps.messenger.models import Chat, Message
        # Find or create a chat with the client's PM
        chat = Chat.objects.filter(
            participants__client=client,
            is_group=False,
        ).first()
        if not chat:
            # Create a new chat for the client
            chat = Chat.objects.create(
                name=f"Чат с {client.full_name}",
                is_group=False,
            )
            from apps.messenger.models import ChatParticipant
            # Add client as participant
            ChatParticipant.objects.create(chat=chat, client=client)

        message = Message.objects.create(
            chat=chat,
            client_sender=client,
            content=request.data.get("content", ""),
        )
        return Response({
            "id": str(message.id),
            "content": message.content,
            "created_at": message.created_at,
        }, status=201)
