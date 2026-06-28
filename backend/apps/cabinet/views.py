from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsClient

from .models import ClientFeedback, ProjectMilestone, ProjectShareLink


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

        # Count pending approvals
        pending_approvals = ProjectMilestone.objects.filter(
            project__client=client,
            status="pending",
        ).exclude(
            project__status__name="Завершен"
        ).count()

        data = {
            "active_projects": active_projects,
            "total_documents": Document.objects.filter(client=client).count(),
            "open_invoices": Invoice.objects.filter(
                client=client, status__in=["sent", "draft"]
            ).count(),
            "unread_messages": 0,
            "pending_approvals": pending_approvals,
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
        data = []
        for p in projects:
            milestones = p.milestones.all()
            completed_milestones = milestones.filter(status="approved").count()
            total_milestones = milestones.count()
            data.append({
                "id": str(p.id),
                "name": p.name,
                "status_name": p.status.name,
                "status_color": p.status.color,
                "progress": p.progress,
                "deadline": p.deadline,
                "milestones": {
                    "total": total_milestones,
                    "completed": completed_milestones,
                    "pending": milestones.filter(status="pending").count(),
                },
            })
        return Response(data)


class CabinetProjectDetailView(APIView):
    """Client's project detail with milestones and feedback."""
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
        milestones = project.milestones.all().order_by("order")
        feedback = project.feedback.all().select_related("client")[:10]

        # Timeline data for Gantt-like view
        timeline = []
        for m in milestones:
            timeline.append({
                "id": str(m.id),
                "name": m.name,
                "status": m.status,
                "order": m.order,
                "due_date": m.due_date,
                "completed_date": m.completed_date,
                "rejection_reason": m.rejection_reason,
            })

        return Response({
            "id": str(project.id),
            "name": project.name,
            "description": project.description,
            "status_name": project.status.name,
            "status_color": project.status.color,
            "progress": project.progress,
            "budget": float(project.budget) if project.budget else None,
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
            "milestones": timeline,
            "feedback": [
                {
                    "id": str(f.id),
                    "content": f.content,
                    "feedback_type": f.feedback_type,
                    "rating": f.rating,
                    "created_at": f.created_at,
                }
                for f in feedback
            ],
        })


class CabinetMilestoneApproveView(APIView):
    """Client approves a milestone."""
    permission_classes = [IsAuthenticated, IsClient]

    def post(self, request, pk, milestone_pk):
        from apps.clients.models import Client
        client = Client.objects.filter(user=request.user).first()
        if not client:
            return Response({"error": "Профиль клиента не найден"}, status=404)

        from apps.projects.models import Project
        project = Project.objects.filter(pk=pk, client=client).first()
        if not project:
            return Response({"error": "Проект не найден"}, status=404)

        try:
            milestone = project.milestones.get(pk=milestone_pk)
        except ProjectMilestone.DoesNotExist:
            return Response({"error": "Этап не найден"}, status=404)

        milestone.status = ProjectMilestone.Status.APPROVED

        milestone.approved_by = request.user
        milestone.approved_at = timezone.now()
        milestone.completed_date = timezone.now().date()
        milestone.save()

        return Response({
            "id": str(milestone.id),
            "name": milestone.name,
            "status": milestone.status,
            "approved_at": milestone.approved_at,
        })


class CabinetMilestoneRejectView(APIView):
    """Client rejects a milestone with reason."""
    permission_classes = [IsAuthenticated, IsClient]

    def post(self, request, pk, milestone_pk):
        from apps.clients.models import Client
        client = Client.objects.filter(user=request.user).first()
        if not client:
            return Response({"error": "Профиль клиента не найден"}, status=404)

        from apps.projects.models import Project
        project = Project.objects.filter(pk=pk, client=client).first()
        if not project:
            return Response({"error": "Проект не найден"}, status=404)

        try:
            milestone = project.milestones.get(pk=milestone_pk)
        except ProjectMilestone.DoesNotExist:
            return Response({"error": "Этап не найден"}, status=404)

        reason = request.data.get("reason", "")
        milestone.status = ProjectMilestone.Status.REJECTED

        milestone.rejection_reason = reason
        milestone.save()

        return Response({
            "id": str(milestone.id),
            "name": milestone.name,
            "status": milestone.status,
            "rejection_reason": reason,
        })


class CabinetFeedbackCreateView(APIView):
    """Client submits feedback."""
    permission_classes = [IsAuthenticated, IsClient]

    def post(self, request, pk):
        from apps.clients.models import Client
        client = Client.objects.filter(user=request.user).first()
        if not client:
            return Response({"error": "Профиль клиента не найден"}, status=404)

        from apps.projects.models import Project
        project = Project.objects.filter(pk=pk, client=client).first()
        if not project:
            return Response({"error": "Проект не найден"}, status=404)

        milestone_pk = request.data.get("milestone_id")
        milestone = None
        if milestone_pk:
            try:
                milestone = project.milestones.get(pk=milestone_pk)
            except ProjectMilestone.DoesNotExist:
                pass

        feedback = ClientFeedback.objects.create(

            project=project,
            milestone=milestone,
            client=client,
            feedback_type=request.data.get("feedback_type", "general"),
            content=request.data.get("content", ""),
            rating=request.data.get("rating"),
            attachment_url=request.data.get("attachment_url", ""),
        )

        return Response({
            "id": str(feedback.id),
            "content": feedback.content,
            "feedback_type": feedback.feedback_type,
            "rating": feedback.rating,
            "created_at": feedback.created_at,
        }, status=201)


class CabinetShareLinkView(APIView):
    """Generate a shareable link for the project."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        from apps.projects.models import Project
        project = Project.objects.filter(pk=pk).first()
        if not project:
            return Response({"error": "Проект не найден"}, status=404)

        link = ProjectShareLink.objects.filter(
            project=project, is_active=True
        ).first()
        if not link:
            return Response(None, status=204)

        base_url = request.build_absolute_uri("/").rstrip("/")
        return Response({
            "id": str(link.id),
            "url": f"{base_url}/cabinet/shared/{link.token}",
            "token": link.token,
            "is_active": link.is_active,
            "expires_at": link.expires_at,
        })

    def post(self, request, pk):
        from apps.projects.models import Project
        project = Project.objects.filter(pk=pk).first()
        if not project:
            return Response({"error": "Проект не найден"}, status=404)

        # Deactivate old links
        ProjectShareLink.objects.filter(
            project=project, is_active=True
        ).update(is_active=False)

        link = ProjectShareLink.objects.create(
            project=project,
            created_by=request.user,
        )
        base_url = request.build_absolute_uri("/").rstrip("/")
        return Response({
            "id": str(link.id),
            "url": f"{base_url}/cabinet/shared/{link.token}",
            "token": link.token,
            "is_active": link.is_active,
        }, status=201)


class CabinetSharedProjectView(APIView):
    """Public view of a shared project (no auth required)."""
    permission_classes = []  # Public access

    def get(self, request, token):
        link = ProjectShareLink.objects.filter(
            token=token, is_active=True
        ).first()
        if not link:
            return Response(
                {"error": "Ссылка недействительна или истекла"},
                status=404,
            )
        if not link.is_valid():
            return Response(
                {"error": "Срок действия ссылки истек"},
                status=410,
            )

        project = link.project
        milestones = project.milestones.all().order_by("order")

        return Response({
            "project_name": project.name,
            "status_name": project.status.name,
            "status_color": project.status.color,
            "progress": project.progress,
            "deadline": project.deadline,
            "milestones": [
                {
                    "name": m.name,
                    "status": m.status,
                    "due_date": m.due_date,
                    "completed_date": m.completed_date,
                }
                for m in milestones
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
