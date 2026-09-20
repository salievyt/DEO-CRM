from django.test import TestCase
from rest_framework.test import APIClient

from .defaults import DEFAULT_LEAD_STAGES
from .models import Lead, LeadHistory, LeadStage


class PublicLeadFormTests(TestCase):
    def test_empty_funnel_seeds_default_stages(self):
        LeadStage.objects.all().delete()
        public = APIClient()
        response = public.post(
            "/api/v1/leads/public/",
            {
                "contact_name": "Иван",
                "phone": "+79990001122",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)

        names = list(LeadStage.objects.values_list("name", flat=True).order_by("order"))
        self.assertEqual(names, [s["name"] for s in DEFAULT_LEAD_STAGES])

        lead = Lead.objects.get(contact_name="Иван")
        self.assertEqual(lead.current_stage.name, "Новая заявка")
        self.assertTrue(LeadHistory.objects.filter(lead=lead).exists())

    def test_existing_funnel_is_not_extended(self):
        custom = LeadStage.objects.create(name="Свой этап", order=0)
        before = LeadStage.objects.count()
        public = APIClient()
        response = public.post(
            "/api/v1/leads/public/",
            {"contact_name": "Мария", "phone": "+79990001122"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(LeadStage.objects.count(), before)
        self.assertEqual(Lead.objects.get(contact_name="Мария").current_stage, custom)
