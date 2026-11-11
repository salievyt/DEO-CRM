from django.db import transaction
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Question, QuestionOption, Survey, SurveySection

SCALE_LIMIT = 10


# --- management (CanManageSurveys) ------------------------------------------


class QuestionOptionSerializer(serializers.ModelSerializer):
    # Writable so nested updates can match existing options by id.
    id = serializers.UUIDField(required=False)

    class Meta:
        model = QuestionOption
        fields = ["id", "text", "order", "is_exclusive"]


class QuestionSerializer(serializers.ModelSerializer):
    """Question with nested options.

    On update ``options`` is the full list: items with ``id`` are updated,
    items without ``id`` are created, existing options missing from the list
    are deleted (rejected if someone already chose them).
    """

    options = QuestionOptionSerializer(many=True, required=False)
    survey = serializers.UUIDField(source="section.survey_id", read_only=True)
    min_value = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False, required=False, allow_null=True
    )
    max_value = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False, required=False, allow_null=True
    )
    answer_count = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            "id",
            "survey",
            "section",
            "code",
            "text",
            "help_text",
            "type",
            "required",
            "order",
            "scale_min",
            "scale_max",
            "scale_labels",
            "max_choices",
            "has_other",
            "other_label",
            "min_value",
            "max_value",
            "max_length",
            "identifies_respondent",
            "options",
            "answer_count",
        ]
        read_only_fields = ["id"]

    def get_answer_count(self, obj) -> int:
        return obj.answers.count()

    def validate(self, attrs):
        instance = self.instance

        def current(name, default=None):
            if name in attrs:
                return attrs[name]
            return getattr(instance, name, default) if instance is not None else default

        qtype = current("type")
        section = current("section")
        has_answers = instance is not None and instance.answers.exists()
        errors = {}

        if instance is not None and has_answers:
            if "type" in attrs and attrs["type"] != instance.type:
                errors["type"] = "Нельзя сменить тип: на вопрос уже есть ответы."
            if "section" in attrs and attrs["section"].survey_id != instance.section.survey_id:
                errors["section"] = "Нельзя перенести вопрос с ответами в другой опрос."

        if qtype == Question.Type.SCALE:
            lo, hi = current("scale_min", 1), current("scale_max", 5)
            if not (0 <= lo < hi <= SCALE_LIMIT):
                errors["scale_max"] = f"Шкала: 0 ≤ от < до ≤ {SCALE_LIMIT}."
            labels = current("scale_labels", {}) or {}
            if not isinstance(labels, dict):
                errors["scale_labels"] = "Подписи шкалы — объект {значение: подпись}."
            else:
                for key, label in labels.items():
                    if not str(key).isdigit() or not lo <= int(key) <= hi:
                        errors["scale_labels"] = f"Ключ «{key}» вне диапазона шкалы."
                    elif not isinstance(label, str):
                        errors["scale_labels"] = "Подписи шкалы должны быть строками."

        if qtype == Question.Type.NUMBER:
            lo, hi = current("min_value"), current("max_value")
            if lo is not None and hi is not None and lo > hi:
                errors["max_value"] = "Максимум меньше минимума."

        options = attrs.get("options")
        if options is None and instance is not None:
            option_count = instance.options.count()
        else:
            option_count = len(options or [])

        if qtype in Question.CHOICE_TYPES:
            if option_count == 0:
                errors["options"] = "Для вопроса с выбором нужен хотя бы один вариант."
        elif options:
            errors["options"] = "Варианты ответа нужны только для вопросов с выбором."

        max_choices = current("max_choices")
        if max_choices is not None:
            if qtype != Question.Type.MULTIPLE_CHOICE:
                errors["max_choices"] = "Лимит только для «несколько вариантов»."
            elif max_choices < 1:
                errors["max_choices"] = "Лимит должен быть не меньше 1."

        if current("has_other") and qtype not in Question.CHOICE_TYPES:
            errors["has_other"] = "«Другое» только для вопросов с выбором."

        if current("identifies_respondent"):
            if qtype != Question.Type.SHORT_TEXT:
                errors["identifies_respondent"] = "Имя респондента — только короткий текст."
            elif section is not None and section.survey.is_anonymous:
                errors["identifies_respondent"] = "В анонимном опросе имя не собирается."

        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        options = validated_data.pop("options", [])
        question = Question.objects.create(**validated_data)
        for index, option in enumerate(options):
            option.pop("id", None)
            option.setdefault("order", index)
            QuestionOption.objects.create(question=question, **option)
        return question

    @transaction.atomic
    def update(self, instance, validated_data):
        options = validated_data.pop("options", None)
        instance = super().update(instance, validated_data)
        if options is not None:
            self._sync_options(instance, options)
        return instance

    def _sync_options(self, question, options):
        existing = {o.id: o for o in question.options.all()}
        keep = set()
        for index, data in enumerate(options):
            option_id = data.pop("id", None)
            data.setdefault("order", index)
            if option_id is not None:
                option = existing.get(option_id)
                if option is None:
                    raise serializers.ValidationError(
                        {"options": f"Вариант {option_id} не относится к вопросу."}
                    )
                for key, value in data.items():
                    setattr(option, key, value)
                option.save()
                keep.add(option_id)
            else:
                QuestionOption.objects.create(question=question, **data)
        to_delete = [oid for oid in existing if oid not in keep]
        if not to_delete:
            return
        used = QuestionOption.objects.filter(id__in=to_delete, choices__isnull=False).exists()
        if used:
            raise serializers.ValidationError(
                {"options": "Нельзя удалить вариант, который уже выбирали. Переименуйте его."}
            )
        QuestionOption.objects.filter(id__in=to_delete).delete()


