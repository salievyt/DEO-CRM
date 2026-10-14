"""Provide starter services for the deal item picker without changing existing items."""

from django.db import migrations


DEFAULT_SERVICES = (
    ("Веб-разработка", "Разработка лендинга", "проект"),
    ("Веб-разработка", "Разработка корпоративного сайта", "проект"),
    ("Веб-разработка", "Разработка интернет-магазина", "проект"),
    ("Дизайн", "Дизайн интерфейса (UI/UX)", "проект"),
    ("Дизайн", "Разработка фирменного стиля", "проект"),
    ("CRM-системы", "Внедрение и настройка CRM", "проект"),
    ("CRM-системы", "Интеграция и автоматизация", "проект"),
    ("Маркетинг", "SEO-продвижение", "месяц"),
    ("Маркетинг", "Настройка рекламных кампаний", "проект"),
    ("Поддержка", "Техническая поддержка", "месяц"),
    ("Консалтинг", "Консультация", "час"),
)


def seed_default_services(apps, schema_editor):
    Category = apps.get_model("catalog", "CatalogCategory")
    Item = apps.get_model("catalog", "CatalogItem")
    alias = schema_editor.connection.alias
    categories = {}
    for category_name, name, unit in DEFAULT_SERVICES:
        # Names are not unique in the schema; preserve existing services and prices.
        if Item.objects.using(alias).filter(name=name, type="service").exists():
            continue
        if category_name not in categories:
            category = Category.objects.using(alias).filter(name=category_name).first()
            if category is None:
                category = Category.objects.using(alias).create(name=category_name)
            categories[category_name] = category
        Item.objects.using(alias).create(
            name=name,
            type="service",
            category=categories[category_name],
            unit=unit,
            price=0,
            cost_price=0,
            status="active",
        )


class Migration(migrations.Migration):
    dependencies = [("catalog", "0001_initial")]
    # Keep catalog records on rollback: users may have edited or sold them.
    operations = [migrations.RunPython(seed_default_services, migrations.RunPython.noop)]
