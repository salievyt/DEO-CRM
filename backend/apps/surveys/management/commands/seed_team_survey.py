"""Create the DEO CORE team survey and the named «Готов участвовать» form.

Idempotent: surveys are looked up by ``slug``; an existing survey is never
modified (edits made in the CRM are kept). Surveys are created disabled —
set the deadline and enable them in the CRM, or pass ``--activate``.

    python manage.py seed_team_survey [--activate]
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.surveys.models import Question, QuestionOption, Survey, SurveySection
from apps.surveys.seed_data.team_survey import READY_SURVEY_SLUG, SURVEYS, TEAM_SURVEY_SLUG

QUESTION_FIELDS = (
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
)


def create_survey(data, activate=False):
    survey = Survey.objects.create(
        slug=data["slug"],
        title=data["title"],
        description=data.get("description", ""),
        thank_you_text=data.get("thank_you_text", ""),
        is_anonymous=data["is_anonymous"],
        is_active=activate,
    )
    for s_index, section_data in enumerate(data["sections"], start=1):
        section = SurveySection.objects.create(
            survey=survey,
            title=section_data["title"],
            description=section_data.get("description", ""),
            order=s_index,
        )
        for q_index, q_data in enumerate(section_data["questions"], start=1):
            fields = {k: q_data[k] for k in QUESTION_FIELDS if k in q_data}
            question = Question.objects.create(section=section, order=q_index, **fields)
            for o_index, option in enumerate(q_data.get("options", []), start=1):
                if isinstance(option, str):
                    option = {"text": option}
                QuestionOption.objects.create(
                    question=question,
                    order=o_index,
                    text=option["text"],
                    is_exclusive=option.get("is_exclusive", False),
                )
    return survey


class Command(BaseCommand):
    help = "Создаёт «Опрос команды DEO CORE» и именную форму «Готов участвовать» (идемпотентно)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--activate",
            action="store_true",
            help="Сразу включить приём ответов у создаваемых опросов.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        for data in SURVEYS:
            if Survey.objects.filter(slug=data["slug"]).exists():
                self.stdout.write(f"= {data['title']}: уже есть, не изменяю")
                continue
            survey = create_survey(data, activate=options["activate"])
            count = Question.objects.filter(section__survey=survey).count()
            self.stdout.write(self.style.SUCCESS(f"+ {survey.title}: {count} вопросов"))

        team = Survey.objects.filter(slug=TEAM_SURVEY_SLUG).first()
        ready = Survey.objects.filter(slug=READY_SURVEY_SLUG).first()
        if team and ready and team.follow_up_survey_id is None:
            team.follow_up_survey = ready
            team.save(update_fields=["follow_up_survey", "updated_at"])
            self.stdout.write(f"  ссылка после опроса → «{ready.title}»")

        for survey in (team, ready):
            if survey is not None:
                self.stdout.write(
                    f"  {survey.title}: {survey.status}, ссылка: "
                    f"{survey.public_url or survey.public_token}"
                )
