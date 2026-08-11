from django.db import models


class Channel(models.TextChoices):
    """Supported messaging channels."""

    WHATSAPP = "whatsapp", "WhatsApp"
    TELEGRAM = "telegram", "Telegram"
    EMAIL = "email", "Email"


class Direction(models.TextChoices):
    """Message direction relative to the CRM."""

    INCOMING = "incoming", "Входящее"
    OUTGOING = "outgoing", "Исходящее"


class MessageStatus(models.TextChoices):
    """Delivery lifecycle of a message.

    Outbound: pending → sent → delivered → read (final states come from the
    provider webhook, not from the send response).
    """

    PENDING = "pending", "Ожидает отправки"
    SENT = "sent", "Отправлено"
    DELIVERED = "delivered", "Доставлено"
    READ = "read", "Прочитано"
    FAILED = "failed", "Ошибка"


class MessageType(models.TextChoices):
    TEXT = "text", "Текст"
    IMAGE = "image", "Изображение"
    DOCUMENT = "document", "Документ"
    AUDIO = "audio", "Аудио"
    VIDEO = "video", "Видео"
    TEMPLATE = "template", "Шаблон"
    LOCATION = "location", "Геолокация"
    STICKER = "sticker", "Стикер"
    CONTACT = "contact", "Контакт"
    SYSTEM = "system", "Системное"


class ConversationStatus(models.TextChoices):
    OPEN = "open", "Открыт"
    PENDING = "pending", "Ожидание"
    CLOSED = "closed", "Закрыт"


class WhatsAppAccountStatus(models.TextChoices):
    ACTIVE = "active", "Активен"
    DISABLED = "disabled", "Отключён"
    INVALID_CREDENTIALS = "invalid_credentials", "Неверные учётные данные"
    RATE_LIMITED = "rate_limited", "Превышен лимит запросов"


class TelegramAccountStatus(models.TextChoices):
    ACTIVE = "active", "Активен"
    DISABLED = "disabled", "Отключён"
    INVALID_CREDENTIALS = "invalid_credentials", "Неверные учётные данные"
    RATE_LIMITED = "rate_limited", "Превышен лимит запросов"
