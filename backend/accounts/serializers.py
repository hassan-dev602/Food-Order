from datetime import timedelta
import secrets

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from django.utils import timezone
from phonenumber_field.serializerfields import PhoneNumberField
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from .models import PasswordResetRequest


User = get_user_model()


class UserRegisterSerializer(serializers.ModelSerializer):
    """
    Handles public user registration.

    The serializer keeps password confirmation write-only and returns only the
    fields defined by the API view/response layer.
    """

    phone_number = PhoneNumberField(required=True)

    password = serializers.CharField(
        min_length=6,
        write_only=True,
        trim_whitespace=False,
    )
    password2 = serializers.CharField(
        min_length=6,
        write_only=True,
        trim_whitespace=False,
    )

    class Meta:
        model = User
        fields = [
            "email",
            "phone_number",
            "first_name",
            "last_name",
            "password",
            "password2",
        ]
        extra_kwargs = {
            "email": {"required": True},
            "first_name": {"required": True},
            "last_name": {"required": True},
        }

    def validate_email(self, value):
        email = (value or "").strip().lower()

        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")

        return email

    def validate_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")

        return value

    def validate_first_name(self, value):
        first_name = (value or "").strip()

        if not first_name:
            raise serializers.ValidationError("First name is required.")

        return first_name

    def validate_last_name(self, value):
        last_name = (value or "").strip()

        if not last_name:
            raise serializers.ValidationError("Last name is required.")

        return last_name

    def validate(self, attrs):
        password = attrs.get("password")
        password2 = attrs.get("password2")

        if password != password2:
            raise serializers.ValidationError({"password2": "Passwords do not match."})

        # Uses Django's configured password validators from AUTH_PASSWORD_VALIDATORS.
        validate_password(password)

        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")

        return User.objects.create_user(
            email=validated_data["email"],
            phone_number=validated_data["phone_number"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            password=password,
        )


class LoginSerializer(serializers.Serializer):
    """
    Authenticates a regular user with one login field.

    The login value can be an email address or a phone number, depending on the
    custom UserManager.authenticate_by_login() implementation.
    """

    login = serializers.CharField(
        max_length=255,
        write_only=True,
        help_text="Email or Phone Number",
    )
    password = serializers.CharField(
        max_length=128,
        write_only=True,
        trim_whitespace=False,
    )

    full_name = serializers.CharField(max_length=255, read_only=True)
    access_token = serializers.CharField(max_length=255, read_only=True)
    refresh_token = serializers.CharField(max_length=255, read_only=True)

    def validate(self, attrs):
        login = (attrs.get("login") or "").strip()
        password = attrs.get("password")

        user = User.objects.authenticate_by_login(login, password)

        if not user:
            raise AuthenticationFailed("Invalid credentials, try again.")

        tokens = user.tokens()

        return {
            "login": login,
            "full_name": user.full_name,
            "access_token": str(tokens.get("access")),
            "refresh_token": str(tokens.get("refresh")),
        }


class AdminLoginSerializer(serializers.Serializer):
    """
    Authenticates staff/admin users.

    This serializer is intentionally separate from normal login because admin
    access requires additional permission checks.
    """

    username = serializers.CharField(max_length=150, write_only=True)
    password = serializers.CharField(
        max_length=128,
        write_only=True,
        trim_whitespace=False,
    )

    username_output = serializers.CharField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    access_token = serializers.CharField(read_only=True)
    refresh_token = serializers.CharField(read_only=True)

    def validate_username(self, value):
        return (value or "").strip().lower()

    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise AuthenticationFailed("Invalid admin credentials.")

        if not user.is_active:
            raise AuthenticationFailed("Admin account is disabled.")

        if not (user.is_staff or user.is_superuser):
            raise AuthenticationFailed("You are not authorized to access the admin panel.")

        if not user.check_password(password):
            raise AuthenticationFailed("Invalid admin credentials.")

        tokens = user.tokens()

        return {
            "username": user.username,
            "full_name": user.full_name,
            "access_token": str(tokens.get("access")),
            "refresh_token": str(tokens.get("refresh")),
        }


class AdminMeSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for the currently authenticated admin user.
    """

    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "full_name",
            "is_staff",
            "is_superuser",
        ]


class AdminUserSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing users in the admin dashboard.
    """

    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "username",
            "email",
            "date_joined",
            "is_active",
            "is_staff",
        ]


