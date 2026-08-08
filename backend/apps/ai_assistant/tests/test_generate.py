"""Tests for AI generation through the configured provider."""

from unittest import mock

import pytest
from django.urls import reverse

from apps.ai_assistant.models import AIRequest, AIPromptTemplate


@pytest.fixture
def template(db):
    return AIPromptTemplate.objects.create(
        name="ТЗ",
        prompt_type="tz",
        system_prompt="Ты — ассистент. Отвечай кратко.",
        user_prompt_template="Проект: {project_name}, Клиент: {client_name}",
    )


class TestGenerate:
    def test_generate_json_response(
        self,
        api_client,
        manager,
        configured_settings,
        template,
        mock_provider,
        FakeProviderResponse,
    ):
        response = FakeProviderResponse(content="## Техзадание")
        mock_provider(response)
        api_client.force_authenticate(manager)

        resp = api_client.post(
            reverse("ai-generate-tz"),
            {"variables": {"project_name": "Магазин", "client_name": "ООО Ромашка"}},
            format="json",
        )
        assert resp.status_code == 200, resp.data
        assert resp.data["status"] == "completed"
        assert resp.data["output"] == "## Техзадание"
        assert resp.data["model"] == "test/model"

        ai_request = AIRequest.objects.get(pk=resp.data["id"])
        assert ai_request.status == "completed"
        assert ai_request.model == "test/model"
        assert ai_request.tokens_used == 15
        assert ai_request.template_id == template.id

    def test_generate_sse_response(
        self,
        api_client,
        manager,
        configured_settings,
        template,
        mock_provider,
        FakeProviderResponse,
    ):
        # omniroute-style gateway streams even without stream=true
        response = FakeProviderResponse(sse=True, content="Стриминговый ответ")
        mock_provider(response)
        api_client.force_authenticate(manager)

        resp = api_client.post(
            reverse("ai-generate-tz"),
            {"variables": {"project_name": "Магазин", "client_name": "Клиент"}},
            format="json",
        )
        assert resp.status_code == 200, resp.data
        assert resp.data["output"] == "Стриминговый ответ"

    def test_generate_provider_error_sets_failed(
        self,
        api_client,
        manager,
        configured_settings,
        template,
        mock_provider,
        FakeProviderResponse,
    ):
        response = FakeProviderResponse(status_code=429, error='{"error": "rate limited"}')
        mock_provider(response)
        api_client.force_authenticate(manager)

        resp = api_client.post(
            reverse("ai-generate-tz"),
            {"variables": {"project_name": "Магазин"}},
            format="json",
        )
        assert resp.status_code == 400
        assert resp.data["status"] == "failed"
        request = AIRequest.objects.get(pk=resp.data["id"])
        assert request.status == "failed"

    def test_generate_not_configured(self, api_client, manager, db):
        api_client.force_authenticate(manager)
        resp = api_client.post(
            reverse("ai-generate-tz"),
            {"variables": {"project_name": "Магазин"}},
            format="json",
        )
        assert resp.status_code == 400
        assert "не настроен" in resp.data["error"]

    def test_generate_without_template_uses_default_prompt(
        self, api_client, manager, configured_settings, mock_provider, FakeProviderResponse
    ):
        called = {}

        def fake_post(url, json=None, headers=None, timeout=None):
            called["payload"] = json
            return FakeProviderResponse(content="Документ")

        with mock.patch("apps.ai_assistant.services.requests.post", fake_post):
            api_client.force_authenticate(manager)
            resp = api_client.post(
                reverse("ai-generate-tz"),
                {"variables": {"project_name": "Магазин"}},
                format="json",
            )
        assert resp.status_code == 200
        payload = called["payload"]
        assert payload["model"] == "test/model"
        assert payload["messages"][0]["role"] == "system"
        assert "техническое задание" in payload["messages"][1]["content"]
        assert "Магазин" in payload["messages"][1]["content"]

    def test_developer_cannot_generate(self, api_client, developer, configured_settings):
        api_client.force_authenticate(developer)
        resp = api_client.post(
            reverse("ai-generate-tz"),
            {"variables": {"project_name": "Магазин"}},
            format="json",
        )
        assert resp.status_code == 403
