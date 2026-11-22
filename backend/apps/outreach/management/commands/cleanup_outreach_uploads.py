from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.outreach.models import Recording


class Command(BaseCommand):
    help = "Delete unfinished D2C recording uploads older than seven days. Attached recordings are kept."

    def handle(self, *args, **options):
        stale = Recording.objects.filter(callattempt__isnull=True, created_at__lt=timezone.now()-timezone.timedelta(days=7))
        count = stale.count()
        stale.delete()
        self.stdout.write(f"Removed {count} unfinished uploads.")
