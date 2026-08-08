from celery import shared_task

from .services import expire_orphaned_reminders, sync_reminders


@shared_task
def process_reminders():
    """Evaluate all enabled business reminder rules and sync reminders.

    Runs periodically via Celery Beat. Idempotent — never creates duplicate
    reminders for the same rule instance.
    """
    return sync_reminders()


@shared_task
def expire_orphaned_reminder_records():
    """Expire reminders whose related entity (client/deal/task/invoice)
    no longer exists."""
    return {"expired": expire_orphaned_reminders()}
