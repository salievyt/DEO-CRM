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


class RoleEscalationTest(TestCase):
    """owner/hr/superadmin are granted only by owner or superadmin."""

    def setUp(self):
        from .models import Role

        self.roles = {
            name: Role.objects.get_or_create(name=name)[0]
            for name in ("superadmin", "owner", "project_manager", "developer", "hr", "client")
        }
        self.users = {
            name: User.objects.create_user(
                username=f"{name}@roles.test",
                email=f"{name}@roles.test",
                password="StrongPass123!",
                role=role,
            )
            for name, role in self.roles.items()
        }
        self.target = User.objects.create_user(
            username="target@roles.test",
            email="target@roles.test",
            password="StrongPass123!",
            role=self.roles["developer"],
        )

    def api_as(self, role_name):
        api = APIClient()
        api.force_authenticate(self.users[role_name])
        return api

    def assign(self, actor, target, role):
        return self.api_as(actor).post(
            f"/api/v1/auth/users/{target.pk}/assign-role/", {"role": role}, format="json"
        )

    def invite(self, actor, role, email):
        return self.api_as(actor).post(
            "/api/v1/auth/users/invite/",
            {"email": email, "first_name": "N", "last_name": "N", "role_name": role},
            format="json",
        )

    def test_pm_cannot_assign_privileged_roles(self):
        for role in ("hr", "owner", "superadmin"):
            response = self.assign("project_manager", self.target, role)
            self.assertEqual(response.status_code, 403, role)
            self.target.refresh_from_db()
            self.assertEqual(self.target.role.name, "developer")

    def test_pm_cannot_change_privileged_user(self):
        for name in ("owner", "hr", "superadmin"):
            response = self.assign("project_manager", self.users[name], "developer")
            self.assertEqual(response.status_code, 403, name)
            self.users[name].refresh_from_db()
            self.assertEqual(self.users[name].role.name, name)

    def test_pm_can_assign_regular_roles(self):
        for role in ("designer", "marketer", "project_manager", "developer"):
            from .models import Role

            Role.objects.get_or_create(name=role)
            response = self.assign("project_manager", self.target, role)
            self.assertEqual(response.status_code, 200, (role, response.data))
            self.target.refresh_from_db()
            self.assertEqual(self.target.role.name, role)

    def test_owner_can_assign_hr_and_owner_but_not_superadmin(self):
        self.assertEqual(self.assign("owner", self.target, "hr").status_code, 200)
        self.target.refresh_from_db()
        self.assertEqual(self.target.role.name, "hr")
        self.assertEqual(self.assign("owner", self.target, "owner").status_code, 200)
        self.assertEqual(self.assign("owner", self.target, "superadmin").status_code, 403)
        self.assertEqual(
            self.assign("owner", self.users["superadmin"], "developer").status_code, 403
        )
        self.users["superadmin"].refresh_from_db()
        self.assertEqual(self.users["superadmin"].role.name, "superadmin")

    def test_superadmin_can_assign_any_role(self):
        for role in ("hr", "owner", "superadmin"):
            self.assertEqual(self.assign("superadmin", self.target, role).status_code, 200, role)

    def test_cannot_change_own_role(self):
        for name in ("superadmin", "owner", "project_manager"):
            response = self.assign(name, self.users[name], "developer")
            self.assertEqual(response.status_code, 400, name)
            self.users[name].refresh_from_db()
            self.assertEqual(self.users[name].role.name, name)

    def test_non_managers_cannot_assign(self):
        for name in ("developer", "hr", "client"):
            self.assertEqual(self.assign(name, self.target, "owner").status_code, 403, name)

    def test_invite_privileged_roles(self):
        for role in ("hr", "owner", "superadmin"):
            response = self.invite("project_manager", role, f"pm-{role}@roles.test")
            self.assertEqual(response.status_code, 400, role)
        self.assertFalse(User.objects.filter(email__startswith="pm-").exists())

        response = self.invite("owner", "hr", "owner-hr@roles.test")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(User.objects.get(email="owner-hr@roles.test").role.name, "hr")
        self.assertEqual(self.invite("owner", "superadmin", "o-sa@roles.test").status_code, 400)

        from .models import Role

        Role.objects.get_or_create(name="designer")
        response = self.invite("project_manager", "designer", "pm-designer@roles.test")
        self.assertEqual(response.status_code, 201, response.data)

    def test_user_detail_does_not_change_role(self):
        response = self.api_as("project_manager").patch(
            f"/api/v1/auth/users/{self.target.pk}/",
            {"role_id": str(self.roles["owner"].pk), "role": str(self.roles["owner"].pk)},
            format="json",
        )
        self.assertIn(response.status_code, (200, 400))
        self.target.refresh_from_db()
        self.assertEqual(self.target.role.name, "developer")
