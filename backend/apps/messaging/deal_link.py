from django.db.models.signals import post_save
from django.dispatch import receiver
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.deals.models import Deal
from .models import Conversation, Message
from .permissions import IsInboxStaff


def auto_link(conversation):
    if conversation.deal_id:
        return
    ids = list(Deal.objects.filter(client_id=conversation.contact_id, status="open").values_list("id", flat=True)[:2])
    if len(ids) == 1:
        Conversation.objects.filter(pk=conversation.pk, deal__isnull=True).update(deal_id=ids[0])


@receiver(post_save, sender=Conversation)
def conversation_created(sender, instance, created, **kwargs):
    if created:
        auto_link(instance)


@receiver(post_save, sender=Message)
def message_created(sender, instance, created, **kwargs):
    if created:
        auto_link(instance.conversation)


class ConversationDealView(APIView):
    permission_classes = [IsInboxStaff]

    def get(self, request, pk):
        conversation = get_object_or_404(Conversation, pk=pk)
        return Response({"deal": conversation.deal_id, "client": conversation.contact_id,
                         "options": list(Deal.objects.filter(client_id=conversation.contact_id).values("id", "title", "status"))})

    def patch(self, request, pk):
        conversation = get_object_or_404(Conversation, pk=pk)
        class Input(serializers.Serializer):
            deal = serializers.PrimaryKeyRelatedField(queryset=Deal.objects.filter(client_id=conversation.contact_id), allow_null=True)
        data = Input(data=request.data)
        data.is_valid(raise_exception=True)
        conversation.deal = data.validated_data["deal"]
        conversation.save(update_fields=["deal", "updated_at"])
        return Response({"deal": conversation.deal_id})
