from django.test import TestCase

from .models import ProjectStatus, ServiceType


class ProjectDefaultsTest(TestCase):
    def test_default_project_statuses_exist(self):
        self.assertQuerySetEqual(
            ProjectStatus.objects.order_by("order").values_list("name", flat=True),
            [
                "Новый",
                "Переговоры",
                "Брифинг",
                "Оценка",
                "Согласование",
                "Планирование",
                "В работе",
                "На проверке",
                "Правки",
                "Готов к запуску",
                "Запущен",
                "На паузе",
                "Поддержка",
                "Завершён",
                "Отменён",
            ],
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