class LogoutUserSerializer(serializers.Serializer):
    """
    Blacklists a refresh token during logout.

    This requires Simple JWT's token blacklist app to be installed and migrated.
    """

    refresh_token = serializers.CharField(write_only=True)

    default_error_messages = {
        "bad_token": "Token is expired or invalid.",
    }

    def validate(self, attrs):
        self.refresh_token = attrs.get("refresh_token")
        return attrs

    def save(self, **kwargs):
        try:
            token = RefreshToken(self.refresh_token)
            token.blacklist()
        except TokenError:
            self.fail("bad_token")


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Starts the password reset flow.

    For security, this serializer does not reveal whether the email exists.
    The API view should return the same success-style message either way.
    """

    email = serializers.EmailField()

    def validate_email(self, value):
        return (value or "").strip().lower()

    def save(self):
        email = self.validated_data["email"]
        user = User.objects.filter(email__iexact=email, is_active=True).first()

        # Do not reveal whether the email exists. If no user is found, simply
        # return None and let the view send a generic response.
        if not user:
            return None

        otp = secrets.randbelow(900000) + 100000

        reset_entry = PasswordResetRequest.objects.create(
            user=user,
            otp=otp,
        )

        send_mail(
            subject="Password Reset OTP",
            message=f"Your OTP for password reset is: {otp}",
            from_email=None,
            recipient_list=[email],
            fail_silently=False,
        )

        return reset_entry


class OTPVerifySerializer(serializers.Serializer):
    """
    Verifies the latest unused OTP for a user's password reset request.
    """

    OTP_EXPIRY_MINUTES = 10

    email = serializers.EmailField()
    otp = serializers.IntegerField()

    def validate(self, attrs):
        email = (attrs.get("email") or "").strip().lower()
        otp = attrs.get("otp")

        try:
            user = User.objects.get(email__iexact=email, is_active=True)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid or expired OTP.")

        try:
            reset_entry = (
                PasswordResetRequest.objects
                .filter(user=user, is_used=False)
                .latest("created_at")
            )
        except PasswordResetRequest.DoesNotExist:
            raise serializers.ValidationError("Invalid or expired OTP.")

        expires_at = reset_entry.created_at + timedelta(minutes=self.OTP_EXPIRY_MINUTES)

        if timezone.now() > expires_at:
            raise serializers.ValidationError("Invalid or expired OTP.")

        if reset_entry.otp != otp:
            raise serializers.ValidationError("Invalid or expired OTP.")

        attrs["user"] = user
        attrs["reset_entry"] = reset_entry

        return attrs

    def save(self):
        reset_entry = self.validated_data["reset_entry"]
        reset_entry.is_used = True
        reset_entry.save(update_fields=["is_used"])

        return reset_entry


class SetNewPasswordSerializer(serializers.Serializer):
    """
    Sets a new password after OTP verification.
    """

    new_password = serializers.CharField(
        min_length=6,
        write_only=True,
        trim_whitespace=False,
    )
    confirm_password = serializers.CharField(
        min_length=6,
        write_only=True,
        trim_whitespace=False,
    )

    def validate(self, attrs):
        new_password = attrs.get("new_password")
        confirm_password = attrs.get("confirm_password")

        if new_password != confirm_password:
            raise serializers.ValidationError(
                {"confirm_password": "New password and confirm password do not match."}
            )

        # Reuse Django's password validation rules for stronger passwords.
        validate_password(new_password)

        return attrs

    def save(self, user):
        new_password = self.validated_data["new_password"]

        user.set_password(new_password)
        user.save(update_fields=["password"])

        return user