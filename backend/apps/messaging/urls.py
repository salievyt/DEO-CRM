from django.urls import path

from .views.accounts import (
    WhatsAppAccountCreateView,
    WhatsAppAccountDetailView,
    WhatsAppAccountListView,
)
from .views.conversations import (
    ConversationAssignView,
    ConversationCanSendView,
    ConversationCloseView,
    ConversationDetailView,
    ConversationFromLeadView,
    ConversationListCreateView,
    ConversationReadView,
    ConversationReopenView,
)
from .views.messages import (
    MessageListCreateView,
    MessageMediaView,
    MessagingUnreadCountView,
)
from .views.templates import WhatsAppTemplateListView

urlpatterns = [
    path("conversations/", ConversationListCreateView.as_view(), name="messaging-conversation-list"),
    path("conversations/from-lead/", ConversationFromLeadView.as_view(), name="messaging-conversation-from-lead"),
    path("conversations/<uuid:pk>/", ConversationDetailView.as_view(), name="messaging-conversation-detail"),
    path(
        "conversations/<uuid:conversation_pk>/messages/",
        MessageListCreateView.as_view(),
        name="messaging-conversation-messages",
    ),
    path("conversations/<uuid:pk>/read/", ConversationReadView.as_view(), name="messaging-conversation-read"),
    path("conversations/<uuid:pk>/close/", ConversationCloseView.as_view(), name="messaging-conversation-close"),
    path("conversations/<uuid:pk>/reopen/", ConversationReopenView.as_view(), name="messaging-conversation-reopen"),
    path("conversations/<uuid:pk>/assign/", ConversationAssignView.as_view(), name="messaging-conversation-assign"),
    path("conversations/<uuid:pk>/can-send/", ConversationCanSendView.as_view(), name="messaging-conversation-can-send"),
    path("messages/<uuid:pk>/media/", MessageMediaView.as_view(), name="messaging-message-media"),
    path("unread/", MessagingUnreadCountView.as_view(), name="messaging-unread"),
    path("whatsapp/accounts/", WhatsAppAccountListView.as_view(), name="messaging-whatsapp-account-list"),
    path("whatsapp/accounts/create/", WhatsAppAccountCreateView.as_view(), name="messaging-whatsapp-account-create"),
    path("whatsapp/accounts/<uuid:pk>/", WhatsAppAccountDetailView.as_view(), name="messaging-whatsapp-account-detail"),
    path("whatsapp/templates/", WhatsAppTemplateListView.as_view(), name="messaging-whatsapp-templates"),
]
