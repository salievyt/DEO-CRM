"""Survey API.

Management (``CanManageSurveys``: superadmin, owner, hr)::

    /api/v1/surveys/                         list, create
    /api/v1/surveys/{id}/                    retrieve (with sections+questions), update, delete
    /api/v1/surveys/{id}/activate/           POST
    /api/v1/surveys/{id}/deactivate/         POST
    /api/v1/surveys/{id}/public-link/        GET
    /api/v1/surveys/{id}/regenerate-link/    POST (old link stops working)
    /api/v1/surveys/{id}/results/            GET  by-question statistics
    /api/v1/surveys/{id}/responses/          GET  table, paginated
    /api/v1/surveys/{id}/responses/export/   GET  CSV
    /api/v1/surveys/sections/                CRUD, ?survey=<id>
    /api/v1/surveys/questions/               CRUD, ?survey=<id>&section=<id>

Public (no account, throttled)::

    /api/v1/surveys/public/{token}/          GET structure, POST answers
"""

import csv
import io
import uuid

from django.db.models import Count, ProtectedError, RestrictedError
from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiExample,
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
    extend_schema_view,
    inline_serializer,
)
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, AuthenticationFailed, NotFound
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from common.pagination import StandardPagination

from . import results
from .answers import AnswersError, clean_answers, save_response
from .models import Question, Survey, SurveyResponse, SurveySection
from .permissions import CanManageSurveys
from .schema_examples import (
    PUBLIC_STRUCTURE_EXAMPLE,
    PUBLIC_SUBMIT_EXAMPLE,
    RESULTS_EXAMPLE,
    TABLE_EXAMPLE,
)
from .serializers import (
    PublicLinkSerializer,
    PublicSubmitResultSerializer,
    PublicSubmitSerializer,
    PublicSurveySerializer,
    QuestionSerializer,
    SurveyDetailSerializer,
    SurveySectionSerializer,
    SurveySerializer,
)
from .throttling import SurveySubmitThrottle, SurveyViewThrottle

UUID_RE = r"[0-9a-fA-F-]{36}"

NOT_STARTED_RESPONSE = OpenApiResponse(
    response=inline_serializer(
        "SurveyNotStartedError",
        {
            "error": serializers.BooleanField(),
            "detail": inline_serializer(
                "SurveyNotStartedDetail",
                {
                    "detail": serializers.CharField(),
                    "code": serializers.CharField(),
                    "starts_at": serializers.DateTimeField(allow_null=True),
                },
            ),
            "status_code": serializers.IntegerField(),
        },
    ),
    description="Опрос ещё не начался: detail.code = survey_not_started, detail.starts_at.",
)


class SurveyClosed(APIException):
    status_code = status.HTTP_410_GONE
    default_detail = "Приём ответов завершён."
    default_code = "survey_closed"


class SurveyNotStarted(APIException):
    """403 body: ``{"detail": {"detail", "code", "starts_at"}}`` (see exception handler)."""

    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Опрос ещё не начался."
    default_code = "survey_not_started"

    def __init__(self, starts_at=None):
        super().__init__()
        # Set directly: APIException would turn None into the string "None".
        self.detail = {
            "detail": self.default_detail,
            "code": self.default_code,
            "starts_at": starts_at.isoformat() if starts_at else None,
        }


