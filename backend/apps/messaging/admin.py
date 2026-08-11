from django.contrib import admin

from .models import Conversation, Message, TelegramAccount, WhatsAppAccount


@admin.register(TelegramAccount)
class TelegramAccountAdmin(admin.ModelAdmin):
    list_display = (
        "name", "bot_username", "bot_name", "status", "is_default",
        "webhook_secret",
    )
    list_filter = ("status", "is_default")
    search_fields = ("name", "bot_username", "bot_name")
    readonly_fields = ("bot_token_encrypted", "created_at", "updated_at")
    exclude = ("bot_token_encrypted",)

    def save_model(self, request, obj, form, change):
        token = form.cleaned_data.get("bot_token")
        if token:
            obj.set_bot_token(token)
        super().save_model(request, obj, form, change)

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)

        class TelegramAccountForm(form):
            bot_token = admin.forms.CharField(
                required=False,
                widget=admin.widgets.AdminTextareaWidget,
                help_text="Bot token от @BotFather (хранится в зашифрованном виде). Оставьте пустым, чтобы не менять.",
            )

        return TelegramAccountForm


@admin.register(WhatsAppAccount)
class WhatsAppAccountAdmin(admin.ModelAdmin):
    list_display = (
        "name", "display_phone_number", "business_account_id",
        "phone_number_id", "status", "is_default",
    )
    list_filter = ("status", "is_default")
    search_fields = ("name", "display_phone_number", "business_account_id")
    readonly_fields = ("access_token_encrypted", "created_at", "updated_at")
    exclude = ("access_token_encrypted",)

    def save_model(self, request, obj, form, change):
        token = form.cleaned_data.get("access_token")
        if token:
            obj.set_access_token(token)
        super().save_model(request, obj, form, change)

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)

        class WhatsAppAccountForm(form):
            access_token = admin.forms.CharField(
                required=False,
                widget=admin.widgets.AdminTextareaWidget,
                help_text="Graph API access token (хранится в зашифрованном виде). Оставьте пустым, чтобы не менять.",
            )

        return WhatsAppAccountForm


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = (
        "contact", "channel", "status", "assigned_user",
        "unread_count", "last_message_at",
    )
    list_filter = ("channel", "status")
    search_fields = ("contact__first_name", "contact__last_name", "contact__phone")
    raw_id_fields = ("contact", "assigned_user", "whatsapp_account", "telegram_account")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = (
        "conversation", "direction", "type", "status",
        "external_message_id", "created_at",
    )
    list_filter = ("direction", "type", "status", "channel")
    search_fields = ("text", "external_message_id")
    raw_id_fields = ("conversation", "contact", "sender")
