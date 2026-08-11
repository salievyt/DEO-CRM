from django.db import models


class PBXProvider(models.TextChoices):
    """Supported PBX (АТС) providers."""

    ASTERISK = "asterisk", "Asterisk / FreePBX"
    MIKOPBX = "mikopbx", "MikoPBX"
    YEASTAR = "yeastar", "Yeastar"
    GRANDSTREAM = "grandstream", "Grandstream"
    OTHER = "other", "Другая"


class PBXConnectionStatus(models.TextChoices):
    CONNECTED = "connected", "Подключен"
    DISABLED = "disabled", "Отключен"
    ERROR = "error", "Ошибка"


class CallDirection(models.TextChoices):
    INCOMING = "incoming", "Входящий"
    OUTGOING = "outgoing", "Исходящий"


class CallRecordStatus(models.TextChoices):
    ANSWERED = "answered", "Отвечен"
    MISSED = "missed", "Пропущен"
    BUSY = "busy", "Занято"
    FAILED = "failed", "Не удался"
    CANCELED = "canceled", "Отменен"
    VOICEMAIL = "voicemail", "Голосовая почта"


class CallRecordType(models.TextChoices):
    INTERNAL = "internal", "Внутренний"
    EXTERNAL = "external", "Внешний"
