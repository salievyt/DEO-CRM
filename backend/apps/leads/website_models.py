"""Idempotency receipts and private, chunked website attachments.

Binary chunks live in the database, so Vercel functions require no writable disk
and never publish a customer brief through MEDIA_URL.
"""

from django.db import models

CHUNK_BYTES = 512 * 1024
MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024


class WebsiteSubmission(models.Model):
    request_id = models.UUIDField(primary_key=True, editable=False)
    lead = models.OneToOneField(
        "leads.Lead",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="website_submission",
    )
    payload_digest = models.CharField(max_length=64, editable=False)
    project_type = models.CharField(max_length=30)
    budget_range = models.CharField(max_length=30, blank=True)
    timeline = models.CharField(max_length=30, blank=True)
    locale = models.CharField(max_length=2, default="ru")
    original_contact = models.CharField(max_length=150, blank=True)
    referrer = models.URLField(max_length=2000, blank=True)
    utm = models.JSONField(default=dict)
    consent = models.BooleanField(default=True)
    consent_version = models.CharField(max_length=30)
    source_created_at = models.DateTimeField()
    attachment_name = models.CharField(max_length=255, blank=True)
    attachment_size = models.PositiveIntegerField(default=0)
    attachment_sha256 = models.CharField(max_length=64, blank=True)
    attachment_parts = models.PositiveSmallIntegerField(default=0)
    attachment_complete = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Заявка с сайта DEO CORE"
        verbose_name_plural = "Заявки с сайта DEO CORE"
        ordering = ["-created_at"]

    def __str__(self):
        return str(self.request_id)


class WebsiteAttachmentChunk(models.Model):
    submission = models.ForeignKey(
        WebsiteSubmission, on_delete=models.CASCADE, related_name="chunks"
    )
    index = models.PositiveSmallIntegerField()
    content = models.BinaryField()
    sha256 = models.CharField(max_length=64)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["submission", "index"], name="website_attachment_unique_chunk"
            )
        ]
        ordering = ["index"]
