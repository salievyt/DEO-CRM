"""Employee surveys.

Structure: :class:`Survey` -> :class:`SurveySection` -> :class:`Question`
(-> :class:`QuestionOption` for choice questions).

Submissions: :class:`SurveyResponse` -> :class:`Answer` (one per answered
question). Values are stored in typed columns so they can be aggregated in
SQL: ``number_value`` for scale/number, ``text_value`` for text and the
"Другое" free text, and :class:`AnswerChoice` rows for selected options.

Anonymity: responses to anonymous surveys store neither the user, the name,
the IP, the user agent nor an exact timestamp; only the submission date is
kept (see ``SurveyResponse``). Primary keys are random UUIDs, so the order
of rows does not reveal the order of submissions either.
"""

import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Survey(models.Model):
    class Status(models.TextChoices):
        INACTIVE = "inactive", "Отключён"
        SCHEDULED = "scheduled", "Запланирован"
        OPEN = "open", "Идёт сбор ответов"
        CLOSED = "closed", "Срок истёк"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
        verbose_name="Системный код",
        help_text="Код для сидеров (идемпотентность). Можно оставить пустым.",
    )
    title = models.CharField(max_length=255, verbose_name="Название")
    description = models.TextField(blank=True, default="", verbose_name="Вступление")
    thank_you_text = models.TextField(blank=True, default="", verbose_name="Текст после отправки")
    is_anonymous = models.BooleanField(default=True, verbose_name="Анонимный")
    is_active = models.BooleanField(default=False, verbose_name="Приём ответов включён")
    starts_at = models.DateTimeField(null=True, blank=True, verbose_name="Начало приёма")
    ends_at = models.DateTimeField(null=True, blank=True, verbose_name="Окончание приёма")
    first_activated_at = models.DateTimeField(
        null=True,
        blank=True,
        editable=False,
        verbose_name="Впервые включён",
        help_text="После первого включения анонимность опроса менять нельзя.",
    )
    public_token = models.UUIDField(
        default=uuid.uuid4, unique=True, editable=False, verbose_name="Публичный токен"
    )
    follow_up_survey = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        verbose_name="Ссылка после отправки на опрос",
        help_text="Показывается респонденту после отправки. Ответы не связываются.",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_surveys",
        verbose_name="Создал",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создан")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Обновлён")

    class Meta:
        verbose_name = "Опрос"
        verbose_name_plural = "Опросы"
        ordering = ["-created_at"]

    ANONYMITY_LOCKED_MSG = "Нельзя менять анонимность: опрос уже запускался или есть ответы."
    NAME_QUESTION_MSG = "В анонимном опросе не может быть вопроса «имя респондента»."

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if self.is_active and self.first_activated_at is None:
            self.first_activated_at = timezone.now()
            update_fields = kwargs.get("update_fields")
            if update_fields is not None:
                kwargs["update_fields"] = {*update_fields, "first_activated_at"}
        super().save(*args, **kwargs)

    @property
    def anonymity_locked(self):
        """``is_anonymous`` is frozen after the first activation or the first response."""
        if self.first_activated_at is not None:
            return True
        if self._state.adding:
            return False
        annotated = getattr(self, "response_total", None)
        if annotated is not None:
            return annotated > 0
        return self.responses.exists()

    def clean(self):
        super().clean()
        if self._state.adding:
            return
        stored = Survey.objects.filter(pk=self.pk).values("is_anonymous").first()
        if stored is not None and stored["is_anonymous"] != self.is_anonymous:
            if self.anonymity_locked:
                raise ValidationError({"is_anonymous": self.ANONYMITY_LOCKED_MSG})
        if (
            self.is_anonymous
            and Question.objects.filter(section__survey=self, identifies_respondent=True).exists()
        ):
            raise ValidationError({"is_anonymous": self.NAME_QUESTION_MSG})

    @property
    def status(self):
        if not self.is_active:
            return self.Status.INACTIVE
        now = timezone.now()
        if self.starts_at and now < self.starts_at:
            return self.Status.SCHEDULED
        if self.ends_at and now >= self.ends_at:
            return self.Status.CLOSED
        return self.Status.OPEN

    @property
    def public_url(self):
        base = getattr(settings, "SURVEYS_PUBLIC_BASE_URL", None) or getattr(
            settings, "FORMS_PUBLIC_BASE_URL", None
        )
        # Singular "/survey/": the management UI lives under "/surveys/".
        return f"{base.rstrip('/')}/survey/{self.public_token}/" if base else None


class SurveySection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    survey = models.ForeignKey(
        Survey, on_delete=models.CASCADE, related_name="sections", verbose_name="Опрос"
    )
    title = models.CharField(max_length=255, verbose_name="Название")
    description = models.TextField(blank=True, default="", verbose_name="Пояснение")
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок")

    class Meta:
        verbose_name = "Раздел опроса"
        verbose_name_plural = "Разделы опроса"
        ordering = ["order", "title"]

    def __str__(self):
        return self.title


