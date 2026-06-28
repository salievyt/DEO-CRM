from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from .models import Notification, NotificationPreference


@shared_task
def auto_archive_notifications():
    """Archive old notifications based on each user's preferences.

    Runs periodically via Celery Beat.
    - Read notifications older than auto_archive_read_days → archived
    - Unread notifications older than auto_archive_unread_days → archived + marked read
    """
    now = timezone.now()

    for prefs in NotificationPreference.objects.select_related("user").iterator():
        qs = Notification.objects.filter(user=prefs.user, archived=False)

        # Archive read notifications after configured days
        if prefs.auto_archive_read_days > 0:
            read_cutoff = now - timedelta(days=prefs.auto_archive_read_days)
            read_count = (
                qs.filter(read=True, created_at__lt=read_cutoff)
                .update(archived=True)
            )
        else:
            read_count = 0

        # Archive unread notifications after configured days
        if prefs.auto_archive_unread_days > 0:
            unread_cutoff = now - timedelta(days=prefs.auto_archive_unread_days)
            unread_count = (
                qs.filter(read=False, created_at__lt=unread_cutoff)
                .update(archived=True, read=True)
            )
        else:
            unread_count = 0

        if read_count > 0 or unread_count > 0:
            print(
                f"  Archived {read_count} read + {unread_count} unread "
                f"for {prefs.user}"
            )

    return "Auto-archive complete"
