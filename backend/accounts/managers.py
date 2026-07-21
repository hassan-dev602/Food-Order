from django.contrib.auth.models import BaseUserManager
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    """
    Custom manager for the User model.

    This manager centralizes user creation rules so users created from the API,
    Django admin, shell, or createsuperuser command follow the same validation
    and password-handling behavior.
    """

    def _create_user(
        self,
        email,
        phone_number,
        first_name,
        last_name,
        password=None,
        username=None,
        **extra_fields,
    ):
        """
        Create and save a user with an email or phone number.

        This private method is reused by create_user() and create_superuser()
        to keep user creation rules consistent.
        """
        if not email and not phone_number:
            raise ValueError(_("User must have at least an email or a phone number."))

        if not first_name:
            raise ValueError(_("First name is required."))

        if not last_name:
            raise ValueError(_("Last name is required."))

        email = self.normalize_email(email).strip() if email else None
        phone_number = str(phone_number).strip() if phone_number else None
        first_name = str(first_name).strip()
        last_name = str(last_name).strip()
        username = str(username).strip().lower() if username else None

        user = self.model(
            email=email,
            username=username,
            phone_number=phone_number,
            first_name=first_name,
            last_name=last_name,
            **extra_fields,
        )

        # Always use Django's password helpers so passwords are hashed safely.
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        try:
            # Runs model-level validation before saving the user.
            user.full_clean()
        except ValidationError as error:
            raise ValueError(error.message_dict) from error

        user.save(using=self._db)
        return user

    def create_user(
        self,
        email=None,
        phone_number=None,
        first_name=None,
        last_name=None,
        password=None,
        username=None,
        **extra_fields,
    ):
        """
        Create a regular user.

        Regular users should not have staff or superuser permissions by default.
        """
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("is_active", True)

        return self._create_user(
            email=email,
            phone_number=phone_number,
            first_name=first_name,
            last_name=last_name,
            password=password,
            username=username,
            **extra_fields,
        )

    def create_superuser(
        self,
        email,
        phone_number=None,
        first_name=None,
        last_name=None,
        username=None,
        password=None,
        **extra_fields,
    ):
        """
        Create a superuser for Django admin access.

        Superusers must always have staff and superuser permissions enabled.
        """
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if not username:
            raise ValueError(_("Superuser must have a username."))

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))

        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))

        return self._create_user(
            email=email,
            phone_number=phone_number,
            first_name=first_name,
            last_name=last_name,
            password=password,
            username=username,
            **extra_fields,
        )

    def authenticate_by_login(self, login, password):
        """
        Authenticate a user with either email or phone number.

        This helper is useful when the frontend has a single "login" field
        instead of separate email and phone number fields.
        """
        if not login or not password:
            return None

        login = str(login).strip()

        try:
            if "@" in login:
                user = self.get(email__iexact=self.normalize_email(login))
            else:
                user = self.get(phone_number=str(login).strip())
        except self.model.DoesNotExist:
            return None

        # Inactive accounts should not be allowed to authenticate.
        if not user.is_active:
            return None

        if user.check_password(password):
            return user

        return None