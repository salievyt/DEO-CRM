"""Read-only, explicitly bounded catalog feed for the studio website."""
from rest_framework.response import Response
from apps.leads.website import WebsiteServiceView
from .models import CatalogItem


class WebsiteCatalogView(WebsiteServiceView):
    def get(self, request):
        items = CatalogItem.objects.filter(type=CatalogItem.TYPE_SERVICE, status=CatalogItem.STATUS_ACTIVE).select_related("category").order_by("name", "id")
        return Response({"services": [{"id": str(item.id), "name": item.name, "description": item.description, "category": item.category.name if item.category else ""} for item in items]})
