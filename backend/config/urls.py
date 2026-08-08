"""Main URL configuration for DEO STUDIO CRM."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

api_patterns = [
    path("auth/", include("apps.accounts.urls")),
    path("clients/", include("apps.clients.urls")),
    path("leads/", include("apps.leads.urls")),
    path("projects/", include("apps.projects.urls")),
    path("tasks/", include("apps.tasks.urls")),
    path("finance/", include("apps.finance.urls")),
    path("documents/", include("apps.documents.urls")),
    path("messenger/", include("apps.messenger.urls")),
    path("analytics/", include("apps.analytics.urls")),
    path("cabinet/", include("apps.cabinet.urls")),
    path("ai/", include("apps.ai_assistant.urls")),
    path("notifications/", include("apps.notifications.urls")),
    path("reminders/", include("apps.reminders.urls")),
    path("catalog/", include("apps.catalog.urls")),
    path("deals/", include("apps.deals.urls")),
    path("messaging/", include("apps.messaging.urls")),
    path("webhooks/", include("apps.messaging.webhooks.urls")),
    path("mentorship/", include("apps.mentorship.urls")),
    path("structure/", include("apps.structure.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_patterns)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
