from django.test import TestCase

from .models import ProjectStatus, ServiceType


class ProjectDefaultsTest(TestCase):
    def test_default_project_statuses_exist(self):
        self.assertQuerySetEqual(
            ProjectStatus.objects.order_by("order").values_list("name", flat=True),
            ["Переговоры", "В работе", "На паузе", "Завершён", "Отменён"],
        )

    def test_default_service_types_exist(self):
        expected = {
            "Веб-разработка",
            "Мобильная разработка",
            "Веб-дизайн",
            "Графический дизайн",
            "Маркетинг",
            "CRM-системы",
            "Поддержка",
        }
        self.assertTrue(expected.issubset(set(ServiceType.objects.values_list("name", flat=True))))
