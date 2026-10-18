from django.db.models import Q
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ClientFeedback, ProjectMilestone, ProjectShareLink

# Statuses that mean a project is no longer active. The seeded data contains
# both the "ё" and "е" spellings, so both variants are handled.
FINISHED_STATUS_NAMES = ("Завершен", "Завершён", "Отменен", "Отменён")

# Invoice statuses that are still open (i.e. not paid / cancelled).
OPEN_INVOICE_STATUSES = ("draft", "sent", "overdue")


def _is_client(user):
    return bool(user.role and user.role.name == "client")


def _get_client(user):
    """Client profile linked to the user, if any.

    Falls back to matching an unlinked client card by email so client accounts
    still see their data when the link was not set explicitly.
    """
    from apps.clients.models import Client

    client = Client.objects.filter(user=user).first()
    if client is None and user.email:
        client = Client.objects.filter(
            user__isnull=True, email__iexact=user.email
        ).first()
    return client


def _client_profile(user):
    """Client profile for client-role users, otherwise ``None``."""
    return _get_client(user) if _is_client(user) else None


def _visible_projects(user):
    """Projects a user may see in their cabinet.

    - clients see only their own projects;
    - project managers and above see the whole portfolio;
    - other staff see projects they participate in or created.
    """
    from apps.projects.models import Project

    if _is_client(user):
        client = _get_client(user)
        if not client:
            return Project.objects.none()
        return Project.objects.filter(client=client)

    role = user.role.name if user.role else ""
    if role in ("superadmin", "owner", "project_manager"):
        return Project.objects.all()

    return Project.objects.filter(
        Q(team__user=user) | Q(created_by=user)
    ).distinct()


def _visible_documents(user):
    """Documents a user may see in their cabinet."""
    from apps.documents.models import Document

    if _is_client(user):
        client = _get_client(user)
        if not client:
            return Document.objects.none()
        return Document.objects.filter(client=client, is_visible_to_client=True)

    projects = _visible_projects(user)
    qs = Document.objects.filter(
        Q(project__in=projects) | Q(created_by=user)
    ).distinct().select_related("document_type")
    return qs


def _visible_invoices(user):
    """Invoices a user may see in their cabinet."""
    from apps.finance.models import Invoice

    if _is_client(user):
        client = _get_client(user)
        if not client:
            return Invoice.objects.none()
        return Invoice.objects.filter(client=client)

    projects = _visible_projects(user)
    return Invoice.objects.filter(
        Q(project__in=projects) | Q(created_by=user)
    ).distinct()


def _visible_chats(user):
    """Chats a user takes part in."""
    from apps.messenger.models import Chat

    if _is_client(user):
        client = _get_client(user)
        if not client:
            return Chat.objects.none()
        return Chat.objects.filter(participants__client=client).distinct()

    return Chat.objects.filter(participants__user=user).distinct()


def _unread_messages(user):
    """Number of unread incoming messages for a user."""
    from apps.messenger.models import ChatParticipant, Message

    if _is_client(user):
        client = _get_client(user)
        if not client:
            return 0
        participants = ChatParticipant.objects.filter(client=client)
        own = Q(client_sender=client)
        if client.user_id:
            own |= Q(sender_id=client.user_id)
    else:
        participants = ChatParticipant.objects.filter(user=user)
        own = Q(sender=user)

    total = 0
    for participant in participants.select_related("chat"):
        messages = Message.objects.filter(chat_id=participant.chat_id).exclude(own)
        if participant.last_read_at:
            messages = messages.filter(created_at__gt=participant.last_read_at)
        total += messages.count()
    return total


def _message_sender_name(message):
    if message.sender:
        full_name = message.sender.get_full_name()
        return full_name or message.sender.email
    if message.client_sender:
        return message.client_sender.full_name
    return "Клиент"


class CabinetDashboardView(APIView):
    """Cabinet overview: numbers scoped to what the current user can see."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.finance.models import Invoice

        projects = _visible_projects(request.user)

        active_projects = projects.exclude(
            status__name__in=FINISHED_STATUS_NAMES
        ).count()

        pending_approvals = ProjectMilestone.objects.filter(
            project__in=projects,
            status=ProjectMilestone.Status.PENDING,
        ).count()

        data = {
            "active_projects": active_projects,
            "total_documents": _visible_documents(request.user).count(),
            "open_invoices": _visible_invoices(request.user).filter(
                status__in=OPEN_INVOICE_STATUSES
            ).count(),
            "unread_messages": _unread_messages(request.user),
            "pending_approvals": pending_approvals,
        }
        return Response(data)


class CabinetProjectsView(APIView):
    """Projects visible to the current user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        projects = _visible_projects(request.user).select_related("status")
        data = []
        for p in projects:
            milestones = p.milestones.all()
            completed_milestones = milestones.filter(
                status=ProjectMilestone.Status.APPROVED
            ).count()
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
                    "pending": milestones.filter(
                        status=ProjectMilestone.Status.PENDING
                    ).count(),
                },
            })
        return Response(data)


