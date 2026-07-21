from datetime import datetime, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, mixins, parsers, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import FoodItemFilter
from .models import FoodCategory, FoodItem, FoodReview, Order
from .pagination import FoodItemPagination
from .serializers import (
    AdminFoodReviewSerializer,
    AdminUserLiteSerializer,
    FoodCategorySerializer,
    FoodItemDetailSerializer,
    FoodItemSerializer,
    FoodReviewCreateSerializer,
    FoodReviewSerializer,
    OrderCreateSerializer,
    OrderSerializer,
    OrderStatusUpdateSerializer,
)


User = get_user_model()


def money(value):
    """
    Return a money value as a string with two decimal places.

    API responses often serialize Decimal values as strings, so this keeps
    report totals consistent and frontend-friendly.
    """
    value = value or Decimal("0.00")
    return str(Decimal(value).quantize(Decimal("0.01")))


def get_total_sales(queryset):
    """
    Calculate total delivered sales for a queryset of orders.
    """
    result = queryset.aggregate(
        total=Coalesce(Sum("total_price"), Decimal("0.00")),
    )
    return money(result.get("total"))


def get_date_range(target_date):
    """
    Return timezone-aware start/end datetimes for one local calendar day.
    """
    current_tz = timezone.get_current_timezone()
    start = timezone.make_aware(datetime.combine(target_date, time.min), current_tz)
    end = start + timedelta(days=1)

    return start, end


def get_month_range(year, month):
    """
    Return timezone-aware start/end datetimes for a calendar month.
    """
    current_tz = timezone.get_current_timezone()
    start = timezone.make_aware(datetime(year, month, 1), current_tz)

    if month == 12:
        end = timezone.make_aware(datetime(year + 1, 1, 1), current_tz)
    else:
        end = timezone.make_aware(datetime(year, month + 1, 1), current_tz)

    return start, end


def parse_boolean_query_param(value):
    """
    Convert common boolean query parameter values to True/False.

    Returns None for unknown values so invalid filters do not accidentally
    change the queryset.
    """
    if value is None:
        return None

    normalized_value = str(value).strip().lower()

    if normalized_value in {"true", "1", "yes"}:
        return True

    if normalized_value in {"false", "0", "no"}:
        return False

    return None


def convert_django_validation_error(error):
    """
    Convert Django model ValidationError into a DRF-friendly error detail.
    """
    return (
        getattr(error, "message_dict", None)
        or getattr(error, "messages", None)
        or str(error)
    )


def get_order_queryset():
    """
    Shared optimized order queryset for APIs that serialize orders with items.
    """
    return (
        Order.objects
        .select_related("user")
        .prefetch_related("items", "items__food_item")
        .order_by("-created_at")
    )


