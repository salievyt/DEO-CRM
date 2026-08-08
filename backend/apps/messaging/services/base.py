"""Abstract messaging channel layer.

Every future channel (Telegram, Email, Instagram...) implements
``BaseMessagingService`` with the same interface, so the CRM-side
code (views, serializers, webhook processing) never knows which provider
is behind a conversation.
"""
from abc import ABC, abstractmethod


class MessagingServiceError(Exception):
    """Base error. ``user_message`` is safe to show to a manager in the UI."""

    code = "messaging_error"

    def __init__(self, message: str, *, code: str | None = None, details: dict | None = None):
        super().__init__(message)
        self.user_message = message
        if code:
            self.code = code
        self.details = details or {}


class PermanentMessagingError(MessagingServiceError):
    """Non-retriable error (invalid token, invalid template, bad phone...)."""

    code = "permanent_error"


class TemporaryMessagingError(MessagingServiceError):
    """Retriable error (network timeout, 5xx, rate limit...)."""

    code = "temporary_error"


class TemplateRequiredError(PermanentMessagingError):
    """The 24h customer-service window is closed — a template message is required."""

    code = "template_required"

    def __init__(self, message: str, *, details: dict | None = None):
        super().__init__(message, code="template_required", details=details or {})


class InvalidPhoneError(PermanentMessagingError):
    code = "invalid_phone"


class InvalidTokenError(PermanentMessagingError):
    code = "invalid_token"


class WhatsAppApiUnavailableError(TemporaryMessagingError):
    code = "whatsapp_api_unavailable"


class BaseMessagingService(ABC):
    """Common contract for channel services."""

    channel: str = "generic"

    def __init__(self, account=None):
        self.account = account

    @abstractmethod
    def send_text_message(self, to: str, text: str, **kwargs) -> dict:
        """Send a free-form text message. Returns provider metadata dict."""

    @abstractmethod
    def send_media(self, to: str, media_type: str, media_url: str, **kwargs) -> dict:
        """Send an image/document/audio/video."""

    @abstractmethod
    def send_template_message(self, to: str, template_name: str, language: str, **kwargs) -> dict:
        """Send an approved template message."""

    @abstractmethod
    def mark_message_as_read(self, message_id: str) -> None:
        """Notify the provider the message was read by the operator."""
