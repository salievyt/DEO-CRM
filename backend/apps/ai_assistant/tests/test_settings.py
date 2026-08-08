"""Tests for the AI settings API: CRUD, masking, permissions, env fallback."""

from django.urls import reverse

from apps.ai_assistant.models import get_ai_settings


class TestSettingsAPI:
    def test_get_returns_masked_key(self, api_client, manager, configured_settings):
        api_client.force_authenticate(manager)
        resp = api_client.get(reverse("ai-settings"))
        assert resp.status_code == 200
        data = resp.data
        assert data["configured"] is True
        assert data["api_key_preview"] == "sk-tes…abcd"
        assert "api_key" not in data  # write-only

    def test_put_updates_fields(self, api_client, manager, configured_settings):
        api_client.force_authenticate(manager)
        resp = api_client.put(
            reverse("ai-settings"),
            {"model": "new/model", "temperature": "0.3", "max_tokens": 4096},
            format="json",
        )
        assert resp.status_code == 200
        configured_settings.refresh_from_db()
        assert configured_settings.model == "new/model"
        assert float(configured_settings.temperature) == 0.3
        assert configured_settings.max_tokens == 4096
        # key untouched when not sent
        assert configured_settings.api_key == "sk-test-secret-key-1234567890abcd"

    def test_put_blank_key_keeps_existing(self, api_client, manager, configured_settings):
        api_client.force_authenticate(manager)
        resp = api_client.put(
            reverse("ai-settings"),
            {"api_key": "", "api_url": "https://new.example.com/v1"},
            format="json",
        )
        assert resp.status_code == 200
        configured_settings.refresh_from_db()
        assert configured_settings.api_key == "sk-test-secret-key-1234567890abcd"
        assert configured_settings.api_url == "https://new.example.com/v1"

    def test_developer_cannot_access_settings(self, api_client, developer):
        api_client.force_authenticate(developer)
        resp = api_client.get(reverse("ai-settings"))
        assert resp.status_code == 403


class TestEnvFallback:
    def test_creates_row_from_env(self, db, monkeypatch):
        monkeypatch.setenv("AI_API_URL", "https://env.example.com/v1")
        monkeypatch.setenv("AI_API_KEY", "sk-env-key")
        monkeypatch.setenv("AI_MODEL", "env/model")
        settings = get_ai_settings()
        assert settings.configured is True
        assert settings.api_url == "https://env.example.com/v1"
        assert settings.api_key == "sk-env-key"
        assert settings.model == "env/model"

    def test_empty_db_falls_back_to_env(self, db, monkeypatch, configured_settings):
        configured_settings.api_url = ""
        configured_settings.api_key = ""
        configured_settings.model = ""
        configured_settings.save()
        monkeypatch.setenv("AI_API_URL", "https://env.example.com/v1")
        monkeypatch.setenv("AI_API_KEY", "sk-env-key")
        monkeypatch.setenv("AI_MODEL", "env/model")
        settings = get_ai_settings()
        assert settings.configured is True
        assert settings.api_url == "https://env.example.com/v1"

    def test_not_configured_without_values(self, db):
        settings = get_ai_settings()
        assert settings.configured is False


class TestTestConnection:
    def test_test_endpoint_ok(
        self, api_client, manager, configured_settings, mock_provider, FakeProviderResponse
    ):
        response = FakeProviderResponse(content="OK")
        mock_provider(response)
        api_client.force_authenticate(manager)
        resp = api_client.post(reverse("ai-settings-test"), {}, format="json")
        assert resp.status_code == 200
        assert resp.data["ok"] is True
        assert resp.data["response"] == "OK"
        assert resp.data["model"] == "test/model"

    def test_test_endpoint_error(
        self, api_client, manager, configured_settings, mock_provider, FakeProviderResponse
    ):
        response = FakeProviderResponse(status_code=502, error='{"error": "bad gateway"}')
        mock_provider(response)
        api_client.force_authenticate(manager)
        resp = api_client.post(reverse("ai-settings-test"), {}, format="json")
        assert resp.status_code == 400
        assert resp.data["ok"] is False
        assert "502" in resp.data["error"]

    def test_test_endpoint_not_configured(self, api_client, manager, db):
        api_client.force_authenticate(manager)
        resp = api_client.post(reverse("ai-settings-test"), {}, format="json")
        assert resp.status_code == 400
        assert "не настроен" in resp.data["error"]
