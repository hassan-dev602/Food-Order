from django.urls import path

from .views import (
    AdminLoginAPIView,
    AdminLogoutAPIView,
    AdminMeAPIView,
    AdminUsersAPIView,
    LoginAPIView,
    LogoutApiView,
    OTPVerifyAPIView,
    PasswordResetRequestAPIView,
    RegisterView,
    SetNewPasswordView,
)


urlpatterns = [
    # Public authentication endpoints.
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginAPIView.as_view(), name="login"),
    path("logout/", LogoutApiView.as_view(), name="logout"),

    # Admin authentication and dashboard endpoints.
    path("admin/login/", AdminLoginAPIView.as_view(), name="admin-login"),
    path("admin/logout/", AdminLogoutAPIView.as_view(), name="admin-logout"),
    path("admin/me/", AdminMeAPIView.as_view(), name="admin-me"),
    path("admin/users/", AdminUsersAPIView.as_view(), name="admin-users"),

    # Password reset flow:
    # 1. Request OTP
    # 2. Verify OTP
    # 3. Set new password
    path(
        "password-reset-request/",
        PasswordResetRequestAPIView.as_view(),
        name="password-reset-request",
    ),
    path("otp-verify/", OTPVerifyAPIView.as_view(), name="otp-verify"),
    path(
        "set-new-password/",
        SetNewPasswordView.as_view(),
        name="set-new-password",
    ),
]