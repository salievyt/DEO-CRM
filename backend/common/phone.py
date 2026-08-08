"""Phone number normalization helpers.

Kept in `common` so both `apps.clients` and `apps.messaging` can use it
without circular imports.
"""
import re


def normalize_phone(value) -> str:
    """Normalize a phone number to digits-only E.164 (without leading '+')."""
    if not value:
        return ""
    digits = re.sub(r"\D", "", str(value))
    # RU convention: 8XXXXXXXXXX == +7XXXXXXXXXX
    if len(digits) == 11 and digits.startswith("8"):
        digits = "7" + digits[1:]
    return digits


def phone_matches(a: str, b: str) -> bool:
    """Compare two phone numbers ignoring formatting."""
    na, nb = normalize_phone(a), normalize_phone(b)
    if not na or not nb:
        return False
    # Compare on the last 10 significant digits to tolerate country codes.
    return na[-10:] == nb[-10:]
