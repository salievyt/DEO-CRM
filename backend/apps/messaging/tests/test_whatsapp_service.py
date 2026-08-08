from unittest import mock

import pytest
import requests

from apps.messaging.services.base import (
    InvalidTokenError,
    PermanentMessagingError,
    TemplateRequiredError,
    TemporaryMessagingError,
    WhatsAppApiUnavailableError,
)
from apps.messaging.services.whatsapp import WhatsAppService


class FakeResponse:
    def __init__(self, status_code, payload=None):
        self.status_code = status_code
        self._payload = payload if payload is not None else {}
        self.content = b"{}"

    def json(self):
        return self._payload


def _service(whatsapp_account):
    return WhatsAppService(whatsapp_account)


def _ok_send_response():
    return FakeResponse(200, {"messages": [{"id": "wamid.ABC123"}]})


def _mock_request(return_value=None, side_effect=None):
    return mock.patch.object(requests, "request", return_value=return_value,
                             side_effect=side_effect)


@pytest.mark.django_db
class TestSendText:
    def test_success_returns_external_id(self, whatsapp_account):
        service = _service(whatsapp_account)
        with _mock_request(_ok_send_response()) as request:
            result = service.send_text_message("79123456789", "Привет!")
        assert result == {"external_message_id": "wamid.ABC123"}
        kwargs = request.call_args.kwargs
        assert kwargs["json"]["type"] == "text"
        assert kwargs["json"]["to"] == "79123456789"
        assert kwargs["json"]["text"]["body"] == "Привет!"
        assert kwargs["headers"]["Authorization"].endswith("super-secret-token")

    def test_template_required_error(self, whatsapp_account):
        err = {"error": {"code": 131026, "message": "Message undeliverable", "error_subcode": 2490010}}
        service = _service(whatsapp_account)
        with _mock_request(FakeResponse(400, err)):
            with pytest.raises(TemplateRequiredError) as exc:
                service.send_text_message("79123456789", "hi")
        assert exc.value.code == "template_required"

    def test_invalid_token(self, whatsapp_account):
        err = {"error": {"code": 190, "message": "Invalid OAuth access token"}}
        service = _service(whatsapp_account)
        with _mock_request(FakeResponse(401, err)):
            with pytest.raises(InvalidTokenError):
                service.send_text_message("79123456789", "hi")

    def test_rate_limit_retries_then_fails(self, whatsapp_account):
        err = {"error": {"code": 130429, "message": "rate limit"}}
        service = _service(whatsapp_account)
        with _mock_request(FakeResponse(429, err)) as request:
            with pytest.raises(TemporaryMessagingError):
                service.send_text_message("79123456789", "hi")
        # 429 is retried (MAX_RETRIES + 1 attempts).
        assert request.call_count == 4

    def test_network_error_retries_then_unavailable(self, whatsapp_account):
        service = _service(whatsapp_account)
        with _mock_request(side_effect=requests.ConnectionError("boom")) as request:
            with pytest.raises(WhatsAppApiUnavailableError):
                service.send_text_message("79123456789", "hi")
        assert request.call_count == 4

    def test_unknown_api_error(self, whatsapp_account):
        err = {"error": {"code": 999, "message": "Something odd"}}
        service = _service(whatsapp_account)
        with _mock_request(FakeResponse(400, err)):
            with pytest.raises(PermanentMessagingError):
                service.send_text_message("79123456789", "hi")


@pytest.mark.django_db
class TestTemplateAndMedia:
    def test_send_template_builds_components(self, whatsapp_account):
        service = _service(whatsapp_account)
        with _mock_request(_ok_send_response()) as request:
            service.send_template_message(
                "79123456789", "welcome", "ru", parameters=["Иван"]
            )
        payload = request.call_args.kwargs["json"]
        assert payload["type"] == "template"
        assert payload["template"]["name"] == "welcome"
        assert payload["template"]["language"] == {"code": "ru"}
        body = [c for c in payload["template"]["components"] if c["type"] == "body"][0]
        assert body["parameters"] == [{"type": "text", "text": "Иван"}]

    def test_send_media_document(self, whatsapp_account):
        service = _service(whatsapp_account)
        with _mock_request(_ok_send_response()) as request:
            service.send_media(
                "79123456789", "document", "https://cdn/price.pdf",
                filename="price.pdf", caption="Прайс",
            )
        payload = request.call_args.kwargs["json"]
        assert payload["type"] == "document"
        assert payload["document"]["filename"] == "price.pdf"
        assert payload["document"]["caption"] == "Прайс"

    def test_unsupported_media_type(self, whatsapp_account):
        service = _service(whatsapp_account)
        with pytest.raises(PermanentMessagingError):
            service.send_media("79123456789", "movie", "https://x/y")

    def test_get_templates_normalizes(self, whatsapp_account):
        service = _service(whatsapp_account)
        raw = {
            "data": [{
                "name": "welcome", "language": {"code": "ru"},
                "category": "UTILITY", "status": "APPROVED",
                "components": [{"type": "BODY", "text": "Привет, {{1}}!"}],
                "updated_time": "2026-01-01T00:00:00+00:00",
            }]
        }
        with _mock_request(FakeResponse(200, raw)):
            result = service.get_templates()
        assert result[0]["name"] == "welcome"
        assert result[0]["status"] == "APPROVED"

    def test_mark_as_read_payload(self, whatsapp_account):
        service = _service(whatsapp_account)
        with _mock_request(FakeResponse(200, {})) as request:
            service.mark_message_as_read("wamid.1")
        payload = request.call_args.kwargs["json"]
        assert payload == {"messaging_product": "whatsapp", "status": "read", "message_id": "wamid.1"}


@pytest.mark.django_db
class TestGetMediaUrl:
    def test_resolves_media(self, whatsapp_account):
        service = _service(whatsapp_account)
        raw = {"url": "https://graph.facebook.com/xyz", "mime_type": "image/jpeg", "file_size": 1024}
        with _mock_request(FakeResponse(200, raw)):
            info = service.get_media_url("MEDIA_ID")
        assert info["url"].startswith("https://")
        assert info["mime_type"] == "image/jpeg"
