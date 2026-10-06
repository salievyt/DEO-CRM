from decimal import Decimal
from django.db.models import Sum
from apps.deals.models import DealPayment


def partner_totals(partner):
    revenue = Decimal("0")
    earned = Decimal("0")
    won = 0
    referrals = list(partner.referrals.select_related("lead"))
    for referral in referrals:
        paid = DealPayment.objects.filter(deal__lead=referral.lead).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        revenue += paid
        earned += (paid * referral.commission_rate / 100).quantize(Decimal("0.01"))
        won += int(hasattr(referral.lead, "deal") and referral.lead.deal.status == "won")
    payouts = partner.payouts.aggregate(total=Sum("amount"))["total"] or Decimal("0")
    return dict(leads=len(referrals), won=won, conversion=round(won / len(referrals) * 100, 1) if referrals else 0,
                revenue=revenue, earned=earned, paid=payouts, payable=earned-payouts)
