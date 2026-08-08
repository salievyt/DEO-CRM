from django.urls import path

from . import views

urlpatterns = [
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
