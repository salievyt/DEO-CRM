from django.db import migrations

from apps.learning.seed_articles import ARTICLES


def seed_articles(apps, schema_editor):
    Article = apps.get_model("learning", "Article")
    Article.objects.all().delete()
    Article.objects.bulk_create(
        Article(
            title=item["title"],
            slug=item["slug"],
            summary=item["summary"],
            category=item["category"],
            reading_time_minutes=item["reading_time_minutes"],
            sections=item["sections"],
            order=item["order"],
            is_published=True,
        )
        for item in ARTICLES
    )


def unseed_articles(apps, schema_editor):
    Article = apps.get_model("learning", "Article")
    Article.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("learning", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_articles, unseed_articles),
    ]
