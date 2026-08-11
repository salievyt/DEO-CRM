"""Tests for the learning knowledge base module.

The 0002 data migration seeds the articles, so API tests rely on the seed
already being present in the test database (pytest runs all migrations).
"""

import pytest
from django.contrib.auth import get_user_model

from apps.learning.models import Article
from apps.learning.seed_articles import ARTICLES

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="manager@deo.test",
        email="manager@deo.test",
        password="pass1234",
    )


@pytest.fixture
def owner_user(db):
    from apps.accounts.models import Role

    role, _ = Role.objects.get_or_create(name="owner")
    return User.objects.create_user(
        username="owner@deo.test",
        email="owner@deo.test",
        password="pass1234",
        first_name="Владелец",
        role=role,
    )


@pytest.fixture
def pm_user(db):
    from apps.accounts.models import Role

    role, _ = Role.objects.get_or_create(name="project_manager")
    return User.objects.create_user(
        username="pm@deo.test",
        email="pm@deo.test",
        password="pass1234",
        role=role,
    )


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient

    return APIClient()


# ------------------------------------------------------------ seed integrity
# These check the seed content module itself — no database required.


class TestSeedData:
    def test_catalog_matches_seed(self, db):
        """The migration must produce exactly the articles from the catalog."""
        assert Article.objects.count() == len(ARTICLES)
        db_slugs = set(Article.objects.values_list("slug", flat=True))
        assert db_slugs == {item["slug"] for item in ARTICLES}

    def test_slugs_unique(self):
        slugs = [item["slug"] for item in ARTICLES]
        assert len(slugs) == len(set(slugs))

    def test_section_counts_reasonable(self):
        """Every article must have a healthy number of sections."""
        for item in ARTICLES:
            assert len(item["sections"]) >= 3, item["slug"]

    def test_sections_schema_valid(self):
        allowed_types = {"paragraph", "list", "steps", "callout"}
        for item in ARTICLES:
            for section in item["sections"]:
                assert section.get("heading", "").strip(), item["slug"]
                blocks = section["blocks"]
                assert isinstance(blocks, list) and blocks, item["slug"]
                for block in blocks:
                    assert block["type"] in allowed_types, item["slug"]
                    if block["type"] in ("list", "steps"):
                        assert isinstance(block.get("items"), list) and block["items"], item["slug"]
                    else:
                        assert (block.get("text") or "").strip(), item["slug"]

    def test_no_bee_branding(self):
        """Articles must use the DEO CRM brand (not BeeCRM)."""
        for item in ARTICLES:
            text = repr(item).lower()
            assert "beecrm" not in text, item["slug"]


# ---------------------------------------------------------------------- the API


class TestArticleAPI:
    def test_requires_auth(self, api_client):
        assert api_client.get("/api/v1/learning/").status_code == 401

    def test_list_returns_categories(self, api_client, user):
        api_client.force_authenticate(user)
        resp = api_client.get("/api/v1/learning/")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == len(ARTICLES)
        assert any(cat["value"] == "basics" for cat in resp.data["categories"])
        assert all(cat["count"] > 0 for cat in resp.data["categories"])

    def test_list_search(self, api_client, user):
        api_client.force_authenticate(user)
        resp = api_client.get("/api/v1/learning/", {"search": "CRM"})
        assert resp.status_code == 200
        assert resp.data["results"]
        assert all(
            "CRM" in a["title"] or "CRM" in a["summary"] for a in resp.data["results"]
        )

    def test_list_category_filter(self, api_client, user):
        api_client.force_authenticate(user)
        resp = api_client.get("/api/v1/learning/", {"category": "analytics"})
        assert resp.status_code == 200
        assert resp.data["results"]
        assert all(a["category"] == "analytics" for a in resp.data["results"])

    def test_detail_by_slug(self, api_client, user):
        api_client.force_authenticate(user)
        resp = api_client.get("/api/v1/learning/what-is-crm/")
        assert resp.status_code == 200
        assert resp.data["slug"] == "what-is-crm"
        assert resp.data["sections"]
        assert resp.data["section_count"] == len(resp.data["sections"])

    def test_detail_unknown_slug_404(self, api_client, user):
        api_client.force_authenticate(user)
        assert api_client.get("/api/v1/learning/nope/").status_code == 404

    def test_unpublished_hidden(self, api_client, user):
        Article.objects.filter(slug="what-is-crm").update(is_published=False)
        api_client.force_authenticate(user)
        assert api_client.get("/api/v1/learning/what-is-crm/").status_code == 404
        resp = api_client.get("/api/v1/learning/")
        assert all(a["slug"] != "what-is-crm" for a in resp.data["results"])


