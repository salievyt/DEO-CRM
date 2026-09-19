from django.contrib.auth import get_user_model
from django.test import TestCase
from django_otp.oath import totp
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework.test import APIClient

from .models import RecoveryCode
from .two_factor import generate_recovery_codes

User = get_user_model()

class UserModelTest(TestCase):
    def test_create_user(self):
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User"
        )
        self.assertEqual(user.email, "test@example.com")
        self.assertTrue(user.check_password("testpass123"))
        self.assertEqual(user.get_full_name(), "Test User")


class TwoFactorAuthTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="twofactor",
            email="twofactor@example.com",
            password="StrongPass123!",
            first_name="Two",
            last_name="Factor",
        )

    def test_password_only_login_returns_tokens_when_2fa_disabled(self):
        response = self.client.post(
            "/api/v1/auth/login/",
            {"email": self.user.email, "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)

    def test_totp_completes_two_step_login(self):
        device = TOTPDevice.objects.create(user=self.user, confirmed=True, tolerance=1)
        self.user.is_2fa_enabled = True
        self.user.save(update_fields=["is_2fa_enabled"])

        first = self.client.post(
            "/api/v1/auth/login/",
            {"email": self.user.email, "password": "StrongPass123!"},
            format="json",
        )
        self.assertTrue(first.data["requires_2fa"])

        code = str(totp(device.bin_key, step=device.step, t0=device.t0, digits=device.digits)).zfill(6)
        second = self.client.post(
            "/api/v1/auth/login/2fa/",
            {"challenge": first.data["challenge"], "code": code},
            format="json",
        )
        self.assertEqual(second.status_code, 200)
        self.assertIn("access", second.data)

    def test_recovery_code_is_single_use(self):
        TOTPDevice.objects.create(user=self.user, confirmed=True)
        self.user.is_2fa_enabled = True
        self.user.save(update_fields=["is_2fa_enabled"])
        recovery_code = generate_recovery_codes(self.user)[0]

        def challenge():
            return self.client.post(
                "/api/v1/auth/login/",
                {"email": self.user.email, "password": "StrongPass123!"},
                format="json",
            ).data["challenge"]

        first = self.client.post(
            "/api/v1/auth/login/2fa/",
            {"challenge": challenge(), "code": recovery_code},
            format="json",
        )
        second = self.client.post(
            "/api/v1/auth/login/2fa/",
            {"challenge": challenge(), "code": recovery_code},
            format="json",
        )
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 400)
        self.assertEqual(RecoveryCode.objects.filter(user=self.user, used_at__isnull=False).count(), 1)
