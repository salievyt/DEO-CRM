import uuid
from django.conf import settings
from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator


class SalesSettings(models.Model):
    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )


class SalesMember(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    daily_limit = models.PositiveSmallIntegerField(
        default=25, validators=[MinValueValidator(1), MaxValueValidator(40)]
    )
    active = models.BooleanField(default=True)


class Contact(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, unique=True)
    industry = models.TextField(blank=True)
    offer = models.TextField()
    usp = models.TextField(blank=True)
    script = models.TextField(blank=True)
    objections = models.TextField(blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    assigned_on = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        default="new",
        choices=[
            (x, x)
            for x in [
                "new",
                "no_answer",
                "callback",
                "rejected",
                "wrong_number",
                "interested",
                "exhausted",
            ]
        ],
    )
    next_call_at = models.DateTimeField(null=True, blank=True)
    missed_attempts = models.PositiveSmallIntegerField(default=0)
    lead = models.OneToOneField("leads.Lead", null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [models.Index(fields=["assigned_to", "status"])]


class DailyAssignment(models.Model):
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    date = models.DateField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["contact", "date"], name="outreach_contact_day")
        ]


class Recording(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    size = models.PositiveIntegerField()
    parts = models.PositiveSmallIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)


class RecordingPart(models.Model):
    recording = models.ForeignKey(Recording, on_delete=models.CASCADE, related_name="chunks")
    index = models.PositiveSmallIntegerField()
    data = models.BinaryField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["recording", "index"], name="outreach_recording_part")
        ]


class CallAttempt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="calls")
    employee = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    outcome = models.CharField(max_length=20)
    notes = models.TextField(blank=True)
    recording = models.OneToOneField(Recording, null=True, blank=True, on_delete=models.PROTECT)
    next_call_at = models.DateTimeField(null=True, blank=True)
    request_id = models.UUIDField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
