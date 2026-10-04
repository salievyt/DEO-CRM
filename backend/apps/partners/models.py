import secrets
import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


def referral_code():
    return secrets.token_urlsafe(12)


class Partner(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=10, validators=[MinValueValidator(0), MaxValueValidator(100)])
    code = models.CharField(max_length=32, unique=True, default=referral_code, editable=False)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name", "id"]


class Referral(models.Model):
    partner = models.ForeignKey(Partner, on_delete=models.PROTECT, related_name="referrals")
    lead = models.OneToOneField("leads.Lead", on_delete=models.PROTECT, related_name="referral")
    project = models.ForeignKey("projects.Project", on_delete=models.SET_NULL, null=True, blank=True)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(100)])
    created_at = models.DateTimeField(auto_now_add=True)


class PartnerPayout(models.Model):
    partner = models.ForeignKey(Partner, on_delete=models.PROTECT, related_name="payouts")
    amount = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    reference = models.CharField(max_length=120, unique=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    paid_at = models.DateTimeField(auto_now_add=True)
