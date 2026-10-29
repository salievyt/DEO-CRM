# DEO CORE website intake

The website backend submits briefs to `/api/v1/leads/website/` using server-only `WEBSITE_INGEST_TOKEN` (at least 32 characters). Configure the identical value as `CRM_API_TOKEN` on the website backend. No frontend credentials are required. A read-only authenticated health check is at `/api/v1/leads/website/health/`.

Protocol v1 uses the website request UUID and Idempotency-Key. Replays return the existing lead; conflicting data returns 409. Deleted leads leave an intake tombstone and return 410. A sales stage must already exist. Optional WEBSITE_LEAD_ASSIGNEE_ID selects an active manager. Without it, the lead is unassigned. Notifications remain inside CRM.

The original budget range, timeline, contact, locale, consent and attribution are retained in website metadata. Ranges are not converted into invented decimal budgets. Email-only inquiries are supported.

Private attachments up to 5 MiB are uploaded in 512 KiB binary parts under `/api/v1/leads/website/<request UUID>/attachment/<part index>/`. Size, SHA256 and content type are checked before completion. Parts persist in PostgreSQL for serverless deployments. CRM staff download files using their normal authenticated session; the integration key never permits listing CRM leads.

Deployment applies migration 0006 through the existing Vercel build hook. Keep WEBSITE_INGEST_TOKEN out of Git. Verify sender with `python manage.py check_crm_connection` before enabling delivery.

Validation: `python manage.py test apps.leads.tests apps.leads.test_website --settings=config.settings.test`; frontend TypeScript compilation.
