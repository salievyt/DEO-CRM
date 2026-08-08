"""DRF-friendly rate limiting.

``django-ratelimit`` is declared in the project requirements; if it is not
installed in a given environment the decorator degrades to a no-op so the
messaging module never breaks the app.

Usage (class-level, compatible with ``method_decorator(..., name="dispatch")``):

    @method_decorator(
        method_ratelimit(key="user", rate="120/m", method="POST"), name="dispatch"
    )
    class MyView(APIView):
        def post(self, request, ...):
            if getattr(request, "ratelimited", False):
                return Response({"error": "Too many requests"}, status=429)
"""
from functools import wraps

try:
    from django_ratelimit.decorators import ratelimit as _dr_ratelimit

    _HAS_RATELIMIT = True
except ImportError:  # pragma: no cover - optional dependency
    _HAS_RATELIMIT = False

    def _dr_ratelimit(*args, **kwargs):
        def decorator(func):
            return func

        return decorator


def method_ratelimit(key: str = "user", rate: str = "120/m", method: str = "POST"):
    """Class-level decorator: sets ``request.ratelimited``, never blocks."""

    def decorator(view_method):
        @wraps(view_method)
        @_dr_ratelimit(key=key, rate=rate, method=method, block=False)
        def wrapped(*args, **kwargs):
            return view_method(*args, **kwargs)

        return wrapped

    return decorator


def is_ratelimited(request) -> bool:
    return _HAS_RATELIMIT and getattr(request, "ratelimited", False)