class CabinetProjectDetailView(APIView):
    """Project detail with milestones and feedback."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        from apps.tasks.models import Task

        project = _visible_projects(request.user).filter(
            pk=pk
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
    """Approve a milestone."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, milestone_pk):
        project = _visible_projects(request.user).filter(pk=pk).first()
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
    """Reject a milestone with reason."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, milestone_pk):
        project = _visible_projects(request.user).filter(pk=pk).first()
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
    """Submit feedback on a project."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        project = _visible_projects(request.user).filter(pk=pk).first()
        if not project:
            return Response({"error": "Проект не найден"}, status=404)

        content = (request.data.get("content") or "").strip()
        if not content:
            return Response({"error": "Текст отзыва не может быть пустым"}, status=400)

        # Client-role users are attributed to their own profile, staff feedback
        # is attributed to the project's client.
        client = _client_profile(request.user) or project.client

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
            content=content,
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
    """Generate a shareable link for a project the user can see."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        project = _visible_projects(request.user).filter(pk=pk).first()
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
        project = _visible_projects(request.user).filter(pk=pk).first()
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
    """Documents visible to the current user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        docs = _visible_documents(request.user)
        return Response([
            {
                "id": str(d.id),
                "title": d.title,
                "type_name": d.document_type.name,
                "status": d.status,
                "file": d.file.url if d.file else d.external_url,
                "file_name": d.file_name,
                "mime_type": d.mime_type,
                "file_size": d.file_size,
                "created_at": d.created_at,
            }
            for d in docs
        ])


class CabinetInvoicesView(APIView):
    """Invoices visible to the current user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        invoices = _visible_invoices(request.user).order_by("-created_at")
        return Response([
            {
                "id": str(i.id),
                "number": i.number,
                "amount": i.amount,
                "paid_amount": i.paid_amount,
                "status": i.status,
                "description": i.description,
                "issued_date": i.issued_date,
                "due_date": i.due_date,
                "paid_at": i.paid_at,
            }
            for i in invoices
        ])


class CabinetPaymentsView(APIView):
    """Payment history visible to the current user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.finance.models import Payment

        payments = Payment.objects.filter(
            invoice__in=_visible_invoices(request.user)
        ).select_related("invoice").order_by("-paid_at")
        return Response([
            {
                "id": str(p.id),
                "invoice_number": p.invoice.number,
                "amount": p.amount,
                "method": p.method,
                "notes": p.notes,
                "paid_at": p.paid_at,
            }
            for p in payments
        ])


class CabinetMessagesView(APIView):
    """Messages in the current user's chats."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.messenger.models import Message

        chats = _visible_chats(request.user)
        messages = Message.objects.filter(
            chat__in=chats
        ).select_related("sender", "client_sender").order_by("-created_at")[:50]

        return Response([
            {
                "id": str(m.id),
                "content": m.content,
                "sender_name": _message_sender_name(m),
                "created_at": m.created_at,
            }
            for m in messages
        ])

    def post(self, request):
        from apps.messenger.models import Chat, ChatParticipant, Message

        content = (request.data.get("content") or "").strip()
        if not content:
            return Response({"error": "Сообщение не может быть пустым"}, status=400)

        client = _client_profile(request.user)
        if client is not None:
            chat = Chat.objects.filter(
                participants__client=client,
                is_group=False,
            ).first()
            if not chat:
                chat = Chat.objects.create(
                    name=f"Чат с {client.full_name}",
                    is_group=False,
                )
                ChatParticipant.objects.create(chat=chat, client=client)
            message = Message.objects.create(
                chat=chat,
                client_sender=client,
                content=content,
            )
        else:
            chat = Chat.objects.filter(
                participants__user=request.user,
                is_group=False,
            ).first()
            if not chat:
                chat = Chat.objects.create(name="Чат", is_group=False)
                ChatParticipant.objects.create(chat=chat, user=request.user)
            message = Message.objects.create(
                chat=chat,
                sender=request.user,
                content=content,
            )

        return Response({
            "id": str(message.id),
            "content": message.content,
            "sender_name": _message_sender_name(message),
            "created_at": message.created_at,
        }, status=201)
