"""Validation and storage of submitted answers.

Request payload (``answers`` list item)::

    {"question": "<uuid>", "value": <typed value>, "other_text": "<str>"}

``value`` by question type:

* ``scale``           — integer in [scale_min, scale_max]
* ``number``          — number in [min_value, max_value]
* ``short_text`` / ``long_text`` — string up to ``max_length``
* ``single_choice``   — option id (string) or null when "Другое" is used
* ``multiple_choice`` — list of option ids (may be empty when "Другое" is used)

``other_text`` is accepted only for choice questions with ``has_other``.
An empty answer (null, "", [] without other text) to an optional question is
skipped. Errors are collected per question id.
"""

from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone

from .models import Answer, AnswerChoice, Question, SurveyResponse

REQUIRED_MSG = "Обязательный вопрос."
OTHER_MAX_LENGTH = 500


@dataclass
class CleanAnswer:
    question: Question
    number: Decimal | None = None
    text: str = ""
    option_ids: list = field(default_factory=list)


class AnswersError(Exception):
    def __init__(self, errors):
        super().__init__("invalid answers")
        self.errors = errors


def _is_empty(question, value, other_text):
    if question.type in Question.CHOICE_TYPES:
        return value in (None, "", []) and not other_text
    if question.type in Question.TEXT_TYPES:
        return value is None or (isinstance(value, str) and not value.strip())
    return value is None or value == ""


def _clean_number(question, value):
    if isinstance(value, bool):
        raise ValueError("Нужно число.")
    try:
        number = Decimal(str(value).strip().replace(",", "."))
    except (InvalidOperation, ValueError):
        raise ValueError("Нужно число.")
    if not number.is_finite():
        raise ValueError("Нужно число.")
    if question.type == Question.Type.SCALE:
        if number != number.to_integral_value():
            raise ValueError("Нужно целое значение шкалы.")
        if not question.scale_min <= number <= question.scale_max:
            raise ValueError(
                f"Значение должно быть от {question.scale_min} до {question.scale_max}."
            )
        return number
    if question.min_value is not None and number < question.min_value:
        raise ValueError(f"Значение должно быть не меньше {question.min_value.normalize()}.")
    if question.max_value is not None and number > question.max_value:
        raise ValueError(f"Значение должно быть не больше {question.max_value.normalize()}.")
    if abs(number) >= Decimal("1e10"):
        raise ValueError("Слишком большое число.")
    if number.normalize().as_tuple().exponent < -2:
        raise ValueError("Не более двух знаков после запятой.")
    return number.quantize(Decimal("0.01"))


def _clean_text(question, value):
    if not isinstance(value, str):
        raise ValueError("Нужна строка.")
    value = value.strip()
    limit = question.effective_max_length
    if len(value) > limit:
        raise ValueError(f"Не более {limit} символов.")
    return value


def _clean_choice(question, value, other_text):
    options = {str(o.id): o for o in question.options.all()}
    if question.type == Question.Type.SINGLE_CHOICE:
        if isinstance(value, list):
            raise ValueError("Нужен один вариант.")
        selected = [] if value in (None, "") else [str(value)]
    else:
        if value is None:
            value = []
        if not isinstance(value, list):
            raise ValueError("Нужен список вариантов.")
        selected = [str(v) for v in value]
        if len(set(selected)) != len(selected):
            raise ValueError("Варианты повторяются.")

    unknown = [v for v in selected if v not in options]
    if unknown:
        raise ValueError("Неизвестный вариант ответа.")

    if other_text:
        if not question.has_other:
            raise ValueError("Для этого вопроса нет варианта «Другое».")
        if not isinstance(other_text, str):
            raise ValueError("«Другое» должно быть строкой.")
        other_text = other_text.strip()
        if len(other_text) > OTHER_MAX_LENGTH:
            raise ValueError(f"«Другое»: не более {OTHER_MAX_LENGTH} символов.")

    count = len(selected) + (1 if other_text else 0)
    if question.type == Question.Type.SINGLE_CHOICE and count > 1:
        raise ValueError("Можно выбрать только один вариант.")
    if question.type == Question.Type.MULTIPLE_CHOICE:
        if question.max_choices and count > question.max_choices:
            raise ValueError(f"Можно выбрать не более {question.max_choices}.")
        if count > 1 and any(options[v].is_exclusive for v in selected):
            raise ValueError("Этот вариант нельзя совмещать с другими.")
    return selected, other_text or ""


def clean_answers(survey, raw_answers):
    """Return ``list[CleanAnswer]`` or raise :class:`AnswersError`."""
    if not isinstance(raw_answers, list):
        raise AnswersError({"answers": ["Нужен список ответов."]})

    questions = {
        str(q.id): q
        for q in Question.objects.filter(section__survey=survey).prefetch_related("options")
    }
    errors = {}
    by_question = {}
    for item in raw_answers:
        if not isinstance(item, dict) or "question" not in item:
            raise AnswersError({"answers": ["Каждый ответ — объект с полем question."]})
        qid = str(item.get("question"))
        if qid not in questions:
            errors[qid] = ["Вопрос не относится к этому опросу."]
            continue
        if qid in by_question:
            errors[qid] = ["Ответ на вопрос передан дважды."]
            continue
        by_question[qid] = item

    cleaned = []
    for qid, question in questions.items():
        if qid in errors:
            continue
        item = by_question.get(qid, {})
        value = item.get("value")
        other_text = item.get("other_text") or ""
        if isinstance(other_text, str):
            # Whitespace-only «Другое» counts as no answer (required check below).
            other_text = other_text.strip()
        if _is_empty(question, value, other_text):
            if question.required:
                errors[qid] = [REQUIRED_MSG]
            continue
        try:
            if question.type in Question.NUMERIC_TYPES:
                cleaned.append(CleanAnswer(question, number=_clean_number(question, value)))
            elif question.type in Question.TEXT_TYPES:
                cleaned.append(CleanAnswer(question, text=_clean_text(question, value)))
            else:
                option_ids, other = _clean_choice(question, value, other_text)
                cleaned.append(CleanAnswer(question, text=other, option_ids=option_ids))
        except ValueError as exc:
            errors[qid] = [str(exc)]

    if errors:
        raise AnswersError({"answers": errors})
    return cleaned


@transaction.atomic
def save_response(survey, cleaned, user=None):
    """Persist a response. For anonymous surveys nothing identifying is kept."""
    now = timezone.now()
    response = SurveyResponse(survey=survey, submitted_date=timezone.localdate(now))
    if not survey.is_anonymous:
        response.submitted_at = now
        if user is not None and user.is_authenticated:
            response.user = user
        name = next((c.text for c in cleaned if c.question.identifies_respondent and c.text), "")
        if not name and response.user is not None:
            name = response.user.get_full_name() or response.user.email
        response.respondent_name = name[:255]
    response.save()

    for item in cleaned:
        answer = Answer.objects.create(
            response=response,
            question=item.question,
            number_value=item.number,
            text_value=item.text,
        )
        if item.option_ids:
            AnswerChoice.objects.bulk_create(
                [AnswerChoice(answer=answer, option_id=oid) for oid in item.option_ids]
            )
    return response
