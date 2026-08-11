from django.urls import path

from . import views

urlpatterns = [
    path("", views.ArticleListView.as_view(), name="learning-article-list"),
    path(
        "read/<slug:slug>/",
        views.ArticleReadView.as_view(),
        name="learning-article-read",
    ),
    path(
        "admin/articles/",
        views.ArticleAdminListCreateView.as_view(),
        name="learning-admin-article-list",
    ),
    path(
        "admin/articles/<uuid:pk>/",
        views.ArticleAdminDetailView.as_view(),
        name="learning-admin-article-detail",
    ),
    path("<slug:slug>/", views.ArticleDetailView.as_view(), name="learning-article-detail"),
]
