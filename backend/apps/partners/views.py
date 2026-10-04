from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, serializers
from rest_framework.response import Response
from common.permissions import IsOwner
from .models import Partner, Referral, PartnerPayout
from .services import partner_totals


class PartnerSerializer(serializers.ModelSerializer):
    totals = serializers.SerializerMethodField()
    def get_totals(self, obj):
        return partner_totals(obj)
    class Meta:
        model = Partner
        fields = ["id", "name", "email", "phone", "commission_rate", "code", "active", "totals"]
        read_only_fields = ["id", "code"]


class PartnerList(generics.ListCreateAPIView):
    permission_classes = [IsOwner]
    serializer_class = PartnerSerializer
    queryset = Partner.objects.all()
    search_fields = ["name", "email", "phone"]


class PartnerDetail(generics.RetrieveUpdateAPIView):
    permission_classes = [IsOwner]
    serializer_class = PartnerSerializer
    queryset = Partner.objects.all()


class ReferralSerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source="lead.contact_name", read_only=True)
    deal = serializers.SerializerMethodField()
    def get_deal(self, obj):
        deal = getattr(obj.lead, "deal", None)
        return {"id": str(deal.pk), "title": deal.title, "status": deal.status} if deal else None
    class Meta:
        model = Referral
        fields = ["id", "lead", "contact_name", "deal", "project", "commission_rate", "created_at"]
        read_only_fields = ["commission_rate", "created_at"]
    def validate(self, attrs):
        if attrs.get("project") and attrs["project"].client_id != attrs["lead"].client_id:
            raise serializers.ValidationError("Проект и лид должны принадлежать одному клиенту")
        return attrs


class ReferralList(generics.ListCreateAPIView):
    permission_classes = [IsOwner]
    serializer_class = ReferralSerializer
    def get_queryset(self):
        return Referral.objects.filter(partner_id=self.kwargs["pk"]).select_related("lead").order_by("-created_at")
    def perform_create(self, serializer):
        partner = get_object_or_404(Partner, pk=self.kwargs["pk"], active=True)
        serializer.save(partner=partner, commission_rate=partner.commission_rate)


class PayoutSerializer(serializers.ModelSerializer):
    reference = serializers.CharField(max_length=120)
    class Meta:
        model = PartnerPayout
        fields = ["id", "amount", "reference", "paid_at"]
        read_only_fields = ["id", "paid_at"]
    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Сумма должна быть положительной")
        return value


class PayoutList(generics.ListCreateAPIView):
    permission_classes = [IsOwner]
    serializer_class = PayoutSerializer
    def get_queryset(self):
        return PartnerPayout.objects.filter(partner_id=self.kwargs["pk"]).order_by("-paid_at")
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        partner = get_object_or_404(Partner.objects.select_for_update(), pk=kwargs["pk"])
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        existing = PartnerPayout.objects.filter(reference=data["reference"]).first()
        if existing:
            if existing.partner_id != partner.pk or existing.amount != data["amount"]:
                raise serializers.ValidationError("Номер выплаты уже использован")
            return Response(self.get_serializer(existing).data)
        if data["amount"] > partner_totals(partner)["payable"]:
            raise serializers.ValidationError("Сумма превышает начисленную комиссию")
        serializer.save(partner=partner, created_by=request.user)
        return Response(serializer.data, status=201)
