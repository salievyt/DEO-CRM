import json

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import Role

User = get_user_model()


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch):
    """Keep AI env vars out of tests unless explicitly set."""
    monkeypatch.delenv("AI_API_URL", raising=False)
    monkeypatch.delenv("AI_API_KEY", raising=False)
    monkeypatch.delenv("AI_MODEL", raising=False)
    yield


@pytest.fixture
def roles(db):
    def make(name):
        return Role.objects.get_or_create(name=name)[0]

    return {
        "superadmin": make("superadmin"),
        "owner": make("owner"),
        "project_manager": make("project_manager"),
        "developer": make("developer"),
        "client": make("client"),
    }


@pytest.fixture
def admin_user(db, roles):
    return User.objects.create_user(
        username="admin@deo.test",
        email="admin@deo.test",
        password="pass1234",
        first_name="Админ",
        last_name="Системы",
        role=roles["superadmin"],
    )


@pytest.fixture
def manager(db, roles):
    return User.objects.create_user(
        username="manager@deo.test",
        email="manager@deo.test",
        password="pass1234",
        first_name="Менеджер",
        last_name="Иванов",
        role=roles["project_manager"],
    )


@pytest.fixture
def developer(db, roles):
    return User.objects.create_user(
        username="dev@deo.test",
        email="dev@deo.test",
        password="pass1234",
        first_name="Разработчик",
        last_name="Код",
        role=roles["developer"],
    )


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def configured_settings(db, admin_user):
    """A fully configured AISettings row."""
    from apps.ai_assistant.models import AISettings

    return AISettings.objects.create(
        api_url="https://ai.example.com/v1",
        api_key="sk-test-secret-key-1234567890abcd",
        model="test/model",
        updated_by=admin_user,
    )


class _FakeProviderResponse:
    """Simulates the omniroute-style provider response (SSE or JSON)."""

    def __init__(self, status_code=200, sse=False, content="Ответ от ИИ", usage=None, error=None):
        self.status_code = status_code
        self._sse = sse
        self._content = content
        self._usage = usage or {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}
        self._error = error
        self.headers = {
            "content-type": "text/event-stream" if sse else "application/json",
        }
        self.text = error or ""

    def json(self):
        if self._sse:
            raise ValueError("SSE body is not JSON")
        if self._error:
            return {}
        return {
            "id": "chatcmpl-1",
            "choices": [{"message": {"role": "assistant", "content": self._content}}],
            "usage": self._usage,
        }

    def iter_lines(self, decode_unicode=True):
        if not self._sse:
            return []
        data = {
            "id": "chatcmpl-1",
            "object": "chat.completion.chunk",
            "choices": [{"index": 0, "delta": {"content": self._content}, "finish_reason": None}],
            "usage": self._usage,
        }
        return [f"data: {json.dumps(data)}", "data: [DONE]"]


@pytest.fixture
def FakeProviderResponse():
    return _FakeProviderResponse


@pytest.fixture
def mock_provider(monkeypatch):
    """Patch requests.post with a controllable fake response."""

    def _patch(response, exc=None):
        import requests

        def fake_post(*args, **kwargs):
            if exc:
                raise exc
            return response

        monkeypatch.setattr(requests, "post", fake_post)
        return fake_post

    return _patch
