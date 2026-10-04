from django.urls import path
from .views import PartnerList, PartnerDetail, ReferralList, PayoutList
urlpatterns = [path("", PartnerList.as_view()), path("<uuid:pk>/", PartnerDetail.as_view()), path("<uuid:pk>/referrals/", ReferralList.as_view()), path("<uuid:pk>/payouts/", PayoutList.as_view())]
