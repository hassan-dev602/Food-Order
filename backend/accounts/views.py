from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.generics import GenericAPIView, ListAPIView
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PasswordResetRequest
from .serializers import (
    AdminLoginSerializer,
    AdminMeSerializer,
    AdminUserSerializer,
    LoginSerializer,
    LogoutUserSerializer,
    OTPVerifySerializer,
    PasswordResetRequestSerializer,
    SetNewPasswordSerializer,
    UserRegisterSerializer,
)


User = get_user_model()


class RegisterView(GenericAPIView):
    """
    Public endpoint for creating a new user account.
    """

    serializer_class = UserRegisterSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "data": serializer.data,
                "message": "Thanks for signing up.",
            },
            status=status.HTTP_201_CREATED,
        )


class LoginAPIView(APIView):
    """
    Public login endpoint for regular users.

    The serializer handles whether the login value is an email address or phone
    number, so the view can stay small and focused on HTTP response handling.
    """

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class AdminLoginAPIView(APIView):
    """
    Public login endpoint for staff/admin users.

    Admin login is kept separate from normal user login because it requires
    additional permission checks in the serializer.
    """

    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        return Response(
            {"detail": "Admin login endpoint is active. Use POST to login."},
            status=status.HTTP_200_OK,
        )

    def post(self, request, *args, **kwargs):
        serializer = AdminLoginSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class LogoutApiView(GenericAPIView):
    """
    Logs out a regular authenticated user by blacklisting the refresh token.
    """

    serializer_class = LogoutUserSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"detail": "Logout successful"},
            status=status.HTTP_200_OK,
        )


class AdminLogoutAPIView(GenericAPIView):
    """
    Logs out an authenticated admin user by blacklisting the refresh token.
    """

    serializer_class = LogoutUserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"detail": "Admin logout successful"},
            status=status.HTTP_200_OK,
        )


class AdminMeAPIView(APIView):
    """
    Returns profile information for the currently authenticated admin user.
    """

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, *args, **kwargs):
        serializer = AdminMeSerializer(request.user)

        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminUsersAPIView(ListAPIView):
    """
    Lists users for the admin dashboard.

    Optional query parameter:
    - ?q=value searches username, email, first name, and last name.
    """

    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        queryset = User.objects.all().order_by("-date_joined")
        search_query = (self.request.query_params.get("q") or "").strip()

        if search_query:
            queryset = queryset.filter(
                Q(username__icontains=search_query)
                | Q(email__icontains=search_query)
                | Q(first_name__icontains=search_query)
                | Q(last_name__icontains=search_query)
            )

        return queryset


class PasswordResetRequestAPIView(GenericAPIView):
    """
    Starts the password reset flow by sending an OTP.

    The response is intentionally generic so attackers cannot easily check
    whether an email address is registered.
    """

    serializer_class = PasswordResetRequestSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "detail": (
                    "If an account with this email exists, "
                    "an OTP has been sent."
                )
            },
            status=status.HTTP_200_OK,
        )


class OTPVerifyAPIView(GenericAPIView):
    """
    Verifies the OTP sent during the password reset flow.
    """

    serializer_class = OTPVerifySerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"detail": "OTP verified successfully"},
            status=status.HTTP_200_OK,
        )


class SetNewPasswordView(APIView):
    """
    Sets a new password after OTP verification.

    Important:
    This view includes a minimal server-side safety check to ensure the user has
    a recently verified password reset request. A stronger production approach
    would use a short-lived password reset token after OTP verification.
    """

    permission_classes = [AllowAny]
    reset_verification_window = timedelta(minutes=10)

    def post(self, request, *args, **kwargs):
        email = (request.data.get("email") or "").strip().lower()

        if not email:
            return Response(
                {"email": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email__iexact=email, is_active=True)
        except User.DoesNotExist:
            # Keep this generic so the endpoint does not reveal registered emails.
            return Response(
                {"detail": "Invalid or expired password reset request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        verified_reset_exists = PasswordResetRequest.objects.filter(
            user=user,
            is_used=True,
            created_at__gte=timezone.now() - self.reset_verification_window,
        ).exists()

        if not verified_reset_exists:
            return Response(
                {"detail": "Invalid or expired password reset request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SetNewPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=user)

        return Response(
            {"message": "Password reset successfully"},
            status=status.HTTP_200_OK,
        )