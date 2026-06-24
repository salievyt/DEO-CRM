from rest_framework import serializers


class ClientDashboardSerializer(serializers.Serializer):
    """Dashboard data for client cabinet."""
    active_projects = serializers.IntegerField()
    total_documents = serializers.IntegerField()
    open_invoices = serializers.IntegerField()
    unread_messages = serializers.IntegerField()


class ClientProjectProgressSerializer(serializers.Serializer):
    """Project progress for client."""
    id = serializers.UUIDField()
    name = serializers.CharField()
    status_name = serializers.CharField()
    status_color = serializers.CharField()
    progress = serializers.IntegerField()
    deadline = serializers.DateField()
