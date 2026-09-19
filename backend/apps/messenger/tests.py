from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User

from .models import Chat, ChatParticipant, Message


class UnreadCountViewTests(APITestCase):
    def test_counts_messages_when_participant_has_never_read_chat(self):
        user = User.objects.create_user(
            username="reader",
            email="reader@example.com",
            first_name="Reader",
            last_name="User",
            password="test-password",
        )
        sender = User.objects.create_user(
            username="sender",
            email="sender@example.com",
            first_name="Sender",
            last_name="User",
            password="test-password",
        )
        chat = Chat.objects.create(name="Test chat", created_by=sender)
        ChatParticipant.objects.create(chat=chat, user=user)
        ChatParticipant.objects.create(chat=chat, user=sender)
        Message.objects.create(chat=chat, sender=sender, content="Unread message")

        self.client.force_authenticate(user)
        response = self.client.get(reverse("messenger-unread"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"total_unread": 1})
