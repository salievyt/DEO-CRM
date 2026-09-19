from django.urls import path

from . import views

urlpatterns = [
    path("chats/", views.ChatListCreateView.as_view(), name="chat-list"),
    path("chats/<uuid:pk>/", views.ChatDetailView.as_view(), name="chat-detail"),
    path(
        "chats/<uuid:pk>/participants/",
        views.ChatParticipantsView.as_view(),
        name="chat-participants",
    ),
    path(
        "chats/<uuid:pk>/participants/<uuid:user_id>/",
        views.ChatParticipantsView.as_view(),
        name="chat-participant-detail",
    ),
    path(
        "chats/<uuid:pk>/read/",
        views.ChatMarkReadView.as_view(),
        name="chat-mark-read",
    ),
    path(
        "chats/<uuid:chat_pk>/messages/",
        views.MessageListView.as_view(),
        name="chat-messages",
    ),
    path("unread/", views.UnreadCountView.as_view(), name="messenger-unread"),
]