class FoodCategoryViewSet(viewsets.ModelViewSet):
    """
    Public/admin API for food categories.

    Public users can list and retrieve categories. Only authenticated admin
    users can create, update, or delete categories.
    """

    queryset = FoodCategory.objects.all().order_by("name")
    serializer_class = FoodCategorySerializer
    http_method_names = [
        "get",
        "post",
        "patch",
        "put",
        "delete",
        "head",
        "options",
    ]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]

        return [permissions.IsAuthenticated(), permissions.IsAdminUser()]

    def destroy(self, request, *args, **kwargs):
        category = self.get_object()

        # FoodItem.category is currently stored as text, so we compare category
        # names case-insensitively before allowing a category to be deleted.
        if FoodItem.objects.filter(category__iexact=category.name).exists():
            return Response(
                {
                    "detail": (
                        "This category is used by food items. "
                        "Delete or move those food items first."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().destroy(request, *args, **kwargs)


class FoodItemViewSet(viewsets.ModelViewSet):
    """
    Public/admin API for menu items.

    Public users can list/retrieve food items. Admin users manage menu items.
    Authenticated users can add or update their own review for a food item.
    """

    serializer_class = FoodItemSerializer

    parser_classes = [
        parsers.JSONParser,
        parsers.MultiPartParser,
        parsers.FormParser,
    ]

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
    ]
    filterset_class = FoodItemFilter
    search_fields = [
        "name",
        "category",
        "description",
    ]
    pagination_class = FoodItemPagination

    def get_queryset(self):
        """
        Annotate rating values so list APIs avoid repeated review queries.
        """
        return (
            FoodItem.objects
            .prefetch_related("reviews")
            .annotate(
                average_rating_value=Avg("reviews__rating"),
                review_count_value=Count("reviews", distinct=True),
            )
            .order_by("-id")
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return FoodItemDetailSerializer

        return FoodItemSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]

        if self.action == "add_review":
            return [permissions.IsAuthenticated()]

        return [permissions.IsAuthenticated(), permissions.IsAdminUser()]

    @action(detail=True, methods=["post"], url_path="add-review")
    def add_review(self, request, pk=None):
        food_item = self.get_object()
        serializer = FoodReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reviewer_name = (
            getattr(request.user, "full_name", "")
            or request.user.get_username()
        )

        # update_or_create keeps one review per authenticated user per food item.
        review, created = FoodReview.objects.update_or_create(
            food_item=food_item,
            user=request.user,
            defaults={
                "reviewer_name": reviewer_name,
                "rating": serializer.validated_data["rating"],
                "comment": serializer.validated_data["comment"],
            },
        )

        return Response(
            FoodReviewSerializer(review).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class OrderViewSet(viewsets.GenericViewSet):
    """
    Handles customer and admin order APIs.

    Customers can create, list, and cancel their own orders. Admin users can see
    all orders, filter them, update statuses, and view new orders.
    """

    queryset = Order.objects.all()
    http_method_names = [
        "get",
        "post",
        "patch",
        "head",
        "options",
    ]

    def get_permissions(self):
        if self.action == "track":
            return [permissions.AllowAny()]

        if self.action in ["create", "list", "cancel"]:
            return [permissions.IsAuthenticated()]

        if self.action in ["update_status", "new_orders"]:
            return [permissions.IsAuthenticated(), permissions.IsAdminUser()]

        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "create":
            return OrderCreateSerializer

        if self.action == "update_status":
            return OrderStatusUpdateSerializer

        return OrderSerializer

    def get_queryset(self):
        queryset = get_order_queryset()
        request = self.request

        if not request.user.is_authenticated:
            return queryset.none()

        if request.user.is_staff or request.user.is_superuser:
            status_param = request.query_params.get("status")
            cancelled_param = parse_boolean_query_param(
                request.query_params.get("cancelled")
            )

            if status_param:
                queryset = queryset.filter(status=status_param)

            if cancelled_param is not None:
                queryset = queryset.filter(is_canceled=cancelled_param)

            return queryset

        return queryset.filter(user=request.user)

    def list(self, request, *args, **kwargs):
        orders = self.get_queryset()
        serializer = self.get_serializer(orders, many=True)

        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()

        response_serializer = OrderSerializer(
            order,
            context=self.get_serializer_context(),
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path=r"track/(?P<order_number>[^/.]+)")
    def track(self, request, order_number=None):
        """
        Public order tracking by order number.

        This intentionally bypasses user-specific filtering because customers may
        track an order without being logged in.
        """
        order = get_order_queryset().filter(order_number=order_number).first()

        if not order:
            return Response(
                {"detail": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = OrderSerializer(order, context=self.get_serializer_context())
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="new-orders")
    def new_orders(self, request):
        orders = get_order_queryset().filter(
            status=Order.STATUS_NEW_ORDER,
            is_canceled=False,
        )

        serializer = OrderSerializer(
            orders,
            many=True,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        order = self.get_object()

        if not (request.user.is_staff or request.user.is_superuser):
            if order.user_id != request.user.id:
                raise PermissionDenied("You can cancel only your own orders.")

        try:
            order.cancel()
        except DjangoValidationError as error:
            raise ValidationError(convert_django_validation_error(error))

        serializer = OrderSerializer(order, context=self.get_serializer_context())
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["patch"], url_path="update-status")
    def update_status(self, request, pk=None):
        order = self.get_object()
        serializer = self.get_serializer(
            order,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        order = serializer.save()

        response_serializer = OrderSerializer(
            order,
            context=self.get_serializer_context(),
        )
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class AdminDashboardAPIView(APIView):
    """
    Summary metrics for the admin dashboard.
    """

    permission_classes = [
        permissions.IsAuthenticated,
        permissions.IsAdminUser,
    ]

    def get(self, request):
        now = timezone.localtime()
        today = timezone.localdate()

        today_start, today_end = get_date_range(today)

        week_start_date = today - timedelta(days=today.weekday())
        week_start, _ = get_date_range(week_start_date)

        month_start, month_end = get_month_range(now.year, now.month)

        current_tz = timezone.get_current_timezone()
        year_start = timezone.make_aware(datetime(now.year, 1, 1), current_tz)
        year_end = timezone.make_aware(datetime(now.year + 1, 1, 1), current_tz)

        delivered_orders = Order.objects.filter(
            status=Order.STATUS_DELIVERED,
            is_canceled=False,
        )

        data = {
            "total_orders": Order.objects.count(),
            "new_orders": Order.objects.filter(
                status=Order.STATUS_NEW_ORDER,
                is_canceled=False,
            ).count(),
            "being_prepared": Order.objects.filter(
                status=Order.STATUS_BEING_PREPARED,
                is_canceled=False,
            ).count(),
            "food_on_the_way": Order.objects.filter(
                status=Order.STATUS_FOOD_ON_THE_WAY,
                is_canceled=False,
            ).count(),
            "delivered": delivered_orders.count(),
            "cancelled": Order.objects.filter(is_canceled=True).count(),
            "today_sales": get_total_sales(
                delivered_orders.filter(
                    updated_at__gte=today_start,
                    updated_at__lt=today_end,
                )
            ),
            "this_week_sales": get_total_sales(
                delivered_orders.filter(
                    updated_at__gte=week_start,
                    updated_at__lt=today_end,
                )
            ),
            "this_month_sales": get_total_sales(
                delivered_orders.filter(
                    updated_at__gte=month_start,
                    updated_at__lt=month_end,
                )
            ),
            "this_year_sales": get_total_sales(
                delivered_orders.filter(
                    updated_at__gte=year_start,
                    updated_at__lt=year_end,
                )
            ),
            "total_reviews": FoodReview.objects.count(),
        }

        return Response(data, status=status.HTTP_200_OK)


class AdminDailyReportAPIView(APIView):
    """
    Admin report for one day.

    Optional query parameter:
    - ?date=YYYY-MM-DD
    """

    permission_classes = [
        permissions.IsAuthenticated,
        permissions.IsAdminUser,
    ]

    def get(self, request):
        date_param = request.query_params.get("date")

        if date_param:
            try:
                target_date = datetime.strptime(date_param, "%Y-%m-%d").date()
            except ValueError:
                return Response(
                    {"detail": "Invalid date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            target_date = timezone.localdate()

        start, end = get_date_range(target_date)

        orders = get_order_queryset().filter(
            created_at__gte=start,
            created_at__lt=end,
        )
        delivered_orders = orders.filter(
            status=Order.STATUS_DELIVERED,
            is_canceled=False,
        )

        data = {
            "date": target_date.isoformat(),
            "total_orders": orders.count(),
            "today_sales": get_total_sales(delivered_orders),
            "delivered_count": delivered_orders.count(),
            "cancelled_count": orders.filter(is_canceled=True).count(),
            "pending_or_new_count": orders.filter(
                is_canceled=False,
                status__in=[
                    Order.STATUS_NEW_ORDER,
                    Order.STATUS_BEING_PREPARED,
                    Order.STATUS_FOOD_ON_THE_WAY,
                ],
            ).count(),
            "orders": OrderSerializer(
                orders,
                many=True,
                context={"request": request},
            ).data,
        }

        return Response(data, status=status.HTTP_200_OK)


class AdminMonthlyReportAPIView(APIView):
    """
    Admin report for one month.

    Optional query parameters:
    - ?month=5
    - ?year=2026
    """

    permission_classes = [
        permissions.IsAuthenticated,
        permissions.IsAdminUser,
    ]

    def get(self, request):
        now = timezone.localtime()

        try:
            month = int(request.query_params.get("month", now.month))
            year = int(request.query_params.get("year", now.year))
        except ValueError:
            return Response(
                {"detail": "Month and year must be valid numbers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if month < 1 or month > 12:
            return Response(
                {"detail": "Month must be between 1 and 12."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        start, end = get_month_range(year, month)

        orders = get_order_queryset().filter(
            created_at__gte=start,
            created_at__lt=end,
        )
        delivered_orders = orders.filter(
            status=Order.STATUS_DELIVERED,
            is_canceled=False,
        )

        data = {
            "month": month,
            "year": year,
            "total_orders": orders.count(),
            "monthly_sales": get_total_sales(delivered_orders),
            "delivered_count": delivered_orders.count(),
            "cancelled_count": orders.filter(is_canceled=True).count(),
            "pending_or_new_count": orders.filter(
                is_canceled=False,
                status__in=[
                    Order.STATUS_NEW_ORDER,
                    Order.STATUS_BEING_PREPARED,
                    Order.STATUS_FOOD_ON_THE_WAY,
                ],
            ).count(),
            "orders": OrderSerializer(
                orders,
                many=True,
                context={"request": request},
            ).data,
        }

        return Response(data, status=status.HTTP_200_OK)


class AdminSearchAPIView(APIView):
    """
    Searches key admin resources from one endpoint.

    Query parameter:
    - ?q=value
    """

    permission_classes = [
        permissions.IsAuthenticated,
        permissions.IsAdminUser,
    ]

    def get(self, request):
        query = (request.query_params.get("q") or "").strip()

        if not query:
            return Response(
                {
                    "orders": [],
                    "food_items": [],
                    "users": [],
                },
                status=status.HTTP_200_OK,
            )

        orders = get_order_queryset().filter(
            Q(order_number__icontains=query)
            | Q(customer_name__icontains=query)
            | Q(customer_email__icontains=query)
        )[:20]

        food_items = (
            FoodItem.objects
            .prefetch_related("reviews")
            .annotate(
                average_rating_value=Avg("reviews__rating"),
                review_count_value=Count("reviews", distinct=True),
            )
            .filter(
                Q(name__icontains=query)
                | Q(category__icontains=query)
            )
            .order_by("-id")[:20]
        )

        users = User.objects.filter(
            Q(username__icontains=query)
            | Q(email__icontains=query)
            | Q(first_name__icontains=query)
            | Q(last_name__icontains=query)
        ).order_by("-date_joined")[:20]

        return Response(
            {
                "orders": OrderSerializer(
                    orders,
                    many=True,
                    context={"request": request},
                ).data,
                "food_items": FoodItemSerializer(
                    food_items,
                    many=True,
                    context={"request": request},
                ).data,
                "users": AdminUserLiteSerializer(users, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class AdminReviewViewSet(
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    Admin endpoint for listing and deleting customer reviews.
    """

    queryset = (
        FoodReview.objects
        .select_related("food_item", "user")
        .order_by("-created_at")
    )
    serializer_class = AdminFoodReviewSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        permissions.IsAdminUser,
    ]
    http_method_names = [
        "get",
        "delete",
        "head",
        "options",
    ]