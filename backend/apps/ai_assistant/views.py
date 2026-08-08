from django.utils import timezone
from rest_framework import generics, status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.permissions import IsProjectManager

from .models import AIRequest, AIPromptTemplate, get_ai_settings
from .serializers import (
    AIGenerateSerializer,
    AIRequestSerializer,
    AIPromptTemplateSerializer,
    AISettingsSerializer,
)
from .services import (
    AIProviderError,
    build_default_prompts,
    generate_with_provider,
    render_prompt,
    test_connection,
)


class AIGenerateView(views.APIView):
    """Generate content using the configured AI provider."""

    permission_classes = [IsAuthenticated, IsProjectManager]

    def post(self, request, prompt_type):
        serializer = AIGenerateSerializer(
            data={
                "prompt_type": prompt_type,
                **request.data,
            }
        )
        serializer.is_valid(raise_exception=True)

        settings = get_ai_settings()
        template = AIPromptTemplate.objects.filter(prompt_type=prompt_type).first()
        variables = serializer.validated_data.get("variables", {})

        ai_request = AIRequest.objects.create(
            user=request.user,
            template=template,
            prompt_type=prompt_type,
            input_data=request.data,
            model=settings.model or "не настроена",
            status="pending",
        )

        try:
            if template:
                system_prompt = template.system_prompt
                user_prompt = render_prompt(template.user_prompt_template, variables)
            else:
                system_prompt, user_prompt = build_default_prompts(prompt_type, variables)
            output, usage = generate_with_provider(settings, system_prompt, user_prompt)
        except AIProviderError as exc:
            ai_request.status = "failed"
            ai_request.completed_at = timezone.now()
            ai_request.save()
            return Response(
                {
                    "id": str(ai_request.id),
                    "output": None,
                    "status": "failed",
                    "error": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        ai_request.output_data = output
        ai_request.model = settings.model
        ai_request.tokens_used = usage.get("total_tokens", 0)
        ai_request.status = "completed"
        ai_request.completed_at = timezone.now()
        ai_request.save()

        return Response(
            {
                "id": str(ai_request.id),
                "output": output,
                "model": settings.model,
                "tokens_used": ai_request.tokens_used,
                "status": "completed",
            }
        )


class AISettingsView(views.APIView):
    """Read / update AI provider settings (admin only)."""

    permission_classes = [IsAuthenticated, IsProjectManager]

    def get(self, request):
        settings = get_ai_settings()
        return Response(AISettingsSerializer(settings).data)

    def put(self, request):
        settings = get_ai_settings()
        serializer = AISettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        return Response(AISettingsSerializer(settings).data)


class AISettingsTestView(views.APIView):
    """Verify provider connectivity with a minimal request."""

    permission_classes = [IsAuthenticated, IsProjectManager]

    def post(self, request):
        settings = get_ai_settings()
        if request.data.get("api_url") or request.data.get("api_key") or request.data.get("model"):
            # test with unsaved values from the form
            settings = type(
                "Draft",
                (),
                {
                    "api_url": request.data.get("api_url") or settings.api_url,
                    "api_key": request.data.get("api_key") or settings.api_key,
                    "model": request.data.get("model") or settings.model,
                    "temperature": settings.temperature,
                    "max_tokens": min(settings.max_tokens, 100),
                    "timeout": settings.timeout,
                },
            )()
        try:
            result = test_connection(settings)
        except AIProviderError as exc:
            return Response(
                {"ok": False, "error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(result)


class AIHistoryView(generics.ListAPIView):
    """List AI request history."""

    permission_classes = [IsAuthenticated]
    serializer_class = AIRequestSerializer

    def get_queryset(self):
        return (
            AIRequest.objects.filter(user=self.request.user)
            .select_related("template")
            .order_by("-created_at")
        )


class AITemplateListView(generics.ListAPIView):
    """List AI prompt templates."""

    permission_classes = [IsAuthenticated]
    queryset = AIPromptTemplate.objects.all().order_by("prompt_type", "name")
    serializer_class = AIPromptTemplateSerializer
