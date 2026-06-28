from django.urls import path

from . import ab_views

urlpatterns = [
    path(
        "ab-testing/campaigns/",
        ab_views.ABTestCampaignListCreateView.as_view(),
        name="ab-campaign-list",
    ),
    path(
        "ab-testing/campaigns/<uuid:pk>/",
        ab_views.ABTestCampaignDetailView.as_view(),
        name="ab-campaign-detail",
    ),
    path(
        "ab-testing/stats/",
        ab_views.ABTestCampaignStatsView.as_view(),
        name="ab-stats",
    ),
    path(
        "ab-testing/generate/",
        ab_views.GenerateProposalVariantsView.as_view(),
        name="ab-generate",
    ),
    path(
        "ab-testing/variants/<uuid:variant_pk>/track/",
        ab_views.TrackVariantEventView.as_view(),
        name="ab-track-event",
    ),
    path(
        "ab-testing/variants/<uuid:variant_pk>/conversions/",
        ab_views.ABTestConversionListView.as_view(),
        name="ab-conversions",
    ),
]
