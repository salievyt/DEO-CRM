from importlib import import_module
from types import SimpleNamespace

import pytest
from django.apps import apps

from apps.catalog.models import CatalogCategory, CatalogItem


@pytest.mark.django_db
def test_default_services_are_idempotent_and_preserve_prices():
    migration = import_module("apps.catalog.migrations.0002_seed_default_services")
    CatalogItem.objects.all().delete()
    CatalogCategory.objects.all().delete()
    existing = CatalogItem.objects.create(
        name="Разработка лендинга", type="service", price=12500, unit="проект"
    )
    editor = SimpleNamespace(connection=SimpleNamespace(alias="default"))
    migration.seed_default_services(apps, editor)
    migration.seed_default_services(apps, editor)
    existing.refresh_from_db()
    assert existing.price == 12500
    assert CatalogItem.objects.count() == len(migration.DEFAULT_SERVICES)
    assert CatalogItem.objects.filter(type="service", status="active").count() == 11
    assert CatalogCategory.objects.filter(name="Маркетинг").count() == 1
