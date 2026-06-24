from django.contrib import admin

from .models import Chat, ChatParticipant, Message, MessageReaction


class ChatParticipantInline(admin.TabularInline):
    model = ChatParticipant
    extra = 1


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ["created_at"]


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ["name", "project", "is_group", "created_at"]
    list_filter = ["is_group"]
    inlines = [ChatParticipantInline, MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["sender", "chat", "content", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["content"]
