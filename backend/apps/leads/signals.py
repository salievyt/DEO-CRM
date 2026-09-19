"""Signal handlers for the leads app (event-driven automation hooks)."""

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.scenarios.events import emit_event

from .models import Lead


@receiver(post_save, sender=Lead)
def on_lead_created(sender, instance, created, **kwargs):
    """Fire the ``lead_created`` automation event when a lead is created."""
    if not created:
        return

    def _emit():
        emit_event(
            "lead_created",
            actor=instance.created_by or instance.assigned_to,
            entity=instance,
            entity_type="lead",
            entity_label=instance.contact_name,
        )

    if transaction.get_connection().in_atomic_block:
        transaction.on_commit(_emit)
    else:
        _emit()