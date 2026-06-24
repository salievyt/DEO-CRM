from datetime import datetime

from rest_framework import generics, status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.permissions import IsProjectManager

from .models import AIRequest, AIPromptTemplate
from .serializers import AIGenerateSerializer, AIRequestSerializer, AIPromptTemplateSerializer


class AIGenerateView(views.APIView):
    """Generate content using AI."""
    permission_classes = [IsAuthenticated, IsProjectManager]

    def post(self, request, prompt_type):
        serializer = AIGenerateSerializer(data={
            "prompt_type": prompt_type,
            **request.data,
        })
        serializer.is_valid(raise_exception=True)

        # Find template
        template = AIPromptTemplate.objects.filter(
            prompt_type=prompt_type
        ).first()

        # Create request record
        ai_request = AIRequest.objects.create(
            user=request.user,
            template=template,
            prompt_type=prompt_type,
            input_data=request.data,
            status="completed",  # Simplified: would be async in production
            completed_at=datetime.now(),
        )

        # Generate mock output (replace with actual LLM call)
        output = self._generate_mock(ai_request, prompt_type)
        ai_request.output_data = output
        ai_request.save()

        return Response({
            "id": str(ai_request.id),
            "output": output,
            "status": "completed",
        })

    def _generate_mock(self, ai_request, prompt_type):
        """Generate mock content (placeholder for actual LLM integration)."""
        variables = ai_request.input_data.get("variables", {})
        project_name = variables.get("project_name", "Проект")
        client_name = variables.get("client_name", "Клиент")

        templates = {
            "tz": (
                f"# Техническое задание на проект: {project_name}\n\n"
                f"## 1. Общая информация\n"
                f"- Заказчик: {client_name}\n"
                f"- Исполнитель: DEO STUDIO\n"
                f"- Проект: {project_name}\n\n"
                f"## 2. Цели проекта\n"
                f"[Описание целей проекта]\n\n"
                f"## 3. Функциональные требования\n"
                f"### 3.1. Основные модули\n"
                f"- Модуль аутентификации\n"
                f"- Модуль управления данными\n"
                f"- Модуль отчетности\n\n"
                f"## 4. Технические требования\n"
                f"- Backend: Django REST Framework\n"
                f"- Frontend: React / Next.js\n"
                f"- Database: PostgreSQL\n\n"
                f"## 5. Сроки и этапы\n"
                f"1. Анализ и проектирование - 1 неделя\n"
                f"2. Разработка - 4 недели\n"
                f"3. Тестирование - 1 неделя\n"
                f"4. Запуск - 3 дня"
            ),
            "commercial_offer": (
                f"# Коммерческое предложение для {client_name}\n\n"
                f"## Проект: {project_name}\n\n"
                f"### Стоимость работ\n"
                f"- Анализ и проектирование: 100 000 ₽\n"
                f"- Дизайн: 150 000 ₽\n"
                f"- Разработка: 400 000 ₽\n"
                f"- Тестирование: 80 000 ₽\n"
                f"- **Итого: 730 000 ₽**\n\n"
                f"### Сроки\n"
                f"- Старт: [дата]\n"
                f"- Завершение: через 6-8 недель\n\n"
                f"### Включено\n"
                f"- Полный цикл разработки\n"
                f"- Техническая поддержка 1 месяц\n"
                f"- Исходный код\n"
                f"- Документация"
            ),
            "contract": (
                f"# Договор на разработку\n\n"
                f"## {project_name}\n\n"
                f"**Заказчик:** {client_name}\n"
                f"**Исполнитель:** DEO STUDIO\n\n"
                f"### 1. Предмет договора\n"
                f"Исполнитель обязуется выполнить работы по разработке {project_name}, "
                f"а Заказчик обязуется принять и оплатить работы.\n\n"
                f"### 2. Стоимость и порядок расчетов\n"
                f"2.1. Общая стоимость работ составляет [сумма] ₽\n"
                f"2.2. Оплата производится поэтапно согласно календарному плану\n\n"
                f"### 3. Сроки выполнения\n"
                f"3.1. Начало: [дата]\n"
                f"3.2. Окончание: [дата]\n\n"
                f"### 4. Подписи сторон\n"
                f"______/ {client_name} /\n"
                f"______/ DEO STUDIO /"
            ),
            "summary": (
                f"## Сводка по проекту {project_name}\n\n"
                f"- **Статус:** Активен\n"
                f"- **Прогресс:** 65%\n"
                f"- **Команда:** 3 человека\n"
                f"- **Ближайшие задачи:** Завершение бэкенд разработки\n"
                f"- **Риски:** Сроки могут быть сдвинуты due to дополнительных согласований"
            ),
            "estimate": (
                f"## Оценка стоимости проекта {project_name}\n\n"
                f"### По категориям:\n"
                f"- Разработка: 400-600 часов\n"
                f"- Дизайн: 60-100 часов\n"
                f"- Менеджмент: 40-60 часов\n"
                f"- Тестирование: 60-80 часов\n\n"
                f"### Ориентировочная стоимость: 600 000 - 900 000 ₽\n"
                f"### Срок: 6-8 недель"
            ),
        }

        return templates.get(prompt_type, f"Генерация для {prompt_type} проекта {project_name}")


class AIHistoryView(generics.ListAPIView):
    """List AI request history."""
    permission_classes = [IsAuthenticated]
    serializer_class = AIRequestSerializer

    def get_queryset(self):
        return AIRequest.objects.filter(
            user=self.request.user
        ).select_related("template").order_by("-created_at")


class AITemplateListView(generics.ListAPIView):
    """List AI prompt templates."""
    permission_classes = [IsAuthenticated]
    queryset = AIPromptTemplate.objects.all().order_by("prompt_type", "name")
    serializer_class = AIPromptTemplateSerializer