class Question(models.Model):
    class Type(models.TextChoices):
        SCALE = "scale", "Шкала"
        SINGLE_CHOICE = "single_choice", "Один вариант"
        MULTIPLE_CHOICE = "multiple_choice", "Несколько вариантов"
        NUMBER = "number", "Число"
        SHORT_TEXT = "short_text", "Короткий текст"
        LONG_TEXT = "long_text", "Развёрнутый ответ"

    CHOICE_TYPES = (Type.SINGLE_CHOICE, Type.MULTIPLE_CHOICE)
    NUMERIC_TYPES = (Type.SCALE, Type.NUMBER)
    TEXT_TYPES = (Type.SHORT_TEXT, Type.LONG_TEXT)

    DEFAULT_MAX_LENGTH = {Type.SHORT_TEXT: 255, Type.LONG_TEXT: 5000}

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    section = models.ForeignKey(
        SurveySection,
        on_delete=models.CASCADE,
        related_name="questions",
        verbose_name="Раздел",
    )
    code = models.CharField(
        max_length=20, blank=True, default="", verbose_name="Номер", help_text="Например 2.1"
    )
    text = models.TextField(verbose_name="Вопрос")
    help_text = models.TextField(blank=True, default="", verbose_name="Подсказка")
    type = models.CharField(max_length=20, choices=Type.choices, verbose_name="Тип")
    required = models.BooleanField(default=True, verbose_name="Обязательный")
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок")

    # scale
    scale_min = models.PositiveSmallIntegerField(default=1, verbose_name="Шкала: от")
    scale_max = models.PositiveSmallIntegerField(default=5, verbose_name="Шкала: до")
    scale_labels = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Шкала: подписи",
        help_text='Подписи значений: {"1": "...", "5": "..."}',
    )
    # multiple choice
    max_choices = models.PositiveSmallIntegerField(
        null=True, blank=True, verbose_name="Не более N вариантов"
    )
    # single / multiple choice
    has_other = models.BooleanField(default=False, verbose_name="Вариант «Другое»")
    other_label = models.CharField(
        max_length=100, blank=True, default="Другое", verbose_name="Подпись «Другое»"
    )
    # number
    min_value = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Минимум"
    )
    max_value = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Максимум"
    )
    # text
    max_length = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Макс. длина ответа"
    )
    identifies_respondent = models.BooleanField(
        default=False,
        verbose_name="Это имя респондента",
        help_text="Только для именных опросов: ответ копируется в имя респондента.",
    )

    class Meta:
        verbose_name = "Вопрос"
        verbose_name_plural = "Вопросы"
        ordering = ["order", "code"]

    def __str__(self):
        return f"{self.code} {self.text}".strip()

    def clean(self):
        super().clean()
        if not self.identifies_respondent:
            return
        if self.type != self.Type.SHORT_TEXT:
            raise ValidationError(
                {"identifies_respondent": "Имя респондента — только короткий текст."}
            )
        try:
            section = self.section
        except SurveySection.DoesNotExist:
            section = None
        if section is not None and section.survey.is_anonymous:
            raise ValidationError(
                {"identifies_respondent": "В анонимном опросе имя не собирается."}
            )

    @property
    def effective_max_length(self):
        return self.max_length or self.DEFAULT_MAX_LENGTH.get(self.type, 5000)


class QuestionOption(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="options", verbose_name="Вопрос"
    )
    text = models.CharField(max_length=500, verbose_name="Вариант")
    order = models.PositiveIntegerField(default=0, verbose_name="Порядок")
    is_exclusive = models.BooleanField(
        default=False,
        verbose_name="Исключающий",
        help_text="Для «несколько вариантов»: нельзя выбрать вместе с другими.",
    )

    class Meta:
        verbose_name = "Вариант ответа"
        verbose_name_plural = "Варианты ответа"
        ordering = ["order", "text"]

    def __str__(self):
        return self.text


class SurveyResponse(models.Model):
    """One submission.

    For anonymous surveys only ``survey`` and ``submitted_date`` are set: the
    date is enough to see response dynamics, while an exact time could be
    matched against chat activity or office presence in a small team.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    survey = models.ForeignKey(
        Survey, on_delete=models.CASCADE, related_name="responses", verbose_name="Опрос"
    )
    submitted_date = models.DateField(verbose_name="Дата отправки")
    submitted_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Время отправки (только именные)"
    )
    respondent_name = models.CharField(
        max_length=255, blank=True, default="", verbose_name="Имя (только именные)"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="survey_responses",
        verbose_name="Пользователь (только именные)",
    )

    class Meta:
        verbose_name = "Ответ на опрос"
        verbose_name_plural = "Ответы на опросы"
        ordering = ["-submitted_date", "id"]
        indexes = [models.Index(fields=["survey", "submitted_date"])]

    def __str__(self):
        return f"{self.survey} — {self.submitted_date}"


class Answer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    response = models.ForeignKey(
        SurveyResponse, on_delete=models.CASCADE, related_name="answers", verbose_name="Ответ"
    )
    # RESTRICT: a question with answers cannot be deleted on its own, but is
    # removed together with its survey (answers go via the response cascade).
    question = models.ForeignKey(
        Question, on_delete=models.RESTRICT, related_name="answers", verbose_name="Вопрос"
    )
    number_value = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Число"
    )
    text_value = models.TextField(blank=True, default="", verbose_name="Текст / «Другое»")
    options = models.ManyToManyField(
        QuestionOption,
        through="AnswerChoice",
        related_name="answers",
        blank=True,
        verbose_name="Выбранные варианты",
    )

    class Meta:
        verbose_name = "Ответ на вопрос"
        verbose_name_plural = "Ответы на вопросы"
        constraints = [
            models.UniqueConstraint(
                fields=["response", "question"], name="surveys_answer_unique_question"
            )
        ]

    def __str__(self):
        return str(self.question)


class AnswerChoice(models.Model):
    # UUID, not an auto-increment: sequential ids would reveal submission order.
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    answer = models.ForeignKey(Answer, on_delete=models.CASCADE, related_name="choices")
    option = models.ForeignKey(QuestionOption, on_delete=models.RESTRICT, related_name="choices")

    class Meta:
        verbose_name = "Выбранный вариант"
        verbose_name_plural = "Выбранные варианты"
        constraints = [
            models.UniqueConstraint(
                fields=["answer", "option"], name="surveys_answerchoice_unique_option"
            )
        ]
