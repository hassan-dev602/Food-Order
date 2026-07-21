from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from phonenumber_field.modelfields import PhoneNumberField
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model for the application.

    This model uses email as the main login field, while also storing a unique
    username and phone number. The custom UserManager is responsible for creating
    normal users and superusers correctly.
    """

    id = models.BigAutoField(primary_key=True, editable=False)

    username = models.CharField(
        _("Username"),
        max_length=150,
        unique=True,
        db_index=True,
        null=True,
        blank=True,
    )
    email = models.EmailField(
        _("Email Address"),
        max_length=255,
        unique=True,
        db_index=True,
        null=True,
        blank=True,
    )
    phone_number = PhoneNumberField(
        _("Phone Number"),
        unique=True,
        db_index=True,
        null=True,
        blank=True,
    )

    first_name = models.CharField(_("First Name"), max_length=100)
    last_name = models.CharField(_("Last Name"), max_length=100)

    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    # Django authentication will treat email as the primary login identifier.
    USERNAME_FIELD = "email"
    EMAIL_FIELD = "email"

    # These fields are requested when creating a superuser through createsuperuser.
    REQUIRED_FIELDS = ["username", "first_name", "last_name", "phone_number"]

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")
        ordering = ("-date_joined",)

    def __str__(self):
        """
        Return the most useful public identifier for admin pages and logs.
        """
        return self.email or self.username or str(self.phone_number)

    @property
    def full_name(self):
        """
        Return the user's full name in a display-friendly format.
        """
        return f"{self.first_name.title()} {self.last_name.title()}".strip()

    def tokens(self):
        """
        Generate JWT refresh and access tokens for the user.

        Keeping this logic on the model makes token generation reusable in
        serializers or login views without repeating Simple JWT code.
        """
        refresh = RefreshToken.for_user(self)

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }


class PasswordResetRequest(models.Model):
    """
    Stores a password reset OTP request for a user.

    Security note:
    In a production system, OTP values should ideally be hashed before storing
    them in the database, similar to how passwords are stored.
    """

    OTP_EXPIRY_MINUTES = 10

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="password_resets",
    )
    otp = models.IntegerField()
    created_at = models.DateTimeField(default=timezone.now)
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        """
        Avoid exposing the OTP value in admin pages, logs, or debug output.
        """
        user_identifier = self.user.email or self.user.username or str(self.user.phone_number)
        return f"{user_identifier} - Password reset request"

    @property
    def expires_at(self):
        """
        Return the exact time when this OTP should expire.
        """
        return self.created_at + timedelta(minutes=self.OTP_EXPIRY_MINUTES)

    @property
    def is_expired(self):
        """
        Check whether the OTP is older than the allowed expiry window.
        """
        return timezone.now() > self.expires_at

    def mark_as_used(self):
        """
        Mark this OTP as used after a successful password reset.

        update_fields keeps the database update small and avoids saving
        unchanged model fields.
        """
        self.is_used = True
        self.save(update_fields=["is_used"])