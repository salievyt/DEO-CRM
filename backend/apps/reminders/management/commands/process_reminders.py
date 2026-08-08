from django.core.management.base import BaseCommand

from apps.reminders.services import seed_default_rules, sync_reminders


class Command(BaseCommand):
    help = "Создать правила по умолчанию и запустить генерацию умных напоминаний."

    def add_arguments(self, parser):
        parser.add_argument(
            "--seed-only",
            action="store_true",
            help="Только создать правила по умолчанию, не запускать генерацию.",
        )

    def handle(self, *args, **options):
        created = seed_default_rules()
        if created:
            self.stdout.write(
                self.style.SUCCESS(f"Создано правил по умолчанию: {len(created)}")
            )
        else:
            self.stdout.write("Правила по умолчанию уже существуют.")

        if options["seed_only"]:
            return

        result = sync_reminders()
        self.stdout.write(
            self.style.SUCCESS(
                "Напоминания обновлены: "
                f"создано={result['created']}, истекло={result['expired']}, "
                f"активно={result['active']}"
            )
        )
