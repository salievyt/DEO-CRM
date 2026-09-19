import base64
import io
import secrets
from urllib.parse import quote

import qrcode
from django.conf import settings
from django.core import signing
from django.core.cache import cache
from django.utils import timezone
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework_simplejwt.tokens import RefreshToken

from .models import RecoveryCode

CHALLENGE_SALT = "accounts.two-factor-login"
CHALLENGE_MAX_AGE = 300
RECOVERY_CODE_COUNT = 10


def issue_login_challenge(user):
    return signing.dumps({"user_id": str(user.pk)}, salt=CHALLENGE_SALT, compress=True)


def load_login_challenge(challenge):
    return signing.loads(challenge, salt=CHALLENGE_SALT, max_age=CHALLENGE_MAX_AGE)


def issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


def pending_device(user):
    TOTPDevice.objects.filter(user=user, confirmed=False).delete()
    return TOTPDevice.objects.create(
        user=user,
        name="DEO CRM",
        confirmed=False,
        tolerance=1,
    )


def confirmed_device(user):
    return TOTPDevice.objects.filter(user=user, confirmed=True).first()


def build_setup_payload(user, device):
    secret = base64.b32encode(device.bin_key).decode("ascii").rstrip("=")
    issuer = getattr(settings, "TOTP_ISSUER", "DEO CRM")
    uri = (
        f"otpauth://totp/{quote(issuer)}:{quote(user.email)}"
        f"?secret={secret}&issuer={quote(issuer)}&algorithm=SHA1&digits=6&period=30"
    )
    image = qrcode.make(uri)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return {
        "secret": secret,
        "otpauth_uri": uri,
        "qr_code": f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode('ascii')}",
    }


def generate_recovery_codes(user):
    user.recovery_codes.all().delete()
    codes = []
    for _ in range(RECOVERY_CODE_COUNT):
        raw = secrets.token_hex(5).upper()
        code = f"{raw[:5]}-{raw[5:]}"
        recovery = RecoveryCode(user=user)
        recovery.set_code(code)
        recovery.save()
        codes.append(code)
    return codes


def consume_recovery_code(user, code):
    normalized = (code or "").strip().upper()
    for recovery in user.recovery_codes.filter(used_at__isnull=True):
        if recovery.matches(normalized):
            recovery.used_at = timezone.now()
            recovery.save(update_fields=["used_at"])
            return True
    return False


def verify_second_factor(user, code):
    normalized = (code or "").replace(" ", "").strip()
    device = confirmed_device(user)
    if device and normalized.isdigit() and device.verify_token(normalized):
        return True
    return consume_recovery_code(user, normalized)


def is_rate_limited(scope, identifier, limit=6, window=300):
    key = f"2fa-rate:{scope}:{identifier}"
    try:
        current = cache.get(key, 0)
        if current >= limit:
            return True
        if current == 0:
            cache.set(key, 1, window)
        else:
            cache.incr(key)
    except Exception:
        return False
    return False


def clear_rate_limit(scope, identifier):
    try:
        cache.delete(f"2fa-rate:{scope}:{identifier}")
    except Exception:
        pass
