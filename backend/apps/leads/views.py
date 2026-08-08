from django.db import transaction
from django.db.models import Count
from rest_framework import generics, permissions, serializers, status, views
from rest_framework.response import Response

from common.permissions import IsAdmin, IsProjectManager

from .models import Lead, LeadHistory, LeadStage
from .serializers import (
    LeadCreateSerializer,
    LeadDetailSerializer,
    LeadListSerializer,
    LeadMoveSerializer,
    LeadStageSerializer,
)


class PublicLeadCreateSerializer(serializers.Serializer):
    """Serializer for public lead form (no auth required)."""
    contact_name = serializers.CharField(max_length=255, error_messages={"required": "Укажите имя"})
    phone = serializers.CharField(max_length=20, error_messages={"required": "Укажите телефон"})
    email = serializers.EmailField(required=False, allow_blank=True)
    company_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    telegram = serializers.CharField(max_length=100, required=False, allow_blank=True)
    budget = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    service_type = serializers.ChoiceField(
        choices=[
            ("web-development", "Веб-разработка"),
            ("mobile-development", "Мобильная разработка"),
            ("design", "Дизайн"),
            ("marketing", "Маркетинг"),
            ("crm", "CRM-системы"),
            ("other", "Другое"),
        ],
        default="other",
    )

    def validate_phone(self, value):
        if not value or len(value.strip()) < 6:
            raise serializers.ValidationError("Укажите корректный номер телефона")
        return value

    def validate_contact_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Укажите ваше имя")
        return value.strip()


class PublicLeadCreateView(views.APIView):
    """Public endpoint for creating leads from landing page (no auth required)."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PublicLeadCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Find the first stage (e.g., "Новые заявки")
        default_stage = LeadStage.objects.first()

        with transaction.atomic():
            lead = Lead.objects.create(
                contact_name=serializer.validated_data["contact_name"],
                company_name=serializer.validated_data.get("company_name", ""),
                phone=serializer.validated_data["phone"],
                email=serializer.validated_data.get("email", ""),
                telegram=serializer.validated_data.get("telegram", ""),
                budget=serializer.validated_data.get("budget"),
                notes=serializer.validated_data.get("notes", ""),
                source="website",
                current_stage=default_stage,
            )

            LeadHistory.objects.create(
                lead=lead,
                from_stage=None,
                to_stage=lead.current_stage,
                notes=f"Заявка с сайта. Услуга: {serializer.validated_data.get('service_type', 'other')}",
            )

        return Response({
            "message": "Заявка успешно отправлена!",
            "lead_id": str(lead.id),
        }, status=status.HTTP_201_CREATED)


class LeadStageListView(generics.ListCreateAPIView):
    """List or create lead stages."""
    permission_classes = [permissions.IsAuthenticated]
    queryset = LeadStage.objects.all().order_by("order")
    serializer_class = LeadStageSerializer


class LeadStageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a lead stage."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = LeadStage.objects.all()
    serializer_class = LeadStageSerializer


class LeadListCreateView(generics.ListCreateAPIView):
    """List or create leads."""
    permission_classes = [permissions.IsAuthenticated, IsProjectManager]
    search_fields = ["contact_name", "company_name", "phone", "email"]
    ordering_fields = ["created_at", "budget"]
    filterset_fields = ["source", "is_active"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return LeadCreateSerializer
        return LeadListSerializer

    def get_queryset(self):
        qs = Lead.objects.select_related(
            "current_stage", "assigned_to"
        ).all()
        stage = self.request.query_params.get("stage")
        assigned = self.request.query_params.get("assigned_to")
        client = self.request.query_params.get("client")
        if stage:
            qs = qs.filter(current_stage_id=stage)
        if assigned:
            qs = qs.filter(assigned_to_id=assigned)
        if client:
            qs = qs.filter(client_id=client)
        return qs

    def perform_create(self, serializer):
        with transaction.atomic():
            lead = serializer.save(created_by=self.request.user)
            LeadHistory.objects.create(
                lead=lead,
                from_stage=None,
                to_stage=lead.current_stage,
                user=self.request.user,
                notes="Лид создан",
            )


class LeadDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a lead."""
    permission_classes = [permissions.IsAuthenticated, IsProjectManager]
    queryset = Lead.objects.select_related(
        "current_stage", "assigned_to", "created_by"
    ).all()
    serializer_class = LeadDetailSerializer


class LeadKanbanView(views.APIView):
    """Get leads grouped by stage for Kanban board."""
    permission_classes = [permissions.IsAuthenticated, IsProjectManager]

    def get(self, request):
        stages = LeadStage.objects.all().order_by("order")
        columns = []
        for stage in stages:
            leads = Lead.objects.filter(
                current_stage=stage, is_active=True
            ).select_related("assigned_to")
            columns.append({
                "id": str(stage.id),
                "title": stage.name,
                "color": stage.color,
                "leads": LeadListSerializer(leads, many=True).data,
            })
        return Response(columns)


class LeadMoveView(views.APIView):
    """Move lead to a different stage."""
    permission_classes = [permissions.IsAuthenticated, IsProjectManager]

    def post(self, request, pk):
        serializer = LeadMoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            lead = Lead.objects.get(pk=pk)
            new_stage = LeadStage.objects.get(pk=serializer.validated_data["stage_id"])
        except (Lead.DoesNotExist, LeadStage.DoesNotExist):
            return Response({"error": "Лид или этап не найден"}, status=404)

        old_stage = lead.current_stage
        lead.current_stage = new_stage
        lead.save()

        LeadHistory.objects.create(
            lead=lead,
            from_stage=old_stage,
            to_stage=new_stage,
            user=request.user,
            notes=serializer.validated_data.get("notes", ""),
        )

        return Response(LeadDetailSerializer(lead).data)


class LeadStatsView(views.APIView):
    """Lead statistics."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        stages = LeadStage.objects.annotate(
            lead_count=Count("leads")
        ).order_by("order")
        total = Lead.objects.count()
        active = Lead.objects.filter(is_active=True).count()
        return Response({
            "total": total,
            "active": active,
            "stages": LeadStageSerializer(stages, many=True).data,
        })