# ------------------------------------------------------- admin (manage content)


class TestAdminArticleAPI:
    def test_requires_owner(self, api_client, user, pm_user):
        api_client.force_authenticate(user)
        assert api_client.get("/api/v1/learning/admin/articles/").status_code == 403
        api_client.force_authenticate(pm_user)
        assert api_client.get("/api/v1/learning/admin/articles/").status_code == 403

    def test_list_includes_drafts(self, api_client, owner_user):
        Article.objects.filter(slug="what-is-crm").update(is_published=False)
        api_client.force_authenticate(owner_user)
        resp = api_client.get("/api/v1/learning/admin/articles/")
        assert resp.status_code == 200
        assert len(resp.data["results"]) == len(ARTICLES)
        assert any(
            a["slug"] == "what-is-crm" and not a["is_published"]
            for a in resp.data["results"]
        )

    def test_create_with_autogenerated_slug(self, api_client, owner_user):
        api_client.force_authenticate(owner_user)
        resp = api_client.post(
            "/api/v1/learning/admin/articles/",
            {
                "title": "Новая статья про CRM!",
                "slug": "",
                "summary": "Короткое описание",
                "category": "basics",
                "reading_time_minutes": 3,
                "order": 99,
                "is_published": False,
                "sections": [
                    {
                        "heading": "Введение",
                        "blocks": [{"type": "paragraph", "text": "Привет"}],
                    }
                ],
            },
            format="json",
        )
        assert resp.status_code == 201, resp.data
        article = Article.objects.get(title="Новая статья про CRM!")
        assert article.slug == "novaya-statya-pro-crm"
        assert article.section_count == 1

    def test_create_slug_collision_appends_suffix(self, api_client, owner_user):
        api_client.force_authenticate(owner_user)
        resp = api_client.post(
            "/api/v1/learning/admin/articles/",
            {
                "title": "Дубль",
                "summary": "Описание",
                "category": "basics",
                "sections": [],
            },
            format="json",
        )
        assert resp.status_code == 201
        first = Article.objects.get(title="Дубль")
        # Create a second one with the same title → unique slug with -2 suffix.
        resp = api_client.post(
            "/api/v1/learning/admin/articles/",
            {
                "title": "Дубль",
                "summary": "Описание",
                "category": "basics",
                "sections": [],
            },
            format="json",
        )
        assert resp.status_code == 201, resp.data
        assert Article.objects.filter(slug__startswith=first.slug).count() >= 2

    def test_explicit_duplicate_slug_rejected(self, api_client, owner_user):
        api_client.force_authenticate(owner_user)
        resp = api_client.post(
            "/api/v1/learning/admin/articles/",
            {
                "title": "Ещё одна",
                "slug": "what-is-crm",
                "summary": "Описание",
                "category": "basics",
                "sections": [],
            },
            format="json",
        )
        assert resp.status_code == 400

    def test_update_and_publish(self, api_client, owner_user):
        article = Article.objects.get(slug="what-is-crm")
        api_client.force_authenticate(owner_user)
        resp = api_client.patch(
            f"/api/v1/learning/admin/articles/{article.id}/",
            {"title": "CRM: что это", "is_published": False},
            format="json",
        )
        assert resp.status_code == 200
        article.refresh_from_db()
        assert article.title == "CRM: что это"
        assert article.is_published is False

    def test_partial_patch_keeps_slug(self, api_client, owner_user):
        """PATCH without the slug field must not rename the article URL."""
        article = Article.objects.get(slug="what-is-crm")
        api_client.force_authenticate(owner_user)
        resp = api_client.patch(
            f"/api/v1/learning/admin/articles/{article.id}/",
            {"is_published": False},
            format="json",
        )
        assert resp.status_code == 200
        article.refresh_from_db()
        assert article.slug == "what-is-crm"

    def test_patch_with_empty_slug_regenerates(self, api_client, owner_user):
        article = Article.objects.get(slug="what-is-crm")
        api_client.force_authenticate(owner_user)
        resp = api_client.patch(
            f"/api/v1/learning/admin/articles/{article.id}/",
            {"slug": "", "title": "CRM и воронки"},
            format="json",
        )
        assert resp.status_code == 200
        article.refresh_from_db()
        assert article.slug.startswith("crm-i-voronki")
        assert article.slug != "what-is-crm"

    def test_update_invalid_sections_rejected(self, api_client, owner_user):
        article = Article.objects.get(slug="what-is-crm")
        api_client.force_authenticate(owner_user)
        resp = api_client.patch(
            f"/api/v1/learning/admin/articles/{article.id}/",
            {"sections": [{"no_heading": True}]},
            format="json",
        )
        assert resp.status_code == 400

    def test_delete(self, api_client, owner_user):
        article = Article.objects.get(slug="what-is-crm")
        api_client.force_authenticate(owner_user)
        assert (
            api_client.delete(f"/api/v1/learning/admin/articles/{article.id}/").status_code
            == 204
        )
        assert not Article.objects.filter(slug="what-is-crm").exists()


