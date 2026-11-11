import csv
import io
from datetime import timedelta
from io import StringIO

from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.surveys.models import (
    Answer,
    AnswerChoice,
    Question,
    QuestionOption,
    Survey,
    SurveyResponse,
    SurveySection,
)
from apps.surveys.seed_data.team_survey import READY_SURVEY_SLUG, TEAM_SURVEY_SLUG

BASE = "/api/v1/surveys/"


def make_user(role_name, email=None):
    role = Role.objects.get_or_create(name=role_name)[0]
    email = email or f"{role_name}@deo.test"
    return User.objects.create_user(
        username=email, email=email, password="pass123", role=role, first_name=role_name
    )


def build_survey(anonymous=True, active=True):
    survey = Survey.objects.create(
        title="Тест", is_anonymous=anonymous, is_active=active, thank_you_text="Спасибо!"
    )
    section = SurveySection.objects.create(survey=survey, title="Раздел", order=1)
    q = {}
    q["scale"] = Question.objects.create(
        section=section,
        code="1",
        text="Шкала",
        type="scale",
        order=1,
        scale_labels={"1": "плохо", "5": "хорошо"},
    )
    q["single"] = Question.objects.create(
        section=section, code="2", text="Один", type="single_choice", order=2, has_other=True
    )
    q["multi"] = Question.objects.create(
        section=section,
        code="3",
        text="Несколько",
        type="multiple_choice",
        order=3,
        max_choices=2,
        has_other=True,
    )
    q["number"] = Question.objects.create(
        section=section,
        code="4",
        text="Часы",
        type="number",
        order=4,
        min_value=0,
        max_value=100,
    )
    q["short"] = Question.objects.create(
        section=section, code="5", text="Коротко", type="short_text", order=5, required=False
    )
    q["long"] = Question.objects.create(
        section=section, code="6", text="Подробно", type="long_text", order=6, required=False
    )
    opts = {}
    for key in ("single", "multi"):
        opts[key] = [
            QuestionOption.objects.create(question=q[key], text=f"{key}-{i}", order=i)
            for i in range(1, 4)
        ]
    opts["multi"].append(
        QuestionOption.objects.create(
            question=q["multi"], text="Ничего", order=4, is_exclusive=True
        )
    )
    return survey, q, opts


def valid_answers(q, opts, scale=4, number=10, text="ok"):
    return [
        {"question": str(q["scale"].id), "value": scale},
        {"question": str(q["single"].id), "value": str(opts["single"][0].id)},
        {"question": str(q["multi"].id), "value": [str(opts["multi"][0].id)]},
        {"question": str(q["number"].id), "value": number},
        {"question": str(q["long"].id), "value": text},
    ]


class SurveyTestCase(TestCase):
    def setUp(self):
        cache.clear()
        self.api = APIClient()


class PermissionTests(SurveyTestCase):
    def test_managers_can_manage(self):
        survey, _, _ = build_survey()
        for role in ("hr", "owner", "superadmin"):
            user = make_user(role)
            self.api.force_authenticate(user)
            self.assertEqual(self.api.get(BASE).status_code, 200, role)
            self.assertEqual(self.api.get(f"{BASE}{survey.id}/results/").status_code, 200)
            self.assertEqual(self.api.get(f"{BASE}{survey.id}/responses/").status_code, 200)
            self.assertEqual(self.api.get(f"{BASE}{survey.id}/responses/export/").status_code, 200)
            created = self.api.post(BASE, {"title": f"Опрос {role}"}, format="json")
            self.assertEqual(created.status_code, 201, created.data)
            self.assertFalse(created.data["is_active"])
            self.assertEqual(created.data["created_by_name"], role)

    def test_others_cannot(self):
        survey, q, _ = build_survey()
        urls = [
            ("get", BASE),
            ("post", BASE),
            ("get", f"{BASE}{survey.id}/"),
            ("patch", f"{BASE}{survey.id}/"),
            ("post", f"{BASE}{survey.id}/activate/"),
            ("get", f"{BASE}{survey.id}/public-link/"),
            ("get", f"{BASE}{survey.id}/results/"),
            ("get", f"{BASE}{survey.id}/responses/"),
            ("get", f"{BASE}{survey.id}/responses/export/"),
            ("get", f"{BASE}sections/"),
            ("get", f"{BASE}questions/{q['scale'].id}/"),
        ]
        for role in ("developer", "client", "project_manager", None):
            api = APIClient()
            if role:
                api.force_authenticate(make_user(role))
            for method, url in urls:
                response = getattr(api, method)(url)
                self.assertIn(response.status_code, (401, 403), f"{role} {method} {url}")

    def test_hr_role_created_by_migration(self):
        self.assertTrue(Role.objects.filter(name="hr").exists())
        self.assertEqual(Role.objects.get(name="hr").get_name_display(), "HR-менеджер")

    def test_hr_gets_nothing_extra(self):
        api = APIClient()
        api.force_authenticate(make_user("hr"))
        self.assertEqual(api.get("/api/v1/forms/").status_code, 403)
        self.assertEqual(api.get("/api/v1/auth/users/").status_code, 403)


class ManagementApiTests(SurveyTestCase):
    def setUp(self):
        super().setUp()
        self.api.force_authenticate(make_user("hr"))

    def test_full_crud_and_link(self):
        survey = self.api.post(BASE, {"title": "Пульс", "is_anonymous": True}, format="json")
        sid = survey.data["id"]
        section = self.api.post(
            f"{BASE}sections/", {"survey": sid, "title": "Общее", "order": 1}, format="json"
        )
        self.assertEqual(section.status_code, 201, section.data)
        question = self.api.post(
            f"{BASE}questions/",
            {
                "section": section.data["id"],
                "text": "Что важнее?",
                "type": "multiple_choice",
                "max_choices": 2,
                "options": [{"text": "А"}, {"text": "Б"}, {"text": "В"}],
            },
            format="json",
        )
        self.assertEqual(question.status_code, 201, question.data)
        self.assertEqual([o["text"] for o in question.data["options"]], ["А", "Б", "В"])

        listed_surveys = self.api.get(BASE).data["results"]
        self.assertEqual(listed_surveys[0]["question_count"], 1)
        self.assertEqual(listed_surveys[0]["response_count"], 0)

        detail = self.api.get(f"{BASE}{sid}/")
        self.assertEqual(detail.data["question_count"], 1)
        self.assertEqual(detail.data["sections"][0]["questions"][0]["text"], "Что важнее?")

        listed = self.api.get(f"{BASE}questions/", {"survey": sid})
        self.assertEqual(len(listed.data), 1)

        # nested options sync: rename one, drop one, add one
        opts = question.data["options"]
        updated = self.api.patch(
            f"{BASE}questions/{question.data['id']}/",
            {"options": [{"id": opts[0]["id"], "text": "А2"}, {"text": "Г"}]},
            format="json",
        )
        self.assertEqual(updated.status_code, 200, updated.data)
        self.assertEqual([o["text"] for o in updated.data["options"]], ["А2", "Г"])

        link = self.api.get(f"{BASE}{sid}/public-link/")
        self.assertEqual(link.data["status"], "inactive")
        self.assertTrue(link.data["public_url"].endswith(f"/survey/{link.data['public_token']}/"))
        self.assertNotIn("/surveys/", link.data["public_url"])
        self.assertEqual(self.api.post(f"{BASE}{sid}/activate/").data["status"], "open")
        new_link = self.api.post(f"{BASE}{sid}/regenerate-link/")
        self.assertNotEqual(new_link.data["public_token"], link.data["public_token"])
        self.assertEqual(self.api.post(f"{BASE}{sid}/deactivate/").data["is_active"], False)

        self.assertEqual(self.api.delete(f"{BASE}{sid}/").status_code, 204)
        self.assertFalse(Question.objects.exists())

    def test_question_validation(self):
        survey, q, _ = build_survey()
        section = q["scale"].section
        bad = [
            {"type": "single_choice", "options": []},
            {"type": "scale", "scale_min": 5, "scale_max": 1},
            {"type": "scale", "scale_labels": {"9": "x"}},
            {"type": "number", "min_value": 10, "max_value": 1},
            {"type": "single_choice", "options": [{"text": "a"}], "max_choices": 2},
            {"type": "long_text", "has_other": True},
            {"type": "short_text", "identifies_respondent": True},  # anonymous survey
            {"type": "long_text", "options": [{"text": "a"}]},
        ]
        for payload in bad:
            payload.update({"section": str(section.id), "text": "?"})
            response = self.api.post(f"{BASE}questions/", payload, format="json")
            self.assertEqual(response.status_code, 400, payload)

    def test_structure_is_locked_once_answered(self):
        survey, q, opts = build_survey()
        self.api.post(
            f"{BASE}public/{survey.public_token}/",
            {"answers": valid_answers(q, opts)},
            format="json",
        )
        r = self.api.patch(f"{BASE}questions/{q['scale'].id}/", {"type": "number"}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.api.delete(f"{BASE}questions/{q['scale'].id}/")
        self.assertEqual(r.status_code, 409)
        r = self.api.patch(
            f"{BASE}questions/{q['single'].id}/",
            {"options": [{"id": str(opts["single"][1].id), "text": "x"}]},
            format="json",
        )
        self.assertEqual(r.status_code, 400)
        r = self.api.patch(f"{BASE}{survey.id}/", {"is_anonymous": False}, format="json")
        self.assertEqual(r.status_code, 400)
        # survey as a whole can still be deleted
        self.assertEqual(self.api.delete(f"{BASE}{survey.id}/").status_code, 204)
        self.assertFalse(Answer.objects.exists())

    def test_dates_validation(self):
        now = timezone.now()
        r = self.api.post(
            BASE,
            {
                "title": "x",
                "starts_at": now.isoformat(),
                "ends_at": (now - timedelta(1)).isoformat(),
            },
            format="json",
        )
        self.assertEqual(r.status_code, 400)


class PublicSubmitTests(SurveyTestCase):
    def setUp(self):
        super().setUp()
        self.survey, self.q, self.opts = build_survey()
        self.url = f"{BASE}public/{self.survey.public_token}/"

    def submit(self, answers, api=None):
        return (api or self.api).post(self.url, {"answers": answers}, format="json")

    def test_get_structure(self):
        response = self.api.get(self.url)
        self.assertEqual(response.status_code, 200)
        data = response.data
        self.assertEqual(data["title"], "Тест")
        self.assertTrue(data["is_anonymous"])
        self.assertIn("starts_at", data)
        self.assertIsNone(data["starts_at"])
        questions = data["sections"][0]["questions"]
        self.assertEqual([x["code"] for x in questions], ["1", "2", "3", "4", "5", "6"])
        self.assertEqual(questions[0]["scale_labels"], {"1": "плохо", "5": "хорошо"})
        self.assertEqual(questions[2]["max_choices"], 2)
        self.assertEqual(questions[4]["max_length"], 255)
        self.assertIsNone(questions[0]["max_length"])
        self.assertEqual(questions[3]["min_value"], 0)
        self.assertEqual(questions[3]["max_value"], 100)
        for hidden in ("id", "slug", "public_token", "created_by", "is_active"):
            self.assertNotIn(hidden, data)

    def test_submit_ok(self):
        response = self.submit(valid_answers(self.q, self.opts))
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["thank_you_text"], "Спасибо!")
        self.assertIsNone(response.data["follow_up"])
        self.assertEqual(SurveyResponse.objects.count(), 1)
        self.assertEqual(Answer.objects.count(), 5)  # optional short text skipped
        self.assertEqual(AnswerChoice.objects.count(), 2)

    def test_inactive_scheduled_closed_unknown(self):
        self.survey.is_active = False
        self.survey.save()
        self.assertEqual(self.api.get(self.url).status_code, 404)
        self.assertEqual(self.submit(valid_answers(self.q, self.opts)).status_code, 404)
        self.survey.is_active = True
        self.survey.starts_at = timezone.now() + timedelta(days=1)
        self.survey.save()
        not_started = self.api.get(self.url)
        self.assertEqual(not_started.status_code, 403)
        self.assertEqual(not_started.data["detail"]["code"], "survey_not_started")
        self.assertEqual(not_started.data["detail"]["starts_at"], self.survey.starts_at.isoformat())
        self.assertEqual(
            self.submit(valid_answers(self.q, self.opts)).data["detail"]["code"],
            "survey_not_started",
        )
        self.survey.starts_at = None
        self.survey.ends_at = timezone.now() - timedelta(seconds=1)
        self.survey.save()
        self.assertEqual(self.api.get(self.url).status_code, 410)
        self.assertEqual(self.submit(valid_answers(self.q, self.opts)).status_code, 410)
        self.assertEqual(
            self.api.get(f"{BASE}public/00000000-0000-0000-0000-000000000000/").status_code, 404
        )
        self.assertEqual(SurveyResponse.objects.count(), 0)

    def test_throttled(self):
        for _ in range(20):
            self.assertEqual(self.submit(valid_answers(self.q, self.opts)).status_code, 201)
        self.assertEqual(self.submit(valid_answers(self.q, self.opts)).status_code, 429)

    def assertAnswerError(self, key, answers, extra=None):
        response = self.submit(answers)
        self.assertEqual(response.status_code, 400, (key, answers))
        errors = response.data["detail"]["answers"]
        self.assertIn(str(self.q[key].id), errors, errors)
        self.assertEqual(SurveyResponse.objects.count(), 0)

    def replace(self, key, value, other_text=None):
        answers = [
            a for a in valid_answers(self.q, self.opts) if a["question"] != str(self.q[key].id)
        ]
        item = {"question": str(self.q[key].id), "value": value}
        if other_text is not None:
            item["other_text"] = other_text
        return answers + [item]

    def test_required(self):
        answers = [
            a for a in valid_answers(self.q, self.opts) if a["question"] != str(self.q["scale"].id)
        ]
        self.assertAnswerError("scale", answers)
        self.assertAnswerError("single", self.replace("single", None))
        self.assertAnswerError("multi", self.replace("multi", []))

    def test_scale_validation(self):
        for value in (0, 6, 2.5, "abc", True, [1]):
            self.assertAnswerError("scale", self.replace("scale", value))

    def test_number_validation(self):
        for value in (-1, 101, "x", "1.234", "NaN"):
            self.assertAnswerError("number", self.replace("number", value))
        self.assertEqual(self.submit(self.replace("number", "7,5")).status_code, 201)
        self.assertEqual(Answer.objects.get(question=self.q["number"]).number_value, 7.5)

    def test_single_choice_validation(self):
        other_q = self.opts["multi"][0].id
        self.assertAnswerError("single", self.replace("single", str(other_q)))
        self.assertAnswerError("single", self.replace("single", [str(self.opts["single"][0].id)]))
        self.assertAnswerError(
            "single", self.replace("single", str(self.opts["single"][0].id), other_text="и ещё")
        )
        # «Другое» alone is a valid single answer
        self.assertEqual(
            self.submit(self.replace("single", None, other_text="Своё")).status_code, 201
        )
        answer = Answer.objects.get(question=self.q["single"])
        self.assertEqual(answer.text_value, "Своё")
        self.assertEqual(answer.options.count(), 0)

    def test_multiple_choice_validation(self):
        o = [str(x.id) for x in self.opts["multi"]]
        self.assertAnswerError("multi", self.replace("multi", o[:3]))  # max 2
        self.assertAnswerError(
            "multi", self.replace("multi", o[:2], other_text="x")
        )  # other counts
        self.assertAnswerError("multi", self.replace("multi", [o[0], o[0]]))
        self.assertAnswerError("multi", self.replace("multi", [o[0], o[3]]))  # exclusive
        self.assertAnswerError("multi", self.replace("multi", o[0]))  # not a list
        self.assertEqual(
            self.submit(self.replace("multi", [o[0]], other_text="x")).status_code, 201
        )

    def test_whitespace_other_text_does_not_satisfy_required(self):
        self.assertAnswerError("single", self.replace("single", None, other_text="   "))
        self.assertAnswerError("multi", self.replace("multi", [], other_text=" \t\n "))
        # optional choice question with blank «Другое» is simply skipped
        self.q["single"].required = False
        self.q["single"].save()
        response = self.submit(self.replace("single", None, other_text="   "))
        self.assertEqual(response.status_code, 201, response.data)
        self.assertFalse(Answer.objects.filter(question=self.q["single"]).exists())

    def test_text_validation(self):
        self.assertAnswerError("short", self.replace("short", "x" * 256))
        self.assertAnswerError("long", self.replace("long", "x" * 5001))
        self.assertAnswerError("long", self.replace("long", 123))

    def test_other_not_allowed_and_foreign_question(self):
        self.q["single"].has_other = False
        self.q["single"].save()
        self.assertAnswerError("single", self.replace("single", None, other_text="x"))
        foreign, fq, _ = build_survey()
        response = self.submit(
            valid_answers(self.q, self.opts) + [{"question": str(fq["scale"].id), "value": 1}]
        )
        self.assertEqual(response.status_code, 400)
        response = self.api.post(self.url, {"answers": "nope"}, format="json")
        self.assertEqual(response.status_code, 400)


class AnonymityTests(SurveyTestCase):
    def test_anonymous_response_keeps_nothing_identifying(self):
        survey, q, opts = build_survey(anonymous=True)
        user = make_user("developer")
        self.api.force_authenticate(user)
        response = self.api.post(
            f"{BASE}public/{survey.public_token}/",
            {"answers": valid_answers(q, opts)},
            format="json",
            HTTP_USER_AGENT="Secret-Agent/1.0",
            REMOTE_ADDR="10.1.2.3",
        )
        self.assertEqual(response.status_code, 201)
        self.assertNotIn("id", response.data)
        saved = SurveyResponse.objects.get()
        self.assertIsNone(saved.user_id)
        self.assertIsNone(saved.submitted_at)
        self.assertEqual(saved.respondent_name, "")
        self.assertEqual(saved.submitted_date, timezone.localdate())
        field_names = {f.name for f in SurveyResponse._meta.get_fields()}
        self.assertFalse({"ip", "ip_address", "user_agent", "created_at"} & field_names)
        dump = str(list(SurveyResponse.objects.values())) + str(list(Answer.objects.values()))
        self.assertNotIn("10.1.2.3", dump)
        self.assertNotIn("Secret-Agent", dump)

        manager = APIClient()
        manager.force_authenticate(make_user("owner"))
        row = manager.get(f"{BASE}{survey.id}/responses/").data["results"][0]
        self.assertIsNone(row["submitted_at"])
        self.assertIsNone(row["respondent_name"])
        self.assertIsNone(row["user_id"])

    def test_named_survey_keeps_name_and_user(self):
        survey, q, opts = build_survey(anonymous=False)
        name_q = Question.objects.create(
            section=q["scale"].section,
            code="0",
            text="Имя",
            type="short_text",
            order=0,
            identifies_respondent=True,
        )
        user = make_user("developer")
        self.api.force_authenticate(user)
        answers = valid_answers(q, opts) + [{"question": str(name_q.id), "value": "Иван"}]
        response = self.api.post(
            f"{BASE}public/{survey.public_token}/", {"answers": answers}, format="json"
        )
        self.assertEqual(response.status_code, 201, response.data)
        saved = SurveyResponse.objects.get()
        self.assertEqual(saved.respondent_name, "Иван")
        self.assertEqual(saved.user, user)
        self.assertIsNotNone(saved.submitted_at)

    def test_invalid_jwt_does_not_block_public_submit(self):
        survey, q, opts = build_survey()
        self.api.credentials(HTTP_AUTHORIZATION="Bearer broken")
        response = self.api.post(
            f"{BASE}public/{survey.public_token}/",
            {"answers": valid_answers(q, opts)},
            format="json",
        )
        self.assertEqual(response.status_code, 201)


class ResultsTests(SurveyTestCase):
    def setUp(self):
        super().setUp()
        self.survey, self.q, self.opts = build_survey()
        public = APIClient()
        url = f"{BASE}public/{self.survey.public_token}/"
        for scale, number, text in ((1, 10, "раз"), (4, 20, "два"), (5, 33.5, "")):
            answers = valid_answers(self.q, self.opts, scale=scale, number=number, text=text)
            r = public.post(url, {"answers": answers}, format="json")
            self.assertEqual(r.status_code, 201, r.data)
        multi = [str(self.opts["multi"][1].id)]
        answers = [
            a
            for a in valid_answers(self.q, self.opts, scale=4, number=0)
            if a["question"] != str(self.q["multi"].id)
        ]
        answers.append({"question": str(self.q["multi"].id), "value": multi, "other_text": "Своё"})
        public.post(url, {"answers": answers}, format="json")
        self.api.force_authenticate(make_user("owner"))

    def by_code(self, data):
        return {item["code"]: item for item in data["questions"]}

    def test_by_question(self):
        data = self.api.get(f"{BASE}{self.survey.id}/results/").data
        self.assertEqual(data["total_responses"], 4)
        items = self.by_code(data)

        scale = items["1"]
        self.assertEqual(
            scale["stats"], {"average": 3.5, "median": 4, "min": 1, "max": 5, "sum": 14}
        )
        self.assertEqual([d["count"] for d in scale["distribution"]], [1, 0, 0, 2, 1])
        self.assertEqual(scale["scale"]["labels"], {"1": "плохо", "5": "хорошо"})

        number = items["4"]
        self.assertEqual(number["stats"]["median"], 15)
        self.assertEqual(number["stats"]["max"], 33.5)
        self.assertEqual(number["stats"]["sum"], 63.5)
        self.assertEqual(sorted(number["values"]), [0, 10, 20, 33.5])

        single = items["2"]
        self.assertEqual(single["options"][0]["count"], 4)
        self.assertEqual(single["options"][0]["percent"], 100.0)
        self.assertEqual(single["other"]["count"], 0)

        multi = items["3"]
        counts = {o["text"]: o["count"] for o in multi["options"]}
        self.assertEqual(counts, {"multi-1": 3, "multi-2": 1, "multi-3": 0, "Ничего": 0})
        self.assertEqual(multi["other"]["answers"], ["Своё"])

        long_text = items["6"]
        self.assertEqual(long_text["answered_count"], 3)
        self.assertEqual(sorted(a["text"] for a in long_text["answers"]), ["ok", "два", "раз"])
        self.assertEqual(items["5"]["answered_count"], 0)
        self.assertEqual(items["5"]["skipped_count"], 4)

    def test_table_paginated(self):
        data = self.api.get(f"{BASE}{self.survey.id}/responses/", {"page_size": 3}).data
        self.assertEqual(data["count"], 4)
        self.assertEqual(len(data["results"]), 3)
        self.assertIsNotNone(data["next"])
        self.assertEqual([c["code"] for c in data["columns"]], ["1", "2", "3", "4", "5", "6"])
        self.assertTrue(data["is_anonymous"])
        row = data["results"][0]
        self.assertEqual(set(row["answers"]), {c["id"] for c in data["columns"]})
        self.assertIsNone(row["answers"][str(self.q["short"].id)])
        single = row["answers"][str(self.q["single"].id)]
        self.assertEqual(single["value"], str(self.opts["single"][0].id))
        self.assertEqual(single["display"], "single-1")
        page2 = self.api.get(f"{BASE}{self.survey.id}/responses/", {"page_size": 3, "page": 2})
        self.assertEqual(len(page2.data["results"]), 1)

        all_rows = self.api.get(f"{BASE}{self.survey.id}/responses/").data["results"]
        displays = [r["answers"][str(self.q["multi"].id)]["display"] for r in all_rows]
        self.assertIn("multi-2; Другое: Своё", displays)

    def test_csv_export(self):
        response = self.api.get(f"{BASE}{self.survey.id}/responses/export/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response["Content-Type"].startswith("text/csv"))
        self.assertIn("attachment;", response["Content-Disposition"])
        content = response.content.decode("utf-8-sig")
        rows = list(csv.reader(io.StringIO(content), delimiter=";"))
        self.assertEqual(
            rows[0],
            ["Дата", "1 Шкала", "2 Один", "3 Несколько", "4 Часы", "5 Коротко", "6 Подробно"],
        )
        self.assertEqual(len(rows), 5)
        self.assertIn("33,5", [r[4] for r in rows[1:]])
        self.assertNotIn("33.5", content)

    def test_csv_neutralises_formulas(self):
        public = APIClient()
        cache.clear()
        public.post(
            f"{BASE}public/{self.survey.public_token}/",
            {"answers": valid_answers(self.q, self.opts, text="=HYPERLINK(1)")},
            format="json",
        )
        content = self.api.get(f"{BASE}{self.survey.id}/responses/export/").content.decode(
            "utf-8-sig"
        )
        self.assertIn("'=HYPERLINK(1)", content)

    def test_csv_neutralises_formulas_in_name_header_and_options(self):
        survey, q, opts = build_survey(anonymous=False)
        name_q = Question.objects.create(
            section=q["scale"].section,
            code="",
            text="=NAME()",
            type="short_text",
            order=0,
            identifies_respondent=True,
        )
        q["scale"].code = ""
        q["scale"].text = "+SUM(A1)"
        q["scale"].save()
        opts["single"][0].text = "@evil"
        opts["single"][0].save()
        cache.clear()
        answers = valid_answers(q, opts) + [{"question": str(name_q.id), "value": "=cmd|' /C'"}]
        r = APIClient().post(
            f"{BASE}public/{survey.public_token}/", {"answers": answers}, format="json"
        )
        self.assertEqual(r.status_code, 201, r.data)
        content = self.api.get(f"{BASE}{survey.id}/responses/export/").content.decode("utf-8-sig")
        rows = list(csv.reader(io.StringIO(content), delimiter=";"))
        header, row = rows[0], rows[1]
        self.assertEqual(header[1], "Имя")
        self.assertIn("'=NAME()", header)
        self.assertIn("'+SUM(A1)", header)
        self.assertEqual(row[1], "'=cmd|' /C'")
        self.assertIn("'@evil", row)
        self.assertIn("'=cmd|' /C'", row)  # the name question column itself


class CsvSafeTests(TestCase):
    def test_csv_safe(self):
        from apps.surveys.views import _csv_safe

        self.assertEqual(_csv_safe("=1+1"), "'=1+1")
        self.assertEqual(_csv_safe("-3"), "-3")
        self.assertEqual(_csv_safe("-2,5"), "-2,5")
        self.assertEqual(_csv_safe("\tx"), "'\tx")
        self.assertEqual(_csv_safe(None), "")
        self.assertEqual(_csv_safe("обычный"), "обычный")


class ExportCorsTests(SurveyTestCase):
    def test_content_disposition_is_exposed(self):
        survey, _, _ = build_survey()
        self.api.force_authenticate(make_user("hr"))
        response = self.api.get(
            f"{BASE}{survey.id}/responses/export/", HTTP_ORIGIN="http://localhost:3000"
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("Content-Disposition", response["Access-Control-Expose-Headers"])


class PrimaryKeyTests(TestCase):
    def test_no_auto_increment_primary_keys(self):
        from django.apps import apps
        from django.db import models

        for model in apps.get_app_config("surveys").get_models():
            self.assertIsInstance(model._meta.pk, models.UUIDField, model.__name__)


class AnonymityLockTests(SurveyTestCase):
    def setUp(self):
        super().setUp()
        self.api.force_authenticate(make_user("hr"))

    def patch_anonymous(self, survey, value):
        return self.api.patch(f"{BASE}{survey.id}/", {"is_anonymous": value}, format="json")

    def test_can_change_before_first_activation(self):
        survey, _, _ = build_survey(active=False)
        self.assertIsNone(survey.first_activated_at)
        self.assertFalse(self.api.get(f"{BASE}{survey.id}/").data["anonymity_locked"])
        r = self.patch_anonymous(survey, False)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertFalse(r.data["is_anonymous"])

    def test_locked_after_activation_even_if_deactivated(self):
        survey, _, _ = build_survey(active=False)
        r = self.api.post(f"{BASE}{survey.id}/activate/")
        self.assertTrue(r.data["anonymity_locked"])
        survey.refresh_from_db()
        self.assertIsNotNone(survey.first_activated_at)
        first = survey.first_activated_at
        self.api.post(f"{BASE}{survey.id}/deactivate/")
        self.api.post(f"{BASE}{survey.id}/activate/")
        survey.refresh_from_db()
        self.assertEqual(survey.first_activated_at, first)
        r = self.patch_anonymous(survey, False)
        self.assertEqual(r.status_code, 400)
        self.assertIn("is_anonymous", r.data["detail"])
        survey.refresh_from_db()
        self.assertTrue(survey.is_anonymous)
        # same value is not a change
        self.assertEqual(self.patch_anonymous(survey, True).status_code, 200)

    def test_activation_via_patch_is_tracked(self):
        survey, _, _ = build_survey(active=False)
        r = self.api.patch(f"{BASE}{survey.id}/", {"is_active": True}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(self.patch_anonymous(survey, False).status_code, 400)

    def test_locked_when_answers_exist(self):
        survey, q, opts = build_survey(active=True)
        Survey.objects.filter(pk=survey.pk).update(first_activated_at=None)
        survey.refresh_from_db()
        save_answers = APIClient().post(
            f"{BASE}public/{survey.public_token}/",
            {"answers": valid_answers(q, opts)},
            format="json",
        )
        self.assertEqual(save_answers.status_code, 201)
        Survey.objects.filter(pk=survey.pk).update(first_activated_at=None)
        self.assertEqual(self.patch_anonymous(survey, False).status_code, 400)

    def test_model_clean_and_admin_form(self):
        from django.contrib.admin.sites import site
        from django.core.exceptions import ValidationError
        from django.test import RequestFactory

        survey, _, _ = build_survey(active=True)
        survey.is_anonymous = False
        with self.assertRaises(ValidationError):
            survey.full_clean()

        admin = site._registry[Survey]
        request = RequestFactory().get("/")
        request.user = make_user("superadmin")
        Form = admin.get_form(request, survey)
        survey.refresh_from_db()
        data = {
            "title": survey.title,
            "description": "",
            "thank_you_text": "",
            "is_active": "on",
            # is_anonymous unchecked -> False
        }
        form = Form(data=data, instance=survey)
        self.assertFalse(form.is_valid())
        self.assertIn("is_anonymous", form.errors)

        fresh = Survey.objects.create(title="Новый")
        fresh.is_anonymous = False
        fresh.full_clean()  # never activated, no answers: allowed

    def test_name_question_rejected_in_anonymous_survey(self):
        from django.core.exceptions import ValidationError

        survey, q, _ = build_survey(anonymous=True, active=False)
        question = Question(
            section=q["scale"].section,
            text="Имя",
            type="short_text",
            identifies_respondent=True,
        )
        with self.assertRaises(ValidationError) as ctx:
            question.full_clean()
        self.assertIn("identifies_respondent", ctx.exception.message_dict)

        r = self.api.patch(
            f"{BASE}questions/{q['short'].id}/", {"identifies_respondent": True}, format="json"
        )
        self.assertEqual(r.status_code, 400)

        # named survey: allowed; switching it to anonymous is then blocked
        named, nq, _ = build_survey(anonymous=False, active=False)
        name_q = Question(
            section=nq["scale"].section, text="Имя", type="short_text", identifies_respondent=True
        )
        name_q.full_clean()
        name_q.save()
        named.is_anonymous = True
        with self.assertRaises(ValidationError):
            named.full_clean()
        self.assertEqual(self.patch_anonymous(named, True).status_code, 400)

    def test_admin_question_inline_rejects_name_in_anonymous(self):
        from django.contrib.admin.sites import site
        from django.test import RequestFactory

        survey, q, _ = build_survey(anonymous=True, active=False)
        admin = site._registry[Question]
        request = RequestFactory().get("/")
        request.user = make_user("superadmin")
        Form = admin.get_form(request, q["short"])
        data = {
            "section": str(q["short"].section_id),
            "code": "5",
            "text": "Коротко",
            "help_text": "",
            "type": "short_text",
            "order": 5,
            "scale_min": 1,
            "scale_max": 5,
            "scale_labels": "{}",
            "other_label": "Другое",
            "identifies_respondent": "on",
        }
        form = Form(data=data, instance=q["short"])
        self.assertFalse(form.is_valid())
        self.assertIn("identifies_respondent", form.errors)


class SeedTeamSurveyTests(TestCase):
    def run_seed(self, *args):
        out = StringIO()
        call_command("seed_team_survey", *args, stdout=out)
        return out.getvalue()

    def test_seed_creates_both_surveys(self):
        self.run_seed()
        team = Survey.objects.get(slug=TEAM_SURVEY_SLUG)
        ready = Survey.objects.get(slug=READY_SURVEY_SLUG)
        self.assertEqual(team.title, "Опрос команды DEO CORE")
        self.assertTrue(team.is_anonymous)
        self.assertFalse(team.is_active)
        self.assertEqual(team.sections.count(), 9)
        team_q = Question.objects.filter(section__survey=team)
        self.assertEqual(team_q.count(), 33)
        self.assertFalse(team_q.filter(code="1.2").exists())
        self.assertEqual(team_q.filter(required=True).count(), 31)
        self.assertEqual(team_q.filter(type="long_text").count(), 5)
        self.assertEqual(team_q.get(code="4.5").max_choices, 3)
        self.assertEqual(team_q.get(code="2.4").scale_labels["3"], "загрузка нормальная")
        self.assertTrue(team_q.get(code="8.3").has_other)
        self.assertFalse(team_q.filter(identifies_respondent=True).exists())
        self.assertEqual(team.follow_up_survey, ready)

        self.assertFalse(ready.is_anonymous)
        ready_q = Question.objects.filter(section__survey=ready)
        self.assertEqual(ready_q.count(), 4)
        m2 = ready_q.get(code="М.2")
        self.assertEqual(m2.options.count(), 8)
        self.assertFalse(m2.options.filter(text="Пока не готов участвовать").exists())
        self.assertTrue(ready_q.get(code="М.1").identifies_respondent)
        self.assertFalse(ready_q.get(code="М.4").required)

    def test_seed_is_idempotent_and_keeps_edits(self):
        self.run_seed()
        team = Survey.objects.get(slug=TEAM_SURVEY_SLUG)
        team.title = "Изменено в CRM"
        team.save()
        counts = (Survey.objects.count(), Question.objects.count(), QuestionOption.objects.count())
        output = self.run_seed()
        self.assertIn("уже есть", output)
        self.assertEqual(
            counts,
            (Survey.objects.count(), Question.objects.count(), QuestionOption.objects.count()),
        )
        self.assertEqual(Survey.objects.get(slug=TEAM_SURVEY_SLUG).title, "Изменено в CRM")

    def test_seeded_survey_accepts_a_full_response(self):
        self.run_seed("--activate")
        team = Survey.objects.get(slug=TEAM_SURVEY_SLUG)
        api = APIClient()
        cache.clear()
        structure = api.get(f"{BASE}public/{team.public_token}/").data
        self.assertEqual(structure["follow_up"]["title"], "Готов участвовать")
        answers = []
        for section in structure["sections"]:
            for question in section["questions"]:
                if question["type"] == "scale":
                    value = 3
                elif question["type"] == "number":
                    value = 12
                elif question["type"] == "single_choice":
                    value = question["options"][0]["id"]
                elif question["type"] == "multiple_choice":
                    value = [question["options"][0]["id"]]
                else:
                    value = "Текст"
                answers.append({"question": question["id"], "value": value})
        response = api.post(
            f"{BASE}public/{team.public_token}/", {"answers": answers}, format="json"
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Answer.objects.count(), 33)
