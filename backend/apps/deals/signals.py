from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import DealItem


@receiver([post_save, post_delete], sender=DealItem)
def recalculate_deal_on_item_change(sender, instance, **kwargs):
    """Keep deal subtotal/discount/tax/total/cost/profit in sync with items."""
    try:
        instance.deal.recalculate()
    except Exception:  # pragma: no cover — deal may be mid-deletion
        pass
