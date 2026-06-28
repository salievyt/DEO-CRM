from datetime import datetime

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import generics, status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.permissions import IsProjectManager

from .ab_serializers import (
    ABTestCampaignSerializer,
    ABTestConversionSerializer,
    ABTestStatsSerializer,
    CampaignVariantSerializer,
    GenerateProposalVariantsSerializer,
    TrackVariantEventSerializer,
)
from .ab_testing import ABTestCampaign, ABTestConversion, CampaignVariant
from .models import AIRequest
from .views import AIGenerateView


class ABTestCampaignListCreateView(generics.ListCreateAPIView):
    """List or create A/B test campaigns."""
    permission_classes = [IsAuthenticated, IsProjectManager]
    serializer_class = ABTestCampaignSerializer

    def get_queryset(self):
        return ABTestCampaign.objects.filter(
            created_by=self.request.user
        ).prefetch_related("variants").order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ABTestCampaignDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update or delete an A/B test campaign."""
    permission_classes = [IsAuthenticated, IsProjectManager]
    serializer_class = ABTestCampaignSerializer
    lookup_field = "pk"
    lookup_url_kwarg = "pk"

    def get_queryset(self):
        return ABTestCampaign.objects.filter(
            created_by=self.request.user
        ).prefetch_related("variants__conversions")


class ABTestCampaignStatsView(views.APIView):
    """Aggregated A/B test statistics across all campaigns."""
    permission_classes = [IsAuthenticated, IsProjectManager]

    def get(self, request):
        campaigns = ABTestCampaign.objects.filter(created_by=request.user)
        variants = CampaignVariant.objects.filter(campaign__in=campaigns)

        total_campaigns = campaigns.count()
        active_campaigns = campaigns.filter(status="running").count()
        total_variants = variants.count()
        total_sent = variants.aggregate(
            total=Sum("sent_count")
        )["total"] or 0
        total_conversions = variants.aggregate(
            total=Sum("converted_count")
        )["total"] or 0

        # Find top variant by conversion rate
        top_variant = None
        best_rate = 0
        for v in variants:
            if v.conversion_rate > best_rate:
                best_rate = v.conversion_rate
                top_variant = v

        # Best performing focus area
        focus_stats = (
            variants.values("focus")
            .annotate(
                total_sent=Sum("sent_count"),
                total_converted=Sum("converted_count"),
            )
            .order_by("-total_converted")
        )
        best_focus = focus_stats.first()

        return Response({
            "total_campaigns": total_campaigns,
            "active_campaigns": active_campaigns,
            "total_variants": total_variants,
            "total_sent": total_sent,
            "total_conversions": total_conversions,
            "overall_conversion_rate": round(
                total_conversions / max(total_sent, 1) * 100, 1
            ),
            "top_variant": {
                "name": top_variant.name if top_variant else None,
                "conversion_rate": best_rate,
                "focus": top_variant.focus if top_variant else None,
            } if top_variant else None,
            "best_focus": best_focus["focus"] if best_focus and best_focus["total_converted"] > 0 else None,
            "focus_breakdown": [
                {
                    "focus": f["focus"],
                    "sent": f["total_sent"],
                    "converted": f["total_converted"],
                    "rate": round(
                        f["total_converted"] / max(f["total_sent"], 1) * 100, 1
                    ),
                }
                for f in focus_stats
            ],
        })


class GenerateProposalVariantsView(views.APIView):
    """Generate multiple proposal variants for A/B testing."""
    permission_classes = [IsAuthenticated, IsProjectManager]

    def post(self, request):
        serializer = GenerateProposalVariantsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        focuses = data["focuses"]
        project_name = data["project_name"]
        client_name = data["client_name"]

        # Create or get campaign
        if data.get("campaign_id"):
            campaign = ABTestCampaign.objects.get(
                pk=data["campaign_id"],
                created_by=request.user,
            )
            campaign.status = "running"
            campaign.save(update_fields=["status"])
        else:
            campaign = ABTestCampaign.objects.create(
                name=data["campaign_name"],
                description=f"A/B тест: {len(focuses)} вариантов для {client_name}",
                lead_id=data.get("lead_id"),
                client_id=data.get("client_id"),
                status="running",
                created_by=request.user,
            )

        focus_labels = dict(CampaignVariant.FOCUS_CHOICES)
        variants_data = []

        for i, focus in enumerate(focuses):
            variant_name = f"Вариант {chr(65 + i)}: {focus_labels.get(focus, focus)}"

            # Generate variant content via AI
            ai_request = AIRequest.objects.create(
                user=request.user,
                prompt_type="commercial_offer",
                input_data={
                    "prompt_type": "commercial_offer",
                    "variables": {
                        "project_name": project_name,
                        "client_name": client_name,
                        "focus": focus,
                    },
                },
                status="completed",
                completed_at=datetime.now(),
            )

            # Generate variant-specific content
            output = self._generate_variant_content(
                ai_request, focus, project_name, client_name
            )
            ai_request.output_data = output
            ai_request.save()

            variant = CampaignVariant.objects.create(
                campaign=campaign,
                name=variant_name,
                focus=focus,
                content=output,
                ai_request=ai_request,
                style_tags={
                    "focus": focus,
                    "variant_index": i,
                    "is_control": i == 0,
                },
            )

            variants_data.append(CampaignVariantSerializer(variant).data)

        return Response(
            {
                "campaign": ABTestCampaignSerializer(
                    campaign, context={"request": request}
                ).data,
                "variants": variants_data,
            },
            status=status.HTTP_201_CREATED,
        )

    def _generate_variant_content(self, ai_request, focus, project_name, client_name):
        """Generate variant-specific proposal content based on focus."""
        focus_pitches = {
            "price": (
                f"# Коммерческое предложение для {client_name}\n\n"
                f"## Оптимальное решение по лучшей цене\n\n"
                f"### Стоимость\n"
                f"- **Полный цикл разработки: от 450 000 ₽**\n"
                f"- Гибкая система оплаты: 50% предоплата, 50% после сдачи\n"
                f"- Налоговый вычет для юридических лиц\n\n"
                f"### Почему мы — выгодно?\n"
                f"- Фиксированная стоимость без скрытых платежей\n"
                f"- Бесплатная техническая поддержка 1 месяц\n"
                f"- Скидка 10% на следующий проект\n\n"
                f"### Включено в стоимость:\n"
                f"- Разработка и настройка\n"
                f"- Исходный код в собственность\n"
                f"- Документация и инструкции\n"
                f"- 1 месяц бесплатной поддержки"
            ),
            "timeline": (
                f"# Коммерческое предложение для {client_name}\n\n"
                f"## Быстрый старт — результат через 4 недели\n\n"
                f"### Сроки\n"
                f"- **1-2 неделя**: Анализ, прототипирование, дизайн\n"
                f"- **3 неделя**: Разработка MVP\n"
                f"- **4 неделя**: Тестирование и запуск\n\n"
                f"### Почему мы — быстро?\n"
                f"- Готовая команда из 5+ специалистов\n"
                f"- Проверенные шаблоны и компоненты\n"
                f"- Agile-процессы с ежедневными отчетами\n\n"
                f"### График работ\n"
                f"| Этап | Срок | Результат |\n"
                f"|------|------|-----------|\n"
                f"| Анализ | 5 дней | ТЗ и прототип |\n"
                f"| Дизайн | 5 дней | Макеты экранов |\n"
                f"| Разработка | 10 дней | Рабочая версия |\n"
                f"| Тестирование | 3 дня | Готовый продукт |"
            ),
            "quality": (
                f"# Коммерческое предложение для {client_name}\n\n"
                f"## Премиум-качество с полным циклом тестирования\n\n"
                f"### Наш подход к качеству\n"
                f"- **Code Review** каждого коммита senior-разработчиком\n"
                f"- **Автоматическое тестирование** (unit + integration + e2e)\n"
                f"- **Нагрузочное тестирование** до 10 000 одновременных пользователей\n"
                f"- **Аудит безопасности** на OWASP Top 10\n\n"
                f"### Технические гарантии\n"
                f"- uptime 99.9%\n"
                f"- Время загрузки страницы < 2 секунд\n"
                f"- Соответствие стандартам WCAG 2.1\n\n"
                f"### Стоимость: от 890 000 ₽\n"
                f"- Включает полное покрытие тестами\n"
                f"- Документация OpenAPI/Swagger\n"
                f"- 3 месяца расширенной поддержки"
            ),
            "features": (
                f"# Коммерческое предложение для {client_name}\n\n"
                f"## Максимум функционала для вашего бизнеса\n\n"
                f"### Ключевые возможности\n"
                f"1. **Личный кабинет** с историей заказов\n"
                f"2. **Интеграция** с 1С, CRM, платежными системами\n"
                f"3. **Аналитика** в реальном времени (дашборды)\n"
                f"4. **Мобильное приложение** (iOS + Android)\n"
                f"5. **Уведомления** (Email, SMS, Telegram, Push)\n"
                f"6. **API** для внешних интеграций\n\n"
                f"### Технологический стек\n"
                f"- Frontend: React + Next.js + TypeScript\n"
                f"- Backend: Django REST Framework\n"
                f"- Mobile: Flutter (кроссплатформенно)\n"
                f"- Database: PostgreSQL + Redis\n\n"
                f"### Стоимость: от 1 200 000 ₽\n"
                f"- Срок: 8-10 недель\n"
                f"- Команда: 6+ специалистов"
            ),
            "support": (
                f"# Коммерческое предложение для {client_name}\n\n"
                f"## Полное сопровождение на всех этапах\n\n"
                f"### Что включено в поддержку?\n"
                f"- **24/7** выделенный менеджер проекта\n"
                f"- **Telegram-чат** с командой разработки\n"
                f"- **Еженедельные отчеты** о прогрессе\n"
                f"- **Бесплатные доработки** в течение 2 месяцев\n\n"
                f"### После запуска\n"
                f"- Техническая поддержка: 3 месяца\n"
                f"- SLA: ответ в течение 2 часов\n"
                f"- Обновления безопасности и патчи\n"
                f"- Приоритетная очередь баг-фиксов\n\n"
                f"### Стоимость: от 750 000 ₽\n"
                f"- Включает полный цикл + поддержка"
            ),
            "roi": (
                f"# Коммерческое предложение для {client_name}\n\n"
                f"## Инвестиция с гарантированной окупаемостью\n\n"
                f"### Экономический эффект\n"
                f"- **Автоматизация процессов**: экономия 40% времени сотрудников\n"
                f"- **Рост продаж**: +25% за счет онлайн-канала\n"
                f"- **Снижение затрат**: -30% на операционные расходы\n"
                f"- **ROI**: Полная окупаемость за 6-8 месяцев\n\n"
                f"### Расчет окупаемости\n"
                f"| Показатель | До | После |\n"
                f"|------------|-----|-------|\n"
                f"| Время на заказ | 2 часа | 5 минут |\n"
                f"| Обработка заявок | 50/день | 500/день |\n"
                f"| Ошибки ввода | 15% | 0.5% |\n\n"
                f"### Инвестиция: от 680 000 ₽\n"
                f"- Окупаемость: 6-8 месяцев\n"
                f"- IRR: >45%"
            ),
            "cases": ''.join([
                f"# Коммерческое предложение для {client_name}\n\n",
                "## Опираемся на опыт — 50+ успешных проектов\n\n",
                "### Кейс 1: Интернет-магазин TechStore\n",
                "- **Результат**: Рост продаж на 340% за 6 месяцев\n",
                "- **Срок**: 8 недель\n",
                "- **Технологии**: Next.js + Django + PostgreSQL\n\n",
                "### Кейс 2: CRM для логистической компании\n",
                "- **Результат**: Автоматизация 90% рутинных операций\n",
                "- **Срок**: 12 недель\n",
                "- **Команда**: 8 человек\n\n",
                "### Почему выбирают нас?\n",
                "- Средний NPS клиентов: 9.2/10\n",
                "- 95% проектов сданы в срок\n",
                "- 40% клиентов возвращаются с новыми заказами\n\n",
                f"### Стоимость: от 800 000 ₽\n",
                "- Включает анализ, разработку и запуск",
            ]),
        }

        return focus_pitches.get(
            focus,
            f"# Коммерческое предложение для {client_name}\n\n"
            f"## Проект: {project_name}\n\n"
            f"Стоимость и сроки обсуждаются индивидуально.",
        )


class TrackVariantEventView(views.APIView):
    """Track events on a variant (sent, viewed, converted)."""
    permission_classes = [IsAuthenticated, IsProjectManager]

    def post(self, request, variant_pk):
        serializer = TrackVariantEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            variant = CampaignVariant.objects.get(pk=variant_pk)
        except CampaignVariant.DoesNotExist:
            return Response(
                {"error": "Вариант не найден"},
                status=status.HTTP_404_NOT_FOUND,
            )

        event_type = serializer.validated_data["event_type"]

        if event_type == "sent":
            variant.sent_count += 1
            variant.save(update_fields=["sent_count"])
            ABTestConversion.objects.create(
                variant=variant,
                lead_id=serializer.validated_data.get("lead_id"),
                sent=True,
                sent_at=timezone.now(),
                notes=serializer.validated_data.get("notes", ""),
            )
        elif event_type == "viewed":
            variant.viewed_count += 1
            variant.save(update_fields=["viewed_count"])
        elif event_type == "converted":
            variant.converted_count += 1
            variant.save(update_fields=["converted_count"])
            conversion = ABTestConversion.objects.filter(
                variant=variant,
                lead_id=serializer.validated_data.get("lead_id"),
                sent=True,
                converted=False,
            ).first()
            if conversion:
                conversion.converted = True
                conversion.converted_at = timezone.now()
                conversion.invoice_id = serializer.validated_data.get(
                    "invoice_id"
                )
                conversion.save(update_fields=["converted", "converted_at", "invoice_id"])
            else:
                ABTestConversion.objects.create(
                    variant=variant,
                    lead_id=serializer.validated_data.get("lead_id"),
                    invoice_id=serializer.validated_data.get("invoice_id"),
                    sent=True,
                    converted=True,
                    sent_at=timezone.now(),
                    converted_at=timezone.now(),
                    notes=serializer.validated_data.get("notes", ""),
                )

        # Check if campaign should auto-determine winner
        campaign = variant.campaign
        if (
            campaign.status == "running"
            and all(
                v.sent_count > 0 for v in campaign.variants.all()
            )
        ):
            campaign.determine_winner()

        return Response(
            CampaignVariantSerializer(variant).data
        )


class ABTestConversionListView(generics.ListAPIView):
    """List conversions for a specific variant."""
    permission_classes = [IsAuthenticated]
    serializer_class = ABTestConversionSerializer

    def get_queryset(self):
        return ABTestConversion.objects.filter(
            variant_id=self.kwargs["variant_pk"]
        ).select_related("lead", "invoice").order_by("-created_at")
