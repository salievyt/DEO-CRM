from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.forms.models import FormInvitation, FormTemplate


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

    def test_generate_link_and_fill_publicly(self):
        form = self._create_template()
        self.client_api.force_authenticate(self.owner)
        response = self.client_api.post(
            "/api/v1/forms/invitations/",
            {
                "form": str(form.id),
                "recipient_name": "Иван Петров",
                "recipient_email": "ivan@test.ru",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        token = response.data["token"]
        self.assertIn("answer_url", response.data)
        self.assertIn(str(token), response.data["answer_url"])

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

        invitation = FormInvitation.objects.get(token=token)
        self.assertEqual(invitation.status, FormInvitation.Status.FILLED)
        self.assertIsNotNone(invitation.submitted_at)
        self.assertEqual(invitation.response["name"], "Иван")

    def test_public_link_rejects_second_submit(self):
        form = self._create_template()
        invitation = FormInvitation.objects.create(
            form=form,
            status=FormInvitation.Status.FILLED,
            response={"name": "Иван"},
        )
        public = APIClient()
        response = public.post(
            f"/api/v1/forms/i/{invitation.token}/",
            {"response": {"name": "Снова"}},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_unknown_token_404(self):
        public = APIClient()
        response = public.get(
            "/api/v1/forms/i/00000000-0000-0000-0000-000000000000/"
        )
        self.assertEqual(response.status_code, 404)