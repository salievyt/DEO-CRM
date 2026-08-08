from rest_framework import serializers

from ..models import WhatsAppAccount


class WhatsAppAccountSerializer(serializers.ModelSerializer):
    access_token = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        trim_whitespace=True,
        help_text="Graph API access token. Хранится зашифрованным и никогда не возвращается.",
    )

    class Meta:
        model = WhatsAppAccount
        fields = [
            "id", "name", "business_account_id", "phone_number_id",
            "display_phone_number", "access_token", "status", "is_default",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        token = validated_data.pop("access_token", "") or ""
        account = WhatsAppAccount(**validated_data)
        if token:
            account.set_access_token(token)
        account.save()
        return account

    def update(self, instance, validated_data):
        token = validated_data.pop("access_token", "")
        if token:
            instance.set_access_token(token)
        return super().update(instance, validated_data)
