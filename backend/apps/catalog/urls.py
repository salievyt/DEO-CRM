from django.urls import path

from . import views
from .website import WebsiteCatalogView

urlpatterns = [
    path("website-services/", WebsiteCatalogView.as_view(), name="website-catalog"),
    path("items/", views.CatalogItemListCreateView.as_view(), name="catalog-items"),
    path(
        "items/<uuid:pk>/",
        views.CatalogItemDetailView.as_view(),
        name="catalog-item-detail",
    ),
    path(
        "items/<uuid:pk>/restock/",
        views.CatalogRestockView.as_view(),
        name="catalog-item-restock",
    ),
    path("categories/", views.CatalogCategoryListCreateView.as_view(), name="catalog-categories"),
    path("bulk/", views.CatalogBulkView.as_view(), name="catalog-bulk"),
    path("export/", views.CatalogExportView.as_view(), name="catalog-export"),
    path("import/", views.CatalogImportView.as_view(), name="catalog-import"),
]