class SurveySectionSerializer(serializers.ModelSerializer):
    question_count = serializers.IntegerField(source="questions.count", read_only=True)

    class Meta:
        model = SurveySection
        fields = ["id", "survey", "title", "description", "order", "question_count"]
        read_only_fields = ["id"]

    def validate_survey(self, value):
        if self.instance is not None and value.pk != self.instance.survey_id:
            raise serializers.ValidationError("Раздел нельзя перенести в другой опрос.")
        return value


class SectionWithQuestionsSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = SurveySection
        fields = ["id", "title", "description", "order", "questions"]


class SurveySerializer(serializers.ModelSerializer):
    status = serializers.ChoiceField(choices=Survey.Status.choices, read_only=True)
    public_url = serializers.CharField(read_only=True, allow_null=True)
    response_count = serializers.SerializerMethodField()
    question_count = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    anonymity_locked = serializers.BooleanField(
        read_only=True,
        help_text="true — is_anonymous менять нельзя (опрос уже включали или есть ответы).",
    )

    class Meta:
        model = Survey
        fields = [
            "id",
            "slug",
            "title",
            "description",
            "thank_you_text",
            "is_anonymous",
            "anonymity_locked",
            "is_active",
            "status",
            "starts_at",
            "ends_at",
            "public_token",
            "public_url",
            "follow_up_survey",
            "response_count",
            "question_count",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "public_token", "created_at", "updated_at"]

    def get_response_count(self, obj) -> int:
        annotated = getattr(obj, "response_total", None)
        return annotated if annotated is not None else obj.responses.count()

    def get_question_count(self, obj) -> int:
        annotated = getattr(obj, "question_total", None)
        if annotated is not None:
            return annotated
        return Question.objects.filter(section__survey=obj).count()

    def get_created_by_name(self, obj) -> str | None:
        if obj.created_by is None:
            return None
        return obj.created_by.get_full_name() or obj.created_by.email

    def validate(self, attrs):
        instance = self.instance
        starts = attrs.get("starts_at", getattr(instance, "starts_at", None))
        ends = attrs.get("ends_at", getattr(instance, "ends_at", None))
        if starts and ends and ends <= starts:
            raise serializers.ValidationError({"ends_at": "Окончание раньше начала."})
        if instance is not None:
            if (
                "is_anonymous" in attrs
                and attrs["is_anonymous"] != instance.is_anonymous
                and instance.anonymity_locked
            ):
                raise serializers.ValidationError({"is_anonymous": Survey.ANONYMITY_LOCKED_MSG})
            follow_up = attrs.get("follow_up_survey")
            if follow_up is not None and follow_up.pk == instance.pk:
                raise serializers.ValidationError(
                    {"follow_up_survey": "Опрос не может ссылаться сам на себя."}
                )
            if (
                attrs.get("is_anonymous")
                and Question.objects.filter(
                    section__survey=instance, identifies_respondent=True
                ).exists()
            ):
                raise serializers.ValidationError({"is_anonymous": Survey.NAME_QUESTION_MSG})
        return attrs


