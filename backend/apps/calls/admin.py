from django.contrib import admin

from .models import CallRecord, PBXConnection, SipAccount


@admin.register(PBXConnection)
class PBXConnectionAdmin(admin.ModelAdmin):
    list_display = ("name", "provider", "status", "is_default", "ami_host", "created_at")
    list_filter = ("provider", "status", "is_default")
    search_fields = ("name", "api_url", "ami_host", "sip_domain")
    readonly_fields = ("api_key_encrypted", "ami_password_encrypted", "created_at", "updated_at")
    exclude = ("api_key_encrypted", "ami_password_encrypted")

    def save_model(self, request, obj, form, change):
        api_key = form.cleaned_data.get("api_key")
        if api_key:
            obj.set_api_key(api_key)
        ami_password = form.cleaned_data.get("ami_password")
        if ami_password:
            obj.set_ami_password(ami_password)
        super().save_model(request, obj, form, change)

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)

        class PBXConnectionForm(form):
            api_key = admin.forms.CharField(
                required=False, widget=admin.widgets.AdminTextareaWidget,
                help_text="API ключ/токен АТС (хранится зашифрованным). Оставьте пустым, чтобы не менять.",
            )
            ami_password = admin.forms.CharField(
                required=False, widget=admin.widgets.AdminPasswordInput,
                help_text="AMI пароль (хранится зашифрованным). Оставьте пустым, чтобы не менять.",
            )

        return PBXConnectionForm


@admin.register(SipAccount)
class SipAccountAdmin(admin.ModelAdmin):
    list_display = ("extension", "name", "user", "connection", "is_active")
    list_filter = ("is_active",)
    search_fields = ("extension", "name")
    raw_id_fields = ("user", "connection")
    readonly_fields = ("password_encrypted", "created_at")
    exclude = ("password_encrypted",)

    def save_model(self, request, obj, form, change):
        password = form.cleaned_data.get("password")
        if password:
            obj.set_password(password)
        super().save_model(request, obj, form, change)

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)

        class SipAccountForm(form):
            password = admin.forms.CharField(
                required=False, widget=admin.widgets.AdminPasswordInput,
                help_text="Пароль SIP (хранится зашифрованным). Оставьте пустым, чтобы не менять.",
            )

        return SipAccountForm


@admin.register(CallRecord)
class CallRecordAdmin(admin.ModelAdmin):
    list_display = ("direction", "status", "call_type", "phone_number", "employee",
                    "duration_seconds", "started_at")
    list_filter = ("direction", "status", "call_type")
    search_fields = ("phone_number", "external_call_id")
    raw_id_fields = ("client", "employee", "connection")
