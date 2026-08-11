from django.urls import path

from .views import (
    CallRecordIngestView,
    CallRecordListView,
    CallStatsView,
    PBXConnectionCreateView,
    PBXConnectionDetailView,
    PBXConnectionListView,
    PBXConnectionTestView,
    SipAccountDetailView,
    SipAccountListView,
    SipAccountQuickCreateView,
)

urlpatterns = [
    path("pbx/", PBXConnectionListView.as_view(), name="calls-pbx-list"),
    path("pbx/create/", PBXConnectionCreateView.as_view(), name="calls-pbx-create"),
    path("pbx/test/", PBXConnectionTestView.as_view(), name="calls-pbx-test"),
    path("pbx/<uuid:pk>/", PBXConnectionDetailView.as_view(), name="calls-pbx-detail"),
    path("pbx/<uuid:pk>/test/", PBXConnectionTestView.as_view(), name="calls-pbx-test-one"),
    path("sip/", SipAccountListView.as_view(), name="calls-sip-list"),
    path("sip/quick/", SipAccountQuickCreateView.as_view(), name="calls-sip-quick"),
    path("sip/<uuid:pk>/", SipAccountDetailView.as_view(), name="calls-sip-detail"),
    path("records/", CallRecordListView.as_view(), name="calls-record-list"),
    path("stats/", CallStatsView.as_view(), name="calls-stats"),
    path("cdr/", CallRecordIngestView.as_view(), name="calls-cdr-ingest"),
]