class SurveyDetailSerializer(SurveySerializer):
    sections = SectionWithQuestionsSerializer(many=True, read_only=True)

    class Meta(SurveySerializer.Meta):
        fields = SurveySerializer.Meta.fields + ["sections"]


class PublicLinkSerializer(serializers.Serializer):
    public_token = serializers.UUIDField()
    public_url = serializers.CharField(allow_null=True)
    status = serializers.ChoiceField(choices=Survey.Status.choices)
    is_active = serializers.BooleanField()


# --- public (no auth) --------------------------------------------------------


class PublicOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ["id", "text", "is_exclusive"]


class PublicQuestionSerializer(serializers.ModelSerializer):
    options = PublicOptionSerializer(many=True, read_only=True)
    min_value = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False, read_only=True
    )
    max_value = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False, read_only=True
    )
    max_length = serializers.SerializerMethodField()

    def get_max_length(self, obj) -> int | None:
        """Effective limit for text questions (default 255 / 5000), null otherwise."""
        return obj.effective_max_length if obj.type in Question.TEXT_TYPES else None

    class Meta:
        model = Question
        fields = [
            "id",
            "code",
            "text",
            "help_text",
            "type",
            "required",
            "scale_min",
            "scale_max",
            "scale_labels",
            "max_choices",
            "has_other",
            "other_label",
            "min_value",
            "max_value",
            "max_length",
            "identifies_respondent",
            "options",
        ]


class PublicSectionSerializer(serializers.ModelSerializer):
    questions = PublicQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = SurveySection
        fields = ["id", "title", "description", "questions"]


class PublicFollowUpSerializer(serializers.Serializer):
    title = serializers.CharField()
    token = serializers.UUIDField()
    url = serializers.CharField(allow_null=True)


class PublicSurveySerializer(serializers.ModelSerializer):
    sections = PublicSectionSerializer(many=True, read_only=True)
    follow_up = serializers.SerializerMethodField()

    class Meta:
        model = Survey
        fields = [
            "title",
            "description",
            "thank_you_text",
            "is_anonymous",
            "starts_at",
            "ends_at",
            "sections",
            "follow_up",
        ]

    @extend_schema_field(PublicFollowUpSerializer(allow_null=True))
    def get_follow_up(self, obj):
        follow_up = obj.follow_up_survey
        if follow_up is None or follow_up.status != Survey.Status.OPEN:
            return None
        return {
            "title": follow_up.title,
            "token": str(follow_up.public_token),
            "url": follow_up.public_url,
        }


class PublicAnswerInputSerializer(serializers.Serializer):
    question = serializers.UUIDField()
    value = serializers.JSONField(
        required=False,
        allow_null=True,
        help_text=(
            "scale: int; number: number; short_text/long_text: string; "
            "single_choice: option id | null; multiple_choice: [option id]"
        ),
    )
    other_text = serializers.CharField(required=False, allow_blank=True)


class PublicSubmitSerializer(serializers.Serializer):
    """Documentation-only: the payload is validated in ``answers.clean_answers``."""

    answers = PublicAnswerInputSerializer(many=True)


class PublicSubmitResultSerializer(serializers.Serializer):
    detail = serializers.CharField()
    thank_you_text = serializers.CharField()
    follow_up = PublicFollowUpSerializer(allow_null=True)
