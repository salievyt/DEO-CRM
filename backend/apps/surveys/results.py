"""Aggregations for survey results.

Two views over the same data:

* :func:`results_by_question` — every question with its statistics.
* :func:`table_columns` / :func:`table_row` — one row per response, one
  column per question (used by the paginated table and the CSV export).
"""

import statistics
from collections import Counter, defaultdict
from decimal import Decimal

from django.db.models import Count

from .models import Answer, AnswerChoice, Question


def to_number(value):
    """Decimal -> int when integral, else float rounded to 2 places."""
    if value is None:
        return None
    value = Decimal(value)
    if value == value.to_integral_value():
        return int(value)
    return round(float(value), 2)


def survey_questions(survey):
    return list(
        Question.objects.filter(section__survey=survey)
        .select_related("section")
        .prefetch_related("options")
        .order_by("section__order", "section__title", "order", "code")
    )


def _numeric_stats(values):
    if not values:
        return {"average": None, "median": None, "min": None, "max": None, "sum": None}
    floats = [float(v) for v in values]
    return {
        "average": round(statistics.fmean(floats), 2),
        "median": to_number(Decimal(str(statistics.median(floats)))),
        "min": to_number(min(values)),
        "max": to_number(max(values)),
        "sum": to_number(sum(values)),
    }


def results_by_question(survey):
    questions = survey_questions(survey)
    total = survey.responses.count()

    answers = (
        Answer.objects.filter(response__survey=survey)
        .select_related("response")
        .order_by("response_id")
    )
    by_question = defaultdict(list)
    for answer in answers:
        by_question[answer.question_id].append(answer)

    choice_counts = Counter(
        {
            row["option_id"]: row["n"]
            for row in AnswerChoice.objects.filter(answer__response__survey=survey)
            .values("option_id")
            .annotate(n=Count("id"))
        }
    )

    items = []
    for question in questions:
        q_answers = by_question.get(question.id, [])
        answered = len(q_answers)
        item = {
            "id": str(question.id),
            "code": question.code,
            "text": question.text,
            "type": question.type,
            "required": question.required,
            "section": {"id": str(question.section_id), "title": question.section.title},
            "answered_count": answered,
            "skipped_count": total - answered,
        }

        if question.type in Question.CHOICE_TYPES:
            options = []
            for option in question.options.all():
                count = choice_counts.get(option.id, 0)
                options.append(
                    {
                        "id": str(option.id),
                        "text": option.text,
                        "count": count,
                        "percent": round(count * 100 / answered, 1) if answered else 0.0,
                    }
                )
            other_answers = [a.text_value for a in q_answers if a.text_value]
            item["options"] = options
            item["other"] = (
                {
                    "label": question.other_label,
                    "count": len(other_answers),
                    "percent": (round(len(other_answers) * 100 / answered, 1) if answered else 0.0),
                    "answers": other_answers,
                }
                if question.has_other
                else None
            )
        elif question.type in Question.NUMERIC_TYPES:
            values = [a.number_value for a in q_answers if a.number_value is not None]
            item["stats"] = _numeric_stats(values)
            if question.type == Question.Type.SCALE:
                dist = Counter(int(v) for v in values)
                item["scale"] = {
                    "min": question.scale_min,
                    "max": question.scale_max,
                    "labels": question.scale_labels or {},
                }
                item["distribution"] = [
                    {"value": v, "count": dist.get(v, 0)}
                    for v in range(question.scale_min, question.scale_max + 1)
                ]
            else:
                item["values"] = [to_number(v) for v in values]
        else:
            item["answers"] = [
                {
                    "response_id": str(a.response_id),
                    "respondent_name": a.response.respondent_name or None,
                    "text": a.text_value,
                }
                for a in q_answers
                if a.text_value
            ]
        items.append(item)

    return {
        "survey": {
            "id": str(survey.id),
            "title": survey.title,
            "is_anonymous": survey.is_anonymous,
            "status": survey.status,
        },
        "total_responses": total,
        "questions": items,
    }


# --- table -------------------------------------------------------------------


def table_columns(questions):
    return [
        {
            "id": str(q.id),
            "code": q.code,
            "text": q.text,
            "type": q.type,
            "section_title": q.section.title,
        }
        for q in questions
    ]


def prefetch_rows(responses):
    """Load answers and choices for a page of responses in two queries."""
    response_ids = [r.id for r in responses]
    answers = Answer.objects.filter(response_id__in=response_ids)
    choices = defaultdict(list)
    for row in AnswerChoice.objects.filter(answer__response_id__in=response_ids).values(
        "answer_id", "option_id"
    ):
        choices[row["answer_id"]].append(row["option_id"])
    by_response = defaultdict(dict)
    for answer in answers:
        answer.selected_option_ids = choices.get(answer.id, [])
        by_response[answer.response_id][answer.question_id] = answer
    return by_response


def option_labels(questions):
    return {o.id: o.text for q in questions for o in q.options.all()}


def answer_cell(question, answer, labels):
    if answer is None:
        return None
    if question.type in Question.NUMERIC_TYPES:
        number = to_number(answer.number_value)
        display = "" if number is None else str(number)
        return {"value": number, "other_text": None, "display": display}
    if question.type in Question.TEXT_TYPES:
        return {"value": answer.text_value, "other_text": None, "display": answer.text_value}

    selected = set(answer.selected_option_ids)
    ordered = [o.id for o in question.options.all() if o.id in selected]
    parts = [labels[oid] for oid in ordered]
    if answer.text_value:
        parts.append(f"{question.other_label}: {answer.text_value}")
    ids = [str(oid) for oid in ordered]
    value = ids if question.type == Question.Type.MULTIPLE_CHOICE else (ids[0] if ids else None)
    return {
        "value": value,
        "other_text": answer.text_value or None,
        "display": "; ".join(parts),
    }


def table_row(response, questions, answers_by_question, labels):
    return {
        "id": str(response.id),
        "submitted_date": response.submitted_date.isoformat(),
        "submitted_at": response.submitted_at.isoformat() if response.submitted_at else None,
        "respondent_name": response.respondent_name or None,
        "user_id": str(response.user_id) if response.user_id else None,
        "answers": {
            str(q.id): answer_cell(q, answers_by_question.get(q.id), labels) for q in questions
        },
    }
