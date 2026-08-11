"""WhatsApp Business Cloud API client.

Every HTTP request to Meta's Graph API lives in this module. Views and
webhooks never call the API directly — they go through :class:`WhatsAppService`.
"""
import logging
import time

import requests
from django.conf import settings

from ..logging import log_event
from .base import (
    BaseMessagingService,
    InvalidPhoneError,
    InvalidTokenError,
    PermanentMessagingError,
    TemplateRequiredError,
    TemporaryMessagingError,
    WhatsAppApiUnavailableError,
)

logger = logging.getLogger("messaging.whatsapp")

# Error codes that mean "free-form message is not allowed now".
TEMPLATE_REQUIRED_CODES = {131026, 131042, 131047, 131056, 132000, 132001, 133010}
# Rate limiting / temporary overload.
RETRYABLE_CODES = {130429, 80007, 4}
# Authentication problems.
TOKEN_ERROR_CODES = {190, 100}

MEDIA_TYPES = {"image", "document", "audio", "video", "sticker"}

DEFAULT_TIMEOUT = 15
MAX_RETRIES = 3


class WhatsAppService(BaseMessagingService):
    """Wraps the WhatsApp Business Cloud API (send messages, media, templates)."""

    channel = "whatsapp"

    def __init__(self, account):
        self.account = account

    # ------------------------------------------------------------------ urls
    @property
    def _api_version(self) -> str:
        return getattr(settings, "WHATSAPP_API_VERSION", "v21.0").lstrip("/")

    @property
    def _base_url(self) -> str:
        return f"https://graph.facebook.com/{self._api_version}"

    @property
    def _messages_url(self) -> str:
        return f"{self._base_url}/{self.account.phone_number_id}/messages"

    @property
    def _token(self) -> str:
        token = getattr(self.account, "access_token", "") or settings.WHATSAPP_ACCESS_TOKEN
        if not token:
            raise InvalidTokenError("WhatsApp access token не настроен", code="token_missing")
        return token

    # ---------------------------------------------------------------- helpers
    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }

    @staticmethod
    def _parse_error_body(body) -> dict:
        if isinstance(body, dict):
            error = body.get("error") or {}
            if isinstance(error, dict):
                return {
                    "code": error.get("code"),
                    "subcode": error.get("error_subcode"),
                    "message": error.get("message", "WhatsApp API error"),
                }
        return {}

    def _raise_for_error(self, response: requests.Response):
        """Map a Graph API error payload to a typed exception."""
        info = self._parse_error_body(response.json() if response.content else {})
        code = info.get("code")
        message = info.get("message") or f"HTTP {response.status_code}"

        if response.status_code in (401, 403) or code in TOKEN_ERROR_CODES:
            log_event("whatsapp.api.error", level=logging.WARNING, code=code, message=message)
            raise InvalidTokenError(
                "Неверный или истёкший токен WhatsApp. Проверьте настройки аккаунта.",
                code=f"http_{response.status_code}",
                details={"api_code": code},
            )
        if code in TEMPLATE_REQUIRED_CODES:
            raise TemplateRequiredError(
                "Окно обслуживания (24 часа) закрыто — отправьте сообщение по шаблону.",
                details={"api_code": code, "api_message": message},
            )
        if code in RETRYABLE_CODES or response.status_code == 429:
            raise TemporaryMessagingError(
                "WhatsApp временно недоступен (лимит запросов). Попробуйте позже.",
                code=f"api_{code}",
            )
        if response.status_code >= 500:
            raise WhatsAppApiUnavailableError(
                "WhatsApp API временно недоступен. Попробуйте позже.",
                code=f"http_{response.status_code}",
            )
        raise PermanentMessagingError(
            _friendly_message(code, message),
            code=f"api_{code or response.status_code}",
            details={"api_code": code, "api_message": message},
        )

    def _request(self, method: str, url: str, *, payload: dict | None = None,
                 params: dict | None = None, timeout: float | None = None) -> dict:
        """Perform a request with bounded retries for transient failures."""
        timeout = timeout or getattr(settings, "WHATSAPP_API_TIMEOUT", DEFAULT_TIMEOUT)
        last_error = None

        for attempt in range(MAX_RETRIES + 1):
            try:
                response = requests.request(
                    method, url, json=payload, params=params,
                    headers=self._headers(), timeout=timeout,
                )
            except requests.RequestException as exc:
                last_error = exc
                if attempt < MAX_RETRIES:
                    time.sleep(min(2 ** attempt, 8))
                    continue
                log_event("whatsapp.api.error", level=logging.ERROR,
                          error="network_error", attempt=attempt)
                raise WhatsAppApiUnavailableError(
                    f"Нет соединения с WhatsApp API: {exc.__class__.__name__}"
                ) from exc

            if response.status_code < 500 and response.status_code != 429:
                return self._handle_response(response)

            # Transient — retry with backoff.
            if attempt < MAX_RETRIES:
                time.sleep(min(2 ** attempt, 8))
                continue
            return self._handle_response(response)

        raise last_error  # pragma: no cover

    def _handle_response(self, response: requests.Response) -> dict:
        if 200 <= response.status_code < 300:
            try:
                data = response.json()
            except ValueError:
                data = {}
            # Normalize the send response.
            messages = (data or {}).get("messages")
            if messages:
                return {"external_message_id": messages[0].get("id", "")}
            if data.get("error"):
                self._raise_for_error(response)
            return data
        self._raise_for_error(response)
        return {}  # pragma: no cover

    # ------------------------------------------------------------- messaging
    def send_text_message(self, to: str, text: str, *, preview_url: bool = False) -> dict:
        """Send a free-form text message (24h window must be open)."""
        if not to:
            raise InvalidPhoneError("Не указан номер получателя")
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {"preview_url": preview_url, "body": text},
        }
        data = self._request("POST", self._messages_url, payload=payload)
        log_event("whatsapp.message.sent", direction="outgoing", type="text")
        return data

    def send_template_message(self, to: str, template_name: str, language: str,
                              *, parameters: list | None = None,
                              header_parameters: list | None = None,
                              buttons: list[dict] | None = None) -> dict:
        """Send an approved message template.

        ``parameters`` are the body parameter values, ``header_parameters``
        map to the header (e.g. image/documents for template headers).
        """
        if not to:
            raise InvalidPhoneError("Не указан номер получателя")
        components: list[dict] = []
        if header_parameters:
            components.append({"type": "header", "parameters": header_parameters})
        if parameters:
            components.append({
                "type": "body",
                "parameters": [{"type": "text", "text": str(p)} for p in parameters],
            })
        if buttons:
            components.append({"type": "button", "sub_type": "quick_reply",
                               "index": "0", "parameters": buttons})

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language},
            },
        }
        if components:
            payload["template"]["components"] = components

        data = self._request("POST", self._messages_url, payload=payload)
        log_event("whatsapp.message.sent", direction="outgoing", type="template",
                  template=template_name, language=language)
        return data

    def send_media(self, to: str, media_type: str, media_url: str, *,
                   caption: str | None = None, filename: str | None = None) -> dict:
        """Send an image / document / audio / video / sticker by URL."""
        if media_type not in MEDIA_TYPES:
            raise PermanentMessagingError(
                f"Неподдерживаемый тип медиа: {media_type}", code="unsupported_media"
            )
        if not to:
            raise InvalidPhoneError("Не указан номер получателя")

        media_obj: dict = {"link": media_url}
        if caption:
            media_obj["caption"] = caption
        if media_type == "document" and filename:
            media_obj["filename"] = filename

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": media_type,
            media_type: media_obj,
        }
        data = self._request("POST", self._messages_url, payload=payload)
        log_event("whatsapp.message.sent", direction="outgoing", type=media_type)
        return data

    def mark_message_as_read(self, message_id: str) -> None:
        """Mark an inbound message as read (updates the green checkmarks)."""
        payload = {
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id,
        }
        self._request("POST", self._messages_url, payload=payload)

    # ------------------------------------------------------ connection test
    def test_connection(self) -> dict:
        """Validate the access token and phone number access against Graph API.

        Returns a structured result dict; never raises for API failures — the
        caller gets ``ok`` + a human-readable ``error`` instead.
        """
        result: dict = {"ok": False, "token_valid": False, "phone_checked": False}

        # 1) Validate the token itself via /debug_token.
        try:
            token = self._token
        except InvalidTokenError as exc:
            result["error"] = str(exc)
            return result

        try:
            debug = self._request(
                "GET", f"{self._base_url}/debug_token",
                params={"input_token": token}, timeout=10,
            )
            data = debug.get("data", {}) or {}
            result["token_valid"] = bool(data.get("is_valid"))
            result["token_type"] = data.get("type")
            result["expires_at"] = data.get("expires_at")
            result["scopes"] = data.get("scopes", [])
            if not result["token_valid"]:
                result["error"] = "Токен недействителен или истёк. Сгенерируйте новый permanent token в Meta."
                return result
        except InvalidTokenError as exc:
            result["error"] = str(exc)
            return result
        except MessagingServiceError as exc:
            result["error"] = str(exc)
            return result

        # 2) Validate that the token can read the phone number.
        phone_number_id = getattr(self.account, "phone_number_id", "")
        if phone_number_id:
            try:
                info = self._request(
                    "GET", f"{self._base_url}/{phone_number_id}",
                    params={"fields": "display_phone_number,verified_name,quality_rating"},
                    timeout=10,
                )
                result["phone_checked"] = True
                result["display_phone_number"] = info.get("display_phone_number")
                result["verified_name"] = info.get("verified_name")
                result["quality_rating"] = info.get("quality_rating")
            except MessagingServiceError as exc:
                result["error"] = str(exc)
                result["phone_error"] = str(exc)
                return result
        else:
            result["error"] = "Укажите Phone Number ID для проверки."
            return result

        result["ok"] = True
        return result

    # ------------------------------------------------------------ templates
    def get_templates(self) -> list[dict]:
        """List approved + pending templates of the WABA (cached by the caller)."""
        url = f"{self._base_url}/{self.account.business_account_id}/message_templates"
        data = self._request(
            "GET", url,
            params={
                "limit": 100,
                "fields": "name,language,category,status,components,updated_time",
            },
        )
        return data.get("data", [])

    # ---------------------------------------------------------------- media
    def get_media_url(self, media_id: str) -> dict:
        """Resolve a media ID to a short-lived download URL."""
        url = f"{self._base_url}/{media_id}"
        data = self._request("GET", url)
        return {
            "url": data.get("url", ""),
            "mime_type": data.get("mime_type", ""),
            "file_size": data.get("file_size", 0),
            "sha256": data.get("sha256", ""),
        }

    # Note: WhatsApp has no "get message status" endpoint — final delivery
    # statuses (sent/delivered/read/failed) arrive exclusively through the
    # webhook and are handled by ``webhooks.whatsapp``.


def _friendly_message(code, api_message) -> str:
    known = {
        131000: "Неверный формат сообщения WhatsApp",
        131005: "Получатель не найден в WhatsApp",
        131008: "Номер не зарегистрирован в WhatsApp",
        131026: "Окно обслуживания закрыто — отправьте шаблонное сообщение",
        132000: "Ошибка при отправке медиафайла",
        132012: "Файл превышает допустимый размер",
        133010: "Окно обслуживания закрыто — отправьте шаблонное сообщение",
    }
    return known.get(code, api_message or "Ошибка WhatsApp API")
