from datetime import timedelta

from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification, NotificationPreference
from .serializers import (
    ArchiveNotificationsSerializer,
    NotificationPreferenceSerializer,
    NotificationSerializer,
)


class NotificationListView(generics.ListAPIView):
    """List notifications for the current user.

    Supports filtering:
    - ?archived=true — only archived notifications
    - ?archived=false — only active (default)
    - ?type=task_assigned — filter by type
    """

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)

        # Filter by archived status (default: show active only)
        archived = self.request.query_params.get("archived")
        if archived == "true":
            qs = qs.filter(archived=True)
        else:
            qs = qs.filter(archived=False)

        # Filter by type
        notif_type = self.request.query_params.get("type")
        if notif_type:
            qs = qs.filter(type=notif_type)

        return qs


class MarkAllReadView(APIView):
    """Mark all notifications as read for the current user."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(user=request.user, read=False).update(read=True)
        return Response({"detail": "Все уведомления отмечены как прочитанные"})


class UnreadCountView(APIView):
    """Get unread notification count for the current user."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, read=False, archived=False).count()
        return Response({"count": count})


class ArchiveNotificationsView(APIView):
    """Archive notifications based on criteria."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ArchiveNotificationsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        qs = Notification.objects.filter(user=request.user)

        if serializer.validated_data.get("archive_read"):
            qs = qs.filter(read=True)
        if serializer.validated_data.get("archive_unread"):
            qs = qs.filter(read=False)

        days = serializer.validated_data.get("days_older_than", 0)
        if days > 0:
            cutoff = timezone.now() - timedelta(days=days)
            qs = qs.filter(created_at__lt=cutoff)

        # Exclude already archived
        qs = qs.filter(archived=False)

        count = qs.update(archived=True, read=True)
        return Response({
            "detail": f"Архивировано уведомлений: {count}",
            "archived_count": count,
        })


class NotificationPreferencesView(APIView):
    """Get or update notification preferences for the current user."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        prefs = NotificationPreference.get_or_create_for_user(request.user)
        serializer = NotificationPreferenceSerializer(prefs)
        return Response(serializer.data)

    def patch(self, request):
        prefs = NotificationPreference.get_or_create_for_user(request.user)
        serializer = NotificationPreferenceSerializer(
            prefs, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class MarkAsArchivedView(APIView):
    """Mark specific notification(s) as archived."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk=None):
        if pk:
            # Archive single notification
            qs = Notification.objects.filter(
                pk=pk, user=request.user, archived=False
            )
            count = qs.update(archived=True)
        else:
            # Archive all active (default behavior)
            qs = Notification.objects.filter(
                user=request.user, archived=False
            )
            count = qs.update(archived=True)

        return Response({
            "detail": f"Архивировано: {count}",
            "archived_count": count,
        })