# ---------------------------------------------------- per-user reading progress


class TestArticleReadAPI:
    def test_requires_auth(self, api_client):
        assert (
            api_client.post("/api/v1/learning/read/what-is-crm/").status_code == 401
        )

    def test_mark_read_appears_in_list(self, api_client, user):
        api_client.force_authenticate(user)
        resp = api_client.post("/api/v1/learning/read/what-is-crm/")
        assert resp.status_code == 200
        assert resp.data["read"] is True
        list_resp = api_client.get("/api/v1/learning/")
        assert "what-is-crm" in list_resp.data["read"]

    def test_mark_read_is_idempotent(self, api_client, user):
        api_client.force_authenticate(user)
        assert (
            api_client.post("/api/v1/learning/read/what-is-crm/").status_code == 200
        )
        assert (
            api_client.post("/api/v1/learning/read/what-is-crm/").status_code == 200
        )

    def test_mark_read_unknown_slug_404(self, api_client, user):
        api_client.force_authenticate(user)
        assert api_client.post("/api/v1/learning/read/nope/").status_code == 404

    def test_mark_read_unpublished_404(self, api_client, user):
        Article.objects.filter(slug="what-is-crm").update(is_published=False)
        api_client.force_authenticate(user)
        assert api_client.post("/api/v1/learning/read/what-is-crm/").status_code == 404

    def test_unread_removes_from_list(self, api_client, user):
        api_client.force_authenticate(user)
        api_client.post("/api/v1/learning/read/what-is-crm/")
        resp = api_client.delete("/api/v1/learning/read/what-is-crm/")
        assert resp.status_code == 200
        assert resp.data["read"] is False
        list_resp = api_client.get("/api/v1/learning/")
        assert "what-is-crm" not in list_resp.data["read"]

    def test_progress_is_per_user(self, api_client, user):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        other = User.objects.create_user(
            username="other@deo.test",
            email="other@deo.test",
            password="pass1234",
        )
        api_client.force_authenticate(user)
        api_client.post("/api/v1/learning/read/what-is-crm/")
        api_client.force_authenticate(other)
        list_resp = api_client.get("/api/v1/learning/")
        assert "what-is-crm" not in list_resp.data["read"]

    def test_read_record_cleans_up_with_article(self, db):
        from apps.learning.models import ArticleRead

        from django.contrib.auth import get_user_model

        User = get_user_model()
        article = Article.objects.get(slug="what-is-crm")
        user = User.objects.create_user(
            username="cleanup@deo.test",
            email="cleanup@deo.test",
            password="pass1234",
        )
        ArticleRead.objects.create(user=user, article=article)
        article.delete()
        assert ArticleRead.objects.filter(user=user).count() == 0