class HasAnswers(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Нельзя удалить: на вопросы уже есть ответы."
    default_code = "has_answers"


def _uuid_param(request, name):
    value = request.query_params.get(name)
    if not value:
        return None
    try:
        return uuid.UUID(value)
    except ValueError:
        return False


class _ManageMixin:
    permission_classes = [permissions.IsAuthenticated, CanManageSurveys]

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except (RestrictedError, ProtectedError):
            raise HasAnswers()


@extend_schema_view(
    list=extend_schema(summary="Список опросов"),
    create=extend_schema(summary="Создать опрос"),
    retrieve=extend_schema(summary="Опрос со структурой (разделы, вопросы, варианты)"),
    update=extend_schema(summary="Изменить опрос"),
    partial_update=extend_schema(summary="Частично изменить опрос"),
    destroy=extend_schema(summary="Удалить опрос вместе с ответами"),
)
class SurveyViewSet(_ManageMixin, viewsets.ModelViewSet):
    queryset = Survey.objects.select_related("created_by").all()
    lookup_value_regex = UUID_RE
    search_fields = ["title"]
    ordering_fields = ["created_at", "title", "ends_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == "list":
            qs = qs.annotate(
                response_total=Count("responses", distinct=True),
                question_total=Count("sections__questions", distinct=True),
            )
        if self.action == "retrieve":
            qs = qs.prefetch_related("sections__questions__options")
        return qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SurveyDetailSerializer
        return SurveySerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def _link(self, survey):
        return Response(
            PublicLinkSerializer(
                {
                    "public_token": survey.public_token,
                    "public_url": survey.public_url,
                    "status": survey.status,
                    "is_active": survey.is_active,
                }
            ).data
        )

    @extend_schema(summary="Включить приём ответов", request=None, responses=SurveySerializer)
    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        survey = self.get_object()
        survey.is_active = True
        survey.save(update_fields=["is_active", "updated_at"])
        return Response(SurveySerializer(survey).data)

    @extend_schema(summary="Отключить приём ответов", request=None, responses=SurveySerializer)
    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        survey = self.get_object()
        survey.is_active = False
        survey.save(update_fields=["is_active", "updated_at"])
        return Response(SurveySerializer(survey).data)

    @extend_schema(summary="Публичная ссылка", responses=PublicLinkSerializer)
    @action(detail=True, methods=["get"], url_path="public-link")
    def public_link(self, request, pk=None):
        return self._link(self.get_object())

    @extend_schema(
        summary="Перевыпустить публичную ссылку (старая перестаёт работать)",
        request=None,
        responses=PublicLinkSerializer,
    )
    @action(detail=True, methods=["post"], url_path="regenerate-link")
    def regenerate_link(self, request, pk=None):
        survey = self.get_object()
        survey.public_token = uuid.uuid4()
        survey.save(update_fields=["public_token", "updated_at"])
        return self._link(survey)

    @extend_schema(
        summary="Результаты по вопросам",
        responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
        examples=[OpenApiExample("results", value=RESULTS_EXAMPLE, response_only=True)],
    )
    @action(detail=True, methods=["get"])
    def results(self, request, pk=None):
        return Response(results.results_by_question(self.get_object()))

    @extend_schema(
        summary="Таблица ответов (строки — респонденты, колонки — вопросы)",
        parameters=[
            OpenApiParameter("page", int),
            OpenApiParameter("page_size", int, description="По умолчанию 20, максимум 100"),
        ],
        responses={200: OpenApiResponse(response=OpenApiTypes.OBJECT)},
        examples=[OpenApiExample("table", value=TABLE_EXAMPLE, response_only=True)],
    )
    @action(detail=True, methods=["get"])
    def responses(self, request, pk=None):
        survey = self.get_object()
        questions = results.survey_questions(survey)
        labels = results.option_labels(questions)
        qs = SurveyResponse.objects.filter(survey=survey).order_by("-submitted_date", "id")
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        by_response = results.prefetch_rows(page)
        rows = [results.table_row(r, questions, by_response.get(r.id, {}), labels) for r in page]
        response = paginator.get_paginated_response(rows)
        response.data["columns"] = results.table_columns(questions)
        response.data["is_anonymous"] = survey.is_anonymous
        return response

    @extend_schema(
        summary="CSV-экспорт таблицы ответов",
        responses={(200, "text/csv"): OpenApiResponse(response=OpenApiTypes.BINARY)},
    )
    @action(detail=True, methods=["get"], url_path="responses/export")
    def export(self, request, pk=None):
        survey = self.get_object()
        questions = results.survey_questions(survey)
        labels = results.option_labels(questions)
        responses = list(
            SurveyResponse.objects.filter(survey=survey).order_by("-submitted_date", "id")
        )
        by_response = results.prefetch_rows(responses)

        buf = io.StringIO()
        writer = csv.writer(buf, delimiter=";")
        header = ["Дата"]
        if not survey.is_anonymous:
            header.append("Имя")
        header += [f"{q.code} {q.text}".strip() for q in questions]
        writer.writerow([_csv_safe(h) for h in header])
        for item in responses:
            row = results.table_row(item, questions, by_response.get(item.id, {}), labels)
            line = [row["submitted_date"]]
            if not survey.is_anonymous:
                line.append(row["respondent_name"] or "")
            for q in questions:
                cell = row["answers"][str(q.id)]
                if not cell:
                    line.append("")
                elif q.type in Question.NUMERIC_TYPES:
                    # Russian Excel with ";" reads "7.5" as a date: use a decimal comma.
                    line.append(cell["display"].replace(".", ","))
                else:
                    line.append(cell["display"])
            writer.writerow([_csv_safe(value) for value in line])

        filename = f"survey-{survey.slug or survey.pk}.csv"
        response = HttpResponse("﻿" + buf.getvalue(), content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


def _csv_safe(value):
    """Neutralise spreadsheet formulas (CSV injection) in any cell.

    Applied to every cell, headers included: question texts, option labels
    and respondent names are user-controlled too. Plain numbers (``-3``,
    ``-2,5``) are left as they are.
    """
    value = "" if value is None else str(value)
    if value and value[0] in ("=", "+", "-", "@", "\t", "\r"):
        try:
            float(value.replace(",", "."))
            return value
        except ValueError:
            return "'" + value
    return value


@extend_schema_view(
    list=extend_schema(
        summary="Разделы",
        parameters=[OpenApiParameter("survey", OpenApiTypes.UUID)],
    ),
)
class SurveySectionViewSet(_ManageMixin, viewsets.ModelViewSet):
    serializer_class = SurveySectionSerializer
    lookup_value_regex = UUID_RE
    pagination_class = None

    def get_queryset(self):
        qs = SurveySection.objects.all()
        survey = _uuid_param(self.request, "survey")
        if survey is False:
            return qs.none()
        if survey:
            qs = qs.filter(survey_id=survey)
        return qs.order_by("survey_id", "order", "title")


@extend_schema_view(
    list=extend_schema(
        summary="Вопросы",
        parameters=[
            OpenApiParameter("survey", OpenApiTypes.UUID),
            OpenApiParameter("section", OpenApiTypes.UUID),
        ],
    ),
)
class QuestionViewSet(_ManageMixin, viewsets.ModelViewSet):
    serializer_class = QuestionSerializer
    lookup_value_regex = UUID_RE
    pagination_class = None

    def get_queryset(self):
        qs = Question.objects.select_related("section").prefetch_related("options")
        for param, lookup in (("survey", "section__survey_id"), ("section", "section_id")):
            value = _uuid_param(self.request, param)
            if value is False:
                return qs.none()
            if value:
                qs = qs.filter(**{lookup: value})
        return qs.order_by("section__order", "order", "code")


# --- public ------------------------------------------------------------------


class OptionalJWTAuthentication(JWTAuthentication):
    """Identify a logged-in respondent if possible; never reject the request."""

    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except (InvalidToken, TokenError, AuthenticationFailed):
            return None


class PublicSurveyView(APIView):
    """Fill in a survey by its public token, without an account."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = [OptionalJWTAuthentication]

    def get_throttles(self):
        if self.request.method == "POST":
            return [SurveySubmitThrottle()]
        return [SurveyViewThrottle()]

    def _get_open_survey(self, token):
        survey = Survey.objects.filter(public_token=token).first()
        if survey is None or survey.status == Survey.Status.INACTIVE:
            raise NotFound("Опрос не найден или отключён.")
        if survey.status == Survey.Status.SCHEDULED:
            raise SurveyNotStarted(survey.starts_at)
        if survey.status == Survey.Status.CLOSED:
            raise SurveyClosed()
        return survey

    @extend_schema(
        summary="Публичная структура опроса",
        auth=[],
        responses={200: PublicSurveySerializer, 403: NOT_STARTED_RESPONSE, 404: None, 410: None},
        examples=[OpenApiExample("structure", value=PUBLIC_STRUCTURE_EXAMPLE, response_only=True)],
    )
    def get(self, request, token):
        survey = self._get_open_survey(token)
        survey = (
            Survey.objects.select_related("follow_up_survey")
            .prefetch_related("sections__questions__options")
            .get(pk=survey.pk)
        )
        return Response(PublicSurveySerializer(survey).data)

    @extend_schema(
        summary="Отправить ответы",
        auth=[],
        request=PublicSubmitSerializer,
        responses={
            201: PublicSubmitResultSerializer,
            400: inline_serializer(
                "SurveyAnswersError",
                {
                    "error": serializers.BooleanField(),
                    "detail": serializers.DictField(),
                    "status_code": serializers.IntegerField(),
                },
            ),
            403: NOT_STARTED_RESPONSE,
            404: None,
            410: None,
            429: None,
        },
        examples=[OpenApiExample("submit", value=PUBLIC_SUBMIT_EXAMPLE, request_only=True)],
    )
    def post(self, request, token):
        if not isinstance(request.data, dict):
            raise serializers.ValidationError({"answers": ["Нужен объект с полем answers."]})
        survey = self._get_open_survey(token)
        try:
            cleaned = clean_answers(survey, request.data.get("answers"))
        except AnswersError as exc:
            raise serializers.ValidationError(exc.errors)
        # Anonymous surveys never look at who is logged in.
        user = None if survey.is_anonymous else request.user
        save_response(survey, cleaned, user=user)
        follow_up = PublicSurveySerializer(survey).data["follow_up"]
        return Response(
            {
                "detail": "Ответ сохранён.",
                "thank_you_text": survey.thank_you_text,
                "follow_up": follow_up,
            },
            status=status.HTTP_201_CREATED,
        )
