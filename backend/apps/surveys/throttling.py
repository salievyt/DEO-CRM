"""Rate limits for the public survey endpoints.

The client IP is used only as a throttle key in the cache and is hashed with
SECRET_KEY first, so the cache never holds raw addresses. Nothing about the
request is written to the database.
"""

import hashlib

from django.conf import settings
from rest_framework.throttling import SimpleRateThrottle


class _HashedIPThrottle(SimpleRateThrottle):
    def get_cache_key(self, request, view):
        ident = self.get_ident(request) or ""
        digest = hashlib.sha256(f"{settings.SECRET_KEY}:{ident}".encode()).hexdigest()[:32]
        return self.cache_format % {"scope": self.scope, "ident": digest}


class SurveyViewThrottle(_HashedIPThrottle):
    scope = "survey_public_view"
    rate = "60/minute"


class SurveySubmitThrottle(_HashedIPThrottle):
    # A whole office behind one NAT must still be able to submit.
    scope = "survey_public_submit"
    rate = "20/hour"
