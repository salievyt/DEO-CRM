from rest_framework import serializers

from ..models import TelegramAccount


class TelegramAccountSerializer(serializers.ModelSerializer):
    bot_token = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        trim_whitespace=True,
        help_text="Bot token от @BotFather. Хранится зашифрованным и никогда не возвращается.",
    )

    class Meta:
        model = TelegramAccount
        fields = [
            "id", "name", "bot_token", "bot_username", "bot_name",
            "status", "is_default", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "bot_username", "bot_name", "created_at", "updated_at",
        ]

    def create(self, validated_data):
        token = validated_data.pop("bot_token", "") or ""
        account = TelegramAccount(**validated_data)
        if token:
            account.set_bot_token(token)
        account.save()
        return account

    def update(self, instance, validated_data):
        token = validated_data.pop("bot_token", "")
        if token:
            instance.set_bot_token(token)
        return super().update(instance, validated_data)
