from django.contrib import admin

from .models import FoodCategory, FoodItem, FoodReview, Order, OrderItem


@admin.register(FoodCategory)
class FoodCategoryAdmin(admin.ModelAdmin):
    """
    Admin configuration for food menu categories.
    """

    list_display = [
        "id",
        "name",
        "slug",
        "is_active",
        "created_at",
        "updated_at",
    ]
    list_filter = [
        "is_active",
        "created_at",
    ]
    search_fields = [
        "name",
        "slug",
        "description",
    ]
    readonly_fields = [
        "slug",
        "created_at",
        "updated_at",
    ]

    date_hierarchy = "created_at"
    list_per_page = 25


@admin.register(FoodItem)
class FoodItemAdmin(admin.ModelAdmin):
    """
    Admin configuration for food/menu items.
    """

    list_display = [
        "id",
        "name",
        "category",
        "price",
        "size",
        "is_available",
    ]
    list_filter = [
        "category",
        "size",
        "is_available",
    ]
    search_fields = [
        "name",
        "category",
        "description",
    ]

    list_per_page = 25


@admin.register(FoodReview)
class FoodReviewAdmin(admin.ModelAdmin):
    """
    Admin configuration for customer food reviews.
    """

    list_display = [
        "id",
        "reviewer_name",
        "food_item",
        "rating",
        "created_at",
    ]
    list_filter = [
        "rating",
        "created_at",
    ]
    search_fields = [
        "reviewer_name",
        "food_item__name",
        "comment",
    ]
    readonly_fields = [
        "created_at",
    ]

    # Avoid extra queries when showing related food items in the review list.
    list_select_related = [
        "food_item",
        "user",
    ]

    date_hierarchy = "created_at"
    list_per_page = 25


class OrderItemInline(admin.TabularInline):
    """
    Displays order items inside the order admin detail page.

    Order items are shown as read-only because they represent the purchased
    item snapshot at the time the order was placed.
    """

    model = OrderItem
    extra = 0
    can_delete = False

    readonly_fields = [
        "food_item",
        "product_name",
        "image",
        "unit_price",
        "quantity",
        "item_total",
    ]

    def has_add_permission(self, request, obj=None):
        """
        Prevent manually adding order items from the admin order detail page.

        Order items should normally be created through the checkout/order
        creation flow so totals and item snapshots remain consistent.
        """
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    """
    Admin configuration for customer orders.

    Most order fields are read-only to protect checkout data. Admin users can
    still update the order status according to the model's validation rules.
    """

    list_display = [
        "id",
        "order_number",
        "customer_name",
        "customer_email",
        "total_quantity",
        "total_price",
        "status",
        "is_canceled",
        "created_at",
    ]
    list_filter = [
        "status",
        "is_canceled",
        "created_at",
    ]
    search_fields = [
        "order_number",
        "customer_name",
        "customer_email",
        "user__username",
        "user__email",
    ]
    readonly_fields = [
        "order_number",
        "user",
        "customer_name",
        "customer_email",
        "delivery_address",
        "payment_method",
        "total_quantity",
        "total_price",
        "is_canceled",
        "canceled_at",
        "created_at",
        "updated_at",
    ]

    # The list page may access the related user during search/detail usage.
    list_select_related = [
        "user",
    ]

    date_hierarchy = "created_at"
    list_per_page = 25

    inlines = [
        OrderItemInline,
    ]

    fieldsets = (
        (
            "Customer",
            {
                "fields": (
                    "order_number",
                    "user",
                    "customer_name",
                    "customer_email",
                ),
            },
        ),
        (
            "Delivery",
            {
                "fields": (
                    "delivery_address",
                    "payment_method",
                ),
            },
        ),
        (
            "Order Summary",
            {
                "fields": (
                    "total_quantity",
                    "total_price",
                    "status",
                    "is_canceled",
                    "canceled_at",
                ),
            },
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )