from django.shortcuts import get_object_or_404
from django.utils import timezone

from common.permissions import IsOwner
from rest_framework import generics, permissions, views
from rest_framework.response import Response

from .models import Article, ArticleCategory, ArticleRead
from .serializers import (
    ArticleAdminListSerializer,
    ArticleDetailSerializer,
    ArticleListSerializer,
    ArticleWriteSerializer,
)


class ArticleListView(generics.ListAPIView):
    """Published learning articles with optional search/category filters.

    Returns ``{"results": [...], "categories": [...]}`` so the hub page can
    render filter chips with per-category article counts in one request.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ArticleListSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Article.objects.filter(is_published=True)
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)
        search = (self.request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(title__icontains=search) | qs.filter(
                summary__icontains=search
            )
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        category_counts = {
            category: Article.objects.filter(
                category=category, is_published=True
            ).count()
            for category, _label in ArticleCategory.choices
        }
        categories = [
            {"value": value, "label": label, "count": category_counts[value]}
            for value, label in ArticleCategory.choices
            if category_counts[value] > 0
        ]
        read_slugs = list(
            ArticleRead.objects.filter(user=request.user).values_list(
                "article__slug", flat=True
            )
        )
        return Response(
            {"results": serializer.data, "categories": categories, "read": read_slugs}
        )


class ArticleDetailView(generics.RetrieveAPIView):
    """Single article by slug with full sections content."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ArticleDetailSerializer
    queryset = Article.objects.filter(is_published=True)
    lookup_field = "slug"


class ArticleReadView(views.APIView):
    """Mark an article as read or unread for the current user.

    ``POST /learning/read/<slug>/`` records a read (idempotent upsert),
    ``DELETE /learning/read/<slug>/`` removes the record. Read state lives on
    the backend so progress follows the user across devices.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        article = get_object_or_404(
            Article.objects.filter(is_published=True), slug=slug
        )
        ArticleRead.objects.update_or_create(
            user=request.user,
            article=article,
            defaults={"read_at": timezone.now()},
        )
        return Response({"slug": slug, "read": True})

    def delete(self, request, slug):
        ArticleRead.objects.filter(
            user=request.user, article__slug=slug
        ).delete()
        return Response({"slug": slug, "read": False})


class ArticleAdminListCreateView(generics.ListCreateAPIView):
    """Admin: list all articles (including drafts) or create a new one.

    Only superadmin/owner (``IsOwner``) may manage knowledge base content.
    """

    permission_classes = [permissions.IsAuthenticated, IsOwner]
    pagination_class = None

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ArticleWriteSerializer
        return ArticleAdminListSerializer

    def get_queryset(self):
        qs = Article.objects.all()
        status = self.request.query_params.get("status")
        if status == "published":
            qs = qs.filter(is_published=True)
        elif status == "draft":
            qs = qs.filter(is_published=False)
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)
        search = (self.request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(title__icontains=search) | qs.filter(
                summary__icontains=search
            )
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({"results": serializer.data})


class ArticleAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: retrieve, update or delete a single article (by pk)."""

    permission_classes = [permissions.IsAuthenticated, IsOwner]
    queryset = Article.objects.all()
    serializer_class = ArticleWriteSerializer
