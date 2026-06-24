import uuid

from django.db import models


class Chat(models.Model):
    """Chat room for messaging."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, blank=True, verbose_name="Название")
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, null=True, blank=True,
        related_name="chats", verbose_name="Проект"
    )
    is_group = models.BooleanField(default=False, verbose_name="Групповой")
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True,
        verbose_name="Создал"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлен")

    class Meta:
        verbose_name = "Чат"
        verbose_name_plural = "Чаты"
        ordering = ["-updated_at"]

    def __str__(self):
        return self.name or f"Чат {self.id}"

    @property
    def last_message(self):
        return self.messages.order_by("-created_at").first()


class ChatParticipant(models.Model):
    """Participants of a chat."""
    chat = models.ForeignKey(
        Chat, on_delete=models.CASCADE, related_name="participants",
        verbose_name="Чат"
    )
    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, null=True, blank=True,
        verbose_name="Пользователь"
    )
    client = models.ForeignKey(
        "clients.Client", on_delete=models.CASCADE, null=True, blank=True,
        verbose_name="Клиент"
    )
    joined_at = models.DateTimeField(auto_now_add=True, verbose_name="Присоединился")
    last_read_at = models.DateTimeField(null=True, blank=True, verbose_name="Последнее прочтение")

    class Meta:
        unique_together = ("chat", "user")
        verbose_name = "Участник чата"
        verbose_name_plural = "Участники чата"


class Message(models.Model):
    """Message in a chat."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chat = models.ForeignKey(
        Chat, on_delete=models.CASCADE, related_name="messages",
        verbose_name="Чат"
    )
    sender = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="sent_messages", verbose_name="Отправитель"
    )
    client_sender = models.ForeignKey(
        "clients.Client", on_delete=models.SET_NULL, null=True, blank=True,
        verbose_name="Отправитель (клиент)"
    )
    content = models.TextField(verbose_name="Содержание")
    file_url = models.URLField(blank=True, verbose_name="URL файла")
    file_name = models.CharField(max_length=255, blank=True, verbose_name="Имя файла")
    voice_url = models.URLField(blank=True, verbose_name="URL голосового")
    voice_duration = models.IntegerField(default=0, verbose_name="Длительность (сек)")
    reply_to = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="replies", verbose_name="Ответ на"
    )
    edited_at = models.DateTimeField(null=True, blank=True, verbose_name="Изменен")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "Сообщение"
        verbose_name_plural = "Сообщения"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["chat", "created_at"]),
        ]

    def __str__(self):
        return f"{self.sender or self.client_sender}: {self.content[:50]}..."


class MessageRead(models.Model):
    """Track read receipts."""
    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, related_name="read_by",
        verbose_name="Сообщение"
    )
    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, verbose_name="Пользователь"
    )
    read_at = models.DateTimeField(auto_now_add=True, verbose_name="Прочитано")

    class Meta:
        unique_together = ("message", "user")
        verbose_name = "Прочтение"
        verbose_name_plural = "Прочтения"


class MessageReaction(models.Model):
    """Reactions to messages."""
    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, related_name="reactions",
        verbose_name="Сообщение"
    )
    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, verbose_name="Пользователь"
    )
    emoji = models.CharField(max_length=50, verbose_name="Эмодзи")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("message", "user", "emoji")
        verbose_name = "Реакция"
        verbose_name_plural = "Реакции"
