"""Business logic for deals: conversion from lead and status transitions."""

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.catalog.models import CatalogItem, InventoryMovement

from .models import Deal, DealItem


class DealError(ValueError):
    """A deal operation failed; message is user-facing (Russian).

    ``shortages`` carries per-item stock details when the failure is caused
    by insufficient inventory.
    """

    def __init__(self, message, shortages=None):
        super().__init__(message)
        self.shortages = shortages or []


def convert_lead_to_deal(user, lead, items, discount=0, tax=0, description="", assigned_to=None):
    """Create a Deal from a lead with the given catalog items."""
    if hasattr(lead, "deal"):
        raise DealError("Лид уже конвертирован в сделку.")

    if not items:
        raise DealError("Добавьте хотя бы одну позицию в сделку.")

    with transaction.atomic():
        deal = Deal.objects.create(
            lead=lead,
            client=lead.client,
            title=lead.contact_name,
            description=description,
            discount=discount or 0,
            tax=tax or 0,
            assigned_to=assigned_to,
            created_by=user,
        )
        for row in items:
            item = row["item"]
            DealItem.objects.create(
                deal=deal,
                item=item,
                name=item.name,
                quantity=row["quantity"],
                unit_price=item.price,
                discount=row.get("discount") or 0,
                tax=row.get("tax") or 0,
                cost_price=item.cost_price,
            )
        deal.recalculate()
    return deal


def change_deal_status(user, deal, new_status):
    """Transition a deal between statuses; handles stock on won/reversal.

    Stock restoration and the status change happen in one transaction so a
    failed status save can never leave stock and status out of sync.
    """
    if new_status not in dict(Deal.STATUS_CHOICES):
        raise DealError("Неизвестный статус сделки.")
    if new_status == deal.status:
        return deal

    if new_status == Deal.STATUS_WON:
        return _mark_won(user, deal)

    with transaction.atomic():
        if deal.status == Deal.STATUS_WON:
            _reverse_stock(user, deal)
        if new_status == Deal.STATUS_LOST:
            deal.lost_at = timezone.now()
        deal.status = new_status
        if new_status != Deal.STATUS_WON:
            deal.won_at = None
        deal.save(update_fields=["status", "won_at", "lost_at", "updated_at"])
    return deal


def delete_deal(user, deal):
    """Delete a deal, returning stock for products sold by a won deal."""
    with transaction.atomic():
        if deal.status == Deal.STATUS_WON:
            _reverse_stock(user, deal)
        deal.delete()


def _product_items(deal):
    return (
        deal.items.select_related("item")
        .exclude(item=None)
        .filter(item__type=CatalogItem.TYPE_PRODUCT)
    )


def _mark_won(user, deal):
    """Validate stock, decrement it and mark the deal as won."""
    product_items = list(_product_items(deal))
    shortages = []
    for di in product_items:
        if di.quantity != int(di.quantity):
            shortages.append(
                {
                    "name": di.name,
                    "error": "количество товара должно быть целым",
                }
            )
        elif di.quantity > di.item.stock:
            shortages.append(
                {
                    "name": di.name,
                    "required": int(di.quantity),
                    "available": di.item.stock,
                    "error": "недостаточно на складе",
                }
            )
    if shortages:
        raise DealError("Недостаточно товара на складе.", shortages=shortages)

    with transaction.atomic():
        for di in product_items:
            sold = int(di.quantity)
            CatalogItem.objects.filter(id=di.item_id).update(stock=F("stock") - sold)
            di.item.refresh_from_db()
            InventoryMovement.objects.create(
                item_id=di.item_id,
                movement_type=InventoryMovement.TYPE_SALE,
                quantity=-sold,
                balance_after=di.item.stock,
                reference=f"сделка {deal.number}",
                created_by=user,
            )
        deal.status = Deal.STATUS_WON
        deal.won_at = timezone.now()
        deal.save(update_fields=["status", "won_at", "updated_at"])
    return deal


def _reverse_stock(user, deal):
    """Return sold stock when a won deal moves out of the won state.

    Restores from the actual ``sale`` movements recorded when the deal was
    won (not the current items), so editing a won deal's items cannot leak
    stock permanently.
    """
    movements = list(
        InventoryMovement.objects.filter(
            reference=f"сделка {deal.number}",
            movement_type=InventoryMovement.TYPE_SALE,
        ).select_related("item")
    )
    for movement in movements:
        item = movement.item
        returned = abs(movement.quantity)
        CatalogItem.objects.filter(id=item.id).update(stock=F("stock") + returned)
        item.refresh_from_db()
        InventoryMovement.objects.create(
            item_id=item.id,
            movement_type=InventoryMovement.TYPE_REFUND,
            quantity=returned,
            balance_after=item.stock,
            reference=f"сделка {deal.number} (возврат)",
            created_by=user,
        )
