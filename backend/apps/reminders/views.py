from datetime import datetime, time as dtime, timedelta

from django.utils import timezone
from rest_framework import generics, permissions, status, views
from rest_framework.response import Response

from common.permissions import IsAdmin

from .models import Reminder, ReminderLog, ReminderRule, ReminderStatus
from .serializers import (
    ReminderLogSerializer,
    ReminderRuleSerializer,
    ReminderSerializer,
    ReminderSnoozeSerializer,
)

ACTIVE_STATUSES = [ReminderStatus.PENDING, ReminderStatus.VIEWED]


class ReminderListView(generics.ListAPIView):
    """List reminders for the current user (Notification Center).

    Filters (query param ``filter``):
    - ``all`` — active reminders (default)
    - ``today`` — due today
    - ``overdue`` — due in the past
    - ``clients`` / ``deals`` / ``tasks`` — reminders about the entity kind

    ``status`` overrides the default ``pending/viewed`` status filter.
    Snoozed reminders are hidden until their ``snoozed_until`` passes.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ReminderSerializer

    def get_queryset(self):
        now = timezone.now()
        qs = (
            Reminder.objects.filter(user=self.request.user)
            .select_related("client", "deal", "deal__client", "task", "invoice", "rule")
        )

        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        else:
            qs = qs.filter(status__in=ACTIVE_STATUSES)

        # Hide snoozed reminders until they are due again.
        qs = qs.exclude(snoozed_until__gt=now)

        filter_type = self.request.query_params.get("filter")
        if filter_type == "today":
            start = timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)
            qs = qs.filter(due_at__gte=start, due_at__lt=start + timedelta(days=1))
        elif filter_type == "overdue":
            qs = qs.filter(due_at__lt=now)
        elif filter_type == "clients":
            qs = qs.filter(client__isnull=False)
        elif filter_type == "deals":
            qs = qs.filter(deal__isnull=False)
        elif filter_type == "tasks":
            qs = qs.filter(task__isnull=False)

        return qs


class ReminderSummaryView(views.APIView):
    """Widget data for the Notification Center ("Сегодня" section)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        start = timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)

        base = Reminder.objects.filter(
            user=request.user, status__in=ACTIVE_STATUSES
        ).exclude(snoozed_until__gt=now)

        today_qs = base.filter(due_at__gte=start, due_at__lt=end)

        return Response({
            "today": {
                "total": today_qs.count(),
                "important": today_qs.filter(priority__in=["high", "critical"]).count(),
                "tasks": today_qs.filter(task__isnull=False).count(),
                "overdue": base.filter(due_at__lt=now).count(),
            },
            "pending_total": base.count(),
            "snoozed": base.filter(snoozed_until__isnull=False).count(),
        })


class _ReminderActionBase(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    action = None

    def get_reminder(self, request, pk):
        return Reminder.objects.filter(pk=pk, user=request.user).first()

    def post(self, request, pk):
        reminder = self.get_reminder(request, pk)
        if reminder is None:
            return Response({"error": "Напоминание не найдено"}, status=status.HTTP_404_NOT_FOUND)
        return self.perform(request, reminder)

    def perform(self, request, reminder):
        raise NotImplementedError


class ReminderMarkViewedView(_ReminderActionBase):
    """Mark reminder as viewed (idempotent)."""

    action = ReminderLog.Actions.VIEWED

    def perform(self, request, reminder):
        if reminder.status == ReminderStatus.PENDING:
            reminder.status = ReminderStatus.VIEWED
            reminder.save(update_fields=["status"])
            ReminderLog.objects.create(
                reminder=reminder, actor=request.user, action=self.action
            )
        return Response(ReminderSerializer(reminder).data)


class ReminderCompleteView(_ReminderActionBase):
    """Mark reminder as completed."""

    action = ReminderLog.Actions.COMPLETED

    def perform(self, request, reminder):
        if reminder.status not in (ReminderStatus.COMPLETED, ReminderStatus.DISMISSED, ReminderStatus.EXPIRED):
            reminder.status = ReminderStatus.COMPLETED
            reminder.completed_at = timezone.now()
            reminder.save(update_fields=["status", "completed_at"])
            ReminderLog.objects.create(
                reminder=reminder, actor=request.user, action=self.action
            )
        return Response(ReminderSerializer(reminder).data)


class ReminderDismissView(_ReminderActionBase):
    """Dismiss reminder."""

    action = ReminderLog.Actions.DISMISSED

    def perform(self, request, reminder):
        if reminder.status not in (ReminderStatus.DISMISSED, ReminderStatus.EXPIRED):
            reminder.status = ReminderStatus.DISMISSED
            reminder.dismissed_at = timezone.now()
            reminder.save(update_fields=["status", "dismissed_at"])
            ReminderLog.objects.create(
                reminder=reminder, actor=request.user, action=self.action
            )
        return Response(ReminderSerializer(reminder).data)


class ReminderSnoozeView(_ReminderActionBase):
    """Snooze reminder: 1 час / сегодня / завтра / неделя / custom date."""

    action = ReminderLog.Actions.SNOOZED

    def perform(self, request, reminder):
        serializer = ReminderSnoozeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        period = serializer.validated_data.get("period")
        custom_at = serializer.validated_data.get("custom_at")
        now = timezone.now()

        if period == "1h":
            target = now + timedelta(hours=1)
        elif period == "today":
            target = timezone.localtime().replace(hour=23, minute=59, second=59, microsecond=0)
        elif period == "tomorrow":
            tomorrow = timezone.localtime().date() + timedelta(days=1)
            target = timezone.make_aware(
                datetime.combine(tomorrow, dtime(23, 59, 59), tzinfo=timezone.get_current_timezone())
            )
        elif period == "week":
            target = now + timedelta(days=7)
        elif period == "custom":
            target = custom_at
        else:
            target = now + timedelta(hours=1)

        reminder.snoozed_until = target
        reminder.due_at = target
        reminder.status = ReminderStatus.PENDING
        reminder.save(update_fields=["snoozed_until", "due_at", "status"])

        ReminderLog.objects.create(
            reminder=reminder,
            actor=request.user,
            action=self.action,
            details={"snoozed_until": target.isoformat()},
        )
        return Response(ReminderSerializer(reminder).data)


class ReminderRuleListCreateView(generics.ListCreateAPIView):
    """List reminder rules (any staff) or create one (admin only)."""

    serializer_class = ReminderRuleSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsAdmin()]

    def get_queryset(self):
        return ReminderRule.objects.all()


class ReminderRuleRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """Update/delete reminder rules (admin only)."""

    serializer_class = ReminderRuleSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsAdmin()]

    def get_queryset(self):
        return ReminderRule.objects.all()


class ReminderLogListView(generics.ListAPIView):
    """Audit log of reminder events for the current user's reminders."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ReminderLogSerializer

    def get_queryset(self):
        qs = ReminderLog.objects.filter(reminder__user=self.request.user)
        reminder_id = self.request.query_params.get("reminder")
        if reminder_id:
            qs = qs.filter(reminder_id=reminder_id)
        return qs.select_related("actor", "reminder")
