from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminDashboardAPIView,
    AdminDailyReportAPIView,
    AdminMonthlyReportAPIView,
    AdminReviewViewSet,
    AdminSearchAPIView,
    FoodCategoryViewSet,
    FoodItemViewSet,
    OrderViewSet,
)


router = DefaultRouter()

# Public/admin menu routes.
# Public users can usually list/retrieve menu data, while write actions are
# protected inside the related viewsets.
router.register(
    r"food-categories",
    FoodCategoryViewSet,
    basename="food-categories",
)
router.register(
    r"food-items",
    FoodItemViewSet,
    basename="food-items",
)

# Customer/admin order routes.
# Extra actions such as order tracking, cancellation, and status updates are
# defined inside OrderViewSet.
router.register(
    r"orders",
    OrderViewSet,
    basename="orders",
)

# Admin review management routes.
router.register(
    r"admin/reviews",
    AdminReviewViewSet,
    basename="admin-reviews",
)


urlpatterns = [
    path("", include(router.urls)),

    # Admin dashboard and reporting endpoints.
    path(
        "admin/dashboard/",
        AdminDashboardAPIView.as_view(),
        name="admin-dashboard",
    ),
    path(
        "admin/reports/daily/",
        AdminDailyReportAPIView.as_view(),
        name="admin-daily-report",
    ),
    path(
        "admin/reports/monthly/",
        AdminMonthlyReportAPIView.as_view(),
        name="admin-monthly-report",
    ),
    path(
        "admin/search/",
        AdminSearchAPIView.as_view(),
        name="admin-search",
    ),
]