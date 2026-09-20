from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.forms.models import FormInvitation, FormTemplate
from apps.leads.models import Lead, LeadHistory, LeadStage


def make_role(name):
    return Role.objects.get_or_create(name=name)[0]


class FormsApiTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner@deo.test",
            email="owner@deo.test",
            password="pass123",
            role=make_role("owner"),
        )
        self.developer = User.objects.create_user(
            username="dev@deo.test",
            email="dev@deo.test",
            password="pass123",
            role=make_role("developer"),
        )
        self.client_api = APIClient()

    def _create_template(self):
        return FormTemplate.objects.create(
            title="Анкета клиента",
            entity_type=FormTemplate.EntityType.CLIENT,
            form_fields=[
                {"key": "name", "label": "Имя", "type": "text", "required": True},
                {"key": "comment", "label": "Комментарий", "type": "textarea", "required": False},
            ],
            created_by=self.owner,
        )

    def test_list_templates_requires_owner(self):
        self._create_template()
        self.client_api.force_authenticate(self.developer)
        response = self.client_api.get("/api/v1/forms/")
        self.assertEqual(response.status_code, 403)

        self.client_api.force_authenticate(self.owner)
        response = self.client_api.get("/api/v1/forms/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["title"], "Анкета клиента")

    def test_create_template_validates_fields(self):
        self.client_api.force_authenticate(self.owner)
        response = self.client_api.post(
            "/api/v1/forms/",
            {
                "title": "Анкета сотрудника",
                "entity_type": "employee",
                "form_fields": [
                    {"key": "bad", "label": "Без типа", "type": "unknown"},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("form_fields", response.data["detail"])

    def test_template_has_public_link_and_accepts_multiple_responses(self):
        form = self._create_template()
        token = form.public_token

        public = APIClient()
        detail = public.get(f"/api/v1/forms/i/{token}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["form"]["title"], "Анкета клиента")

        submit = public.post(
            f"/api/v1/forms/i/{token}/",
            {"response": {"name": "Иван", "comment": "Привет"}},
            format="json",
        )
        self.assertEqual(submit.status_code, 200)

        invitation = FormInvitation.objects.get(form=form)
        self.assertEqual(invitation.status, FormInvitation.Status.FILLED)
        self.assertIsNotNone(invitation.submitted_at)
        self.assertEqual(invitation.response["name"], "Иван")

        second = public.post(
            f"/api/v1/forms/i/{token}/",
            {"response": {"name": "Мария"}},
            format="json",
        )
        self.assertEqual(second.status_code, 200)
        self.assertEqual(FormInvitation.objects.filter(form=form).count(), 2)

    def test_expired_public_link_returns_gone(self):
        from datetime import timedelta
        from django.utils import timezone

        form = self._create_template()
        form.public_link_expires_at = timezone.now() - timedelta(seconds=1)
        form.save(update_fields=["public_link_expires_at"])
        public = APIClient()
        response = public.get(f"/api/v1/forms/i/{form.public_token}/")
        self.assertEqual(response.status_code, 410)

    def test_unknown_token_404(self):
        public = APIClient()
        response = public.get(
            "/api/v1/forms/i/00000000-0000-0000-0000-000000000000/"
        )
        self.assertEqual(response.status_code, 404)


class FormLeadCreationTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner@deo.test",
            email="owner@deo.test",
            password="pass123",
            role=make_role("owner"),
        )
        self.public = APIClient()

    def _stage(self, name="Новая заявка"):
        return LeadStage.objects.create(name=name, order=1)

    def _template(self, **overrides):
        values = {
            "title": "Анкета с лидом",
            "form_fields": [
                {"key": "name", "label": "Имя", "type": "text", "required": True},
                {"key": "phone_field", "label": "Телефон", "type": "phone", "required": False},
                {"key": "email_field", "label": "Email", "type": "email", "required": False},
                {"key": "budget_field", "label": "Бюджет", "type": "text", "required": False},
                {"key": "message", "label": "Сообщение", "type": "textarea", "required": False},
            ],
            "created_by": self.owner,
        }
        values.update(overrides)
        return FormTemplate.objects.create(**values)

    def test_response_creates_lead_with_mapped_values(self):
        stage = self._stage()
        form = self._template(
            create_lead=True,
            lead_field_map={
                "contact_name": "name",
                "phone": "phone_field",
                "email": "email_field",
                "budget": "budget_field",
                "notes": "message",
            },
        )

        response = self.public.post(
            f"/api/v1/forms/i/{form.public_token}/",
            {
                "response": {
                    "name": "Иван",
                    "phone_field": "+79990001122",
                    "email_field": "ivan@test.dev",
                    "budget_field": "150000",
                    "message": "Хочу сайт",
                }
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        lead = Lead.objects.get()
        self.assertEqual(lead.contact_name, "Иван")
        self.assertEqual(lead.phone, "+79990001122")
        self.assertEqual(lead.email, "ivan@test.dev")
        self.assertEqual(lead.budget, 150000)
        self.assertEqual(lead.notes, "Хочу сайт")
        self.assertEqual(lead.source, "website")
        self.assertEqual(lead.current_stage, stage)

        invitation = FormInvitation.objects.get(form=form)
        self.assertEqual(invitation.lead, lead)

        history = LeadHistory.objects.get(lead=lead)
        self.assertEqual(history.to_stage, stage)
        self.assertIn("Анкета с лидом", history.notes)

    def test_response_skips_lead_without_contact_name(self):
        self._stage()
        form = self._template(
            create_lead=True,
            lead_field_map={
                "contact_name": "name",
                "phone": "phone_field",
            },
        )
        response = self.public.post(
            f"/api/v1/forms/i/{form.public_token}/",
            {"response": {"phone_field": "+79990001122"}},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Lead.objects.count(), 0)

    def test_response_creates_stage_and_lead_when_no_stages(self):
        form = self._template(
            create_lead=True,
            lead_field_map={"contact_name": "name"},
        )
        response = self.public.post(
            f"/api/v1/forms/i/{form.public_token}/",
            {"response": {"name": "Иван"}},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        lead = Lead.objects.get(contact_name="Иван")
        self.assertEqual(lead.current_stage.name, "Новая заявка")
        self.assertEqual(LeadStage.objects.count(), 1)

    def test_response_accepts_invalid_budget(self):
        self._stage()
        form = self._template(
            create_lead=True,
            lead_field_map={
                "contact_name": "name",
                "budget": "budget_field",
            },
        )
        response = self.public.post(
            f"/api/v1/forms/i/{form.public_token}/",
            {"response": {"name": "Иван", "budget_field": "не число"}},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        lead = Lead.objects.get(contact_name="Иван")
        self.assertIsNone(lead.budget)

    def test_invitation_serializer_exposes_lead(self):
        stage = self._stage()
        form = self._template(
            create_lead=True,
            lead_field_map={"contact_name": "name"},
        )
        self.public.post(
            f"/api/v1/forms/i/{form.public_token}/",
            {"response": {"name": "Мария"}},
            format="json",
        )
        lead = Lead.objects.get(contact_name="Мария")
        self.assertEqual(lead.current_stage, stage)

        client = APIClient()
        client.force_authenticate(self.owner)
        invitation = FormInvitation.objects.get(form=form)
        data = client.get(f"/api/v1/forms/invitations/{invitation.id}/")
        self.assertEqual(data.status_code, 200)
        self.assertEqual(data.data["lead_id"], str(lead.id))
        self.assertEqual(data.data["lead_contact_name"], "Мария")

    def test_create_template_validates_lead_map(self):
        client = APIClient()
        client.force_authenticate(self.owner)

        missing_contact = client.post(
            "/api/v1/forms/",
            {
                "title": "Без контакта",
                "entity_type": "client",
                "form_fields": [
                    {"key": "phone_field", "label": "Телефон", "type": "phone", "required": True},
                ],
                "create_lead": True,
                "lead_field_map": {"phone": "phone_field"},
            },
            format="json",
        )
        self.assertEqual(missing_contact.status_code, 400)
        self.assertIn("lead_field_map", missing_contact.data["detail"])

        unknown_attr = client.post(
            "/api/v1/forms/",
            {
                "title": "Лишний атрибут",
                "entity_type": "client",
                "form_fields": [
                    {"key": "name", "label": "Имя", "type": "text", "required": True},
                ],
                "create_lead": True,
                "lead_field_map": {"contact_name": "name", "hacker_field": "name"},
            },
            format="json",
        )
        self.assertEqual(unknown_attr.status_code, 400)
        self.assertIn("lead_field_map", unknown_attr.data["detail"])

        unknown_field = client.post(
            "/api/v1/forms/",
            {
                "title": "Поле анкеты не существует",
                "entity_type": "client",
                "form_fields": [
                    {"key": "name", "label": "Имя", "type": "text", "required": True},
                ],
                "create_lead": True,
                "lead_field_map": {"contact_name": "ghost"},
            },
            format="json",
        )
        self.assertEqual(unknown_field.status_code, 400)
        self.assertIn("lead_field_map", unknown_field.data["detail"])

        valid = client.post(
            "/api/v1/forms/",
            {
                "title": "Корректный шаблон",
                "entity_type": "client",
                "form_fields": [
                    {"key": "name", "label": "Имя", "type": "text", "required": True},
                ],
                "create_lead": True,
                "lead_field_map": {"contact_name": "name"},
            },
            format="json",
        )
        self.assertEqual(valid.status_code, 201)
        self.assertTrue(valid.data["create_lead"])
        self.assertEqual(valid.data["lead_field_map"], {"contact_name": "name"})
