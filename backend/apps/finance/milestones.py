import uuid
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, serializers
from rest_framework.response import Response
from common.permissions import IsOwner
from apps.projects.models import Project
from .models import Invoice, PaymentMilestone
from .control import received, balance


class MilestoneSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    amount = serializers.DecimalField(source="invoice.amount", max_digits=12, decimal_places=2, read_only=True)
    due_date = serializers.DateField(source="invoice.due_date", read_only=True)
    paid_amount = serializers.SerializerMethodField()
    remaining = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()
    def get_currency(self, obj): return getattr(settings, "CRM_BASE_CURRENCY", "KGS")
    def get_paid_amount(self, obj): return received(obj.invoice)
    def get_remaining(self, obj): return balance(obj.invoice)
    def get_status(self, obj):
        if obj.invoice.status == "cancelled": return "cancelled"
        if not balance(obj.invoice): return "paid"
        if obj.invoice.due_date < timezone.localdate(): return "overdue"
        return "partial" if received(obj.invoice) else "planned"
    class Meta:
        model = PaymentMilestone
        fields = ["id", "project", "project_name", "invoice", "title", "percentage", "position", "amount", "due_date", "paid_amount", "remaining", "status", "currency"]


class InstallmentInput(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    percentage = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=Decimal("0.01"), max_value=Decimal("100"))
    due_date = serializers.DateField()


class PlanInput(serializers.Serializer):
    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all())
    installments = InstallmentInput(many=True, min_length=1, max_length=20)
    def validate(self, attrs):
        if sum(p["percentage"] for p in attrs["installments"]) != 100:
            raise serializers.ValidationError("Сумма этапов должна составлять 100%")
        dates = [p["due_date"] for p in attrs["installments"]]
        if dates != sorted(dates):
            raise serializers.ValidationError("Сроки этапов должны идти по порядку")
        return attrs


class PaymentPlanView(generics.ListAPIView):
    permission_classes = [IsOwner]
    serializer_class = MilestoneSerializer
    def get_queryset(self):
        qs = PaymentMilestone.objects.select_related("invoice", "project").prefetch_related("invoice__payments")
        if self.request.query_params.get("project"):
            field = serializers.UUIDField()
            project_id = field.run_validation(self.request.query_params["project"])
            qs = qs.filter(project_id=project_id)
        if self.request.query_params.get("overdue") == "true":
            qs = qs.filter(invoice__due_date__lt=timezone.localdate()).exclude(invoice__status__in=["paid", "cancelled"])
        return qs
    @transaction.atomic
    def post(self, request):
        data = PlanInput(data=request.data)
        data.is_valid(raise_exception=True)
        project = Project.objects.select_for_update().get(pk=data.validated_data["project"].pk)
        if not project.budget or project.budget <= 0:
            raise serializers.ValidationError("Укажите положительный бюджет проекта")
        if project.payment_milestones.exists():
            raise serializers.ValidationError("График уже создан. Измените связанные счета вместо повторного создания.")
        installments = data.validated_data["installments"]
        allocated = Decimal("0")
        for index, row in enumerate(installments):
            amount = (project.budget * row["percentage"] / 100).quantize(Decimal("0.01")) if index < len(installments)-1 else project.budget-allocated
            if amount <= 0:
                raise serializers.ValidationError("Бюджет слишком мал для такого графика")
            allocated += amount
            invoice = Invoice.objects.create(project=project, client=project.client, number=f"PLAN-{uuid.uuid4().hex[:16].upper()}", amount=amount, issued_date=timezone.localdate(), due_date=row["due_date"], description=row["title"], created_by=request.user)
            PaymentMilestone.objects.create(project=project, invoice=invoice, title=row["title"], percentage=row["percentage"], position=index)
        return Response(MilestoneSerializer(self.get_queryset().filter(project=project), many=True).data, status=201)
