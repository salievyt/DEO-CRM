from django.urls import include, path

from . import views

urlpatterns = [
    path(
        "generate/tz/", views.AIGenerateView.as_view(), {"prompt_type": "tz"}, name="ai-generate-tz"
    ),
    path(
        "generate/proposal/",
        views.AIGenerateView.as_view(),
        {"prompt_type": "commercial_offer"},
        name="ai-generate-proposal",
    ),
    path(
        "generate/contract/",
        views.AIGenerateView.as_view(),
        {"prompt_type": "contract"},
        name="ai-generate-contract",
    ),
    path(
        "generate/report/",
        views.AIGenerateView.as_view(),
        {"prompt_type": "report"},
        name="ai-generate-report",
    ),
    path(
        "generate/summary/",
        views.AIGenerateView.as_view(),
        {"prompt_type": "summary"},
        name="ai-generate-summary",
    ),
    path(
        "generate/estimate/",
        views.AIGenerateView.as_view(),
        {"prompt_type": "estimate"},
        name="ai-generate-estimate",
    ),
    path("history/", views.AIHistoryView.as_view(), name="ai-history"),
    path("templates/", views.AITemplateListView.as_view(), name="ai-templates"),
    path("settings/", views.AISettingsView.as_view(), name="ai-settings"),
    path("settings/test/", views.AISettingsTestView.as_view(), name="ai-settings-test"),
    path("", include("apps.ai_assistant.ab_urls")),
]
