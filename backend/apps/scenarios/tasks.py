from celery import shared_task

from .events import process_unpaid_invoices


@shared_task
def process_invoice_unpaid_events():
    """Scan invoices and fire configured ``invoice_unpaid`` scenarios.

    Runs periodically via Celery Beat. Idempotent — a scenario never acts on
    the same invoice twice (see ``run_action`` dedup).
    """
    return process_unpaid_invoices()