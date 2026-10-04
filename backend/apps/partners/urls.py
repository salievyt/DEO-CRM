from django.urls import path
from .public import ReferralIntake
from .views import PartnerList, PartnerDetail, ReferralList, PayoutList
urlpatterns = [path("ref/<str:code>/", ReferralIntake.as_view()), path("", PartnerList.as_view()), path("<uuid:pk>/", PartnerDetail.as_view()), path("<uuid:pk>/referrals/", ReferralList.as_view()), path("<uuid:pk>/payouts/", PayoutList.as_view())]
