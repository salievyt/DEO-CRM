from rest_framework import serializers

from .models import CallRecord, PBXConnection, SipAccount


class PBXConnectionSerializer(serializers.ModelSerializer):
    api_key = serializers.CharField(
        write_only=True, required=False, allow_blank=True, trim_whitespace=True,
        help_text="API ключ/токен АТС. Хранится зашифрованным и никогда не возвращается.",
    )
    ami_password = serializers.CharField(
        write_only=True, required=False, allow_blank=True, trim_whitespace=True,
        help_text="AMI пароль. Хранится зашифрованным и никогда не возвращается.",
    )

    class Meta:
        model = PBXConnection
        fields = [
            "id", "name", "provider", "api_url", "api_key", "ami_host", "ami_port",
            "ami_user", "ami_password", "ws_url", "sip_domain", "status",
            "is_default", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        api_key = validated_data.pop("api_key", "") or ""
        ami_password = validated_data.pop("ami_password", "") or ""
        connection = PBXConnection(**validated_data)
        connection.set_api_key(api_key)
        connection.set_ami_password(ami_password)
        connection.save()
        return connection

    def update(self, instance, validated_data):
        api_key = validated_data.pop("api_key", "")
        ami_password = validated_data.pop("ami_password", "")
        if api_key:
            instance.set_api_key(api_key)
        if ami_password:
            instance.set_ami_password(ami_password)
        return super().update(instance, validated_data)


class SipAccountSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=False, allow_blank=True, trim_whitespace=True,
        help_text="Пароль SIP. Хранится зашифрованным и никогда не возвращается.",
    )

    class Meta:
        model = SipAccount
        fields = ["id", "connection", "extension", "password", "name", "user",
                  "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        password = validated_data.pop("password", "") or ""
        account = SipAccount(**validated_data)
        account.set_password(password)
        account.save()
        return account


class CallRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.get_full_name",
                                          read_only=True, default="")
    client_name = serializers.CharField(source="client.full_name",
                                        read_only=True, default="")

    class Meta:
        model = CallRecord
        fields = [
            "id", "connection", "external_call_id", "direction", "status",
            "call_type", "phone_number", "client", "client_name", "employee",
            "employee_name", "duration_seconds", "started_at", "ended_at",
            "metadata", "created_at",
        ]
        read_only_fields = fields
