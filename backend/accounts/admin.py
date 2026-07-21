from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    """
    Admin configuration for the custom User model.

    This keeps Django's built-in password handling, permissions UI, groups,
    and user creation form behavior while customizing the fields used by
    this project's custom user model.
    """

    ordering = ("-date_joined",)

    list_display = (
        "username",
        "email",
        "phone_number",
        "first_name",
        "last_name",
        "is_active",
        "is_staff",
    )
    list_display_links = ("username", "email")

    search_fields = (
        "username",
        "email",
        "phone_number",
        "first_name",
        "last_name",
    )
    list_filter = (
        "is_active",
        "is_staff",
        "groups",
    )

    # Helpful for admin users when reviewing recent signups.
    date_hierarchy = "date_joined"
    list_per_page = 25

    readonly_fields = (
        "last_login",
        "date_joined",
    )

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "email",
                    "username",
                    "password",
                ),
            },
        ),
        (
            _("Personal info"),
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "phone_number",
                ),
            },
        ),
        (
            _("Permissions"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        (
            _("Important dates"),
            {
                "fields": (
                    "last_login",
                    "date_joined",
                ),
            },
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                # These fields should stay aligned with the custom User model
                # and UserManager.create_user / create_superuser requirements.
                "fields": (
                    "email",
                    "username",
                    "phone_number",
                    "first_name",
                    "last_name",
                    "password1",
                    "password2",
                ),
            },
        ),
    )

    filter_horizontal = (
        "groups",
        "user_permissions",
    )