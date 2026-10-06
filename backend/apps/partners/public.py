from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.leads.defaults import ensure_default_stages
from apps.leads.models import Lead, LeadStage
from .models import Partner, Referral


class ReferralThrottle(AnonRateThrottle):
    rate = "10/hour"


class ReferralIntake(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ReferralThrottle]
    class Input(serializers.Serializer):
        request_id = serializers.UUIDField()
        contact_name = serializers.CharField(max_length=255)
        phone = serializers.CharField(min_length=6, max_length=20)
        email = serializers.EmailField(required=False, allow_blank=True)
        business_need = serializers.CharField(max_length=5000)
        consent = serializers.BooleanField()
        def validate_consent(self, value):
            if not value:
                raise serializers.ValidationError("Нужно согласие на обработку заявки")
            return value

    def get(self, request, code):
        get_object_or_404(Partner, code=code, active=True)
        return Response({"available": True})

    @transaction.atomic
    def post(self, request, code):
        partner = get_object_or_404(Partner.objects.select_for_update(), code=code, active=True)
        data = self.Input(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        existing = Referral.objects.filter(public_request_id=values["request_id"]).first()
        if existing:
            if existing.partner_id != partner.pk:
                raise serializers.ValidationError("Заявка уже зарегистрирована")
            return Response({"accepted": True})
        stage = LeadStage.objects.order_by("order", "pk").first()
        if not stage:
            ensure_default_stages()
            stage = LeadStage.objects.order_by("order", "pk").first()
        lead = Lead.objects.create(contact_name=values["contact_name"], phone=values["phone"], email=values.get("email", ""), business_need=values["business_need"], brief_completed=True, source="referral", current_stage=stage)
        Referral.objects.create(partner=partner, lead=lead, commission_rate=partner.commission_rate, public_request_id=values["request_id"])
        return Response({"accepted": True}, status=201)
