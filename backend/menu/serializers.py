from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Avg
from rest_framework import serializers

from .models import FoodCategory, FoodItem, FoodReview, Order, OrderItem


User = get_user_model()


class FoodCategorySerializer(serializers.ModelSerializer):
    """
    Serializer for creating, updating, and displaying food categories.
    """

    class Meta:
        model = FoodCategory
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "slug",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        name = " ".join((value or "").split()).strip()

        if not name:
            raise serializers.ValidationError("Category name is required.")

        queryset = FoodCategory.objects.filter(name__iexact=name)

        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError("Category with this name already exists.")

        return name


class FoodReviewSerializer(serializers.ModelSerializer):
    """
    Public serializer for food item reviews.
    """

    class Meta:
        model = FoodReview
        fields = [
            "id",
            "reviewer_name",
            "rating",
            "comment",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
        ]


class AdminFoodReviewSerializer(serializers.ModelSerializer):
    """
    Admin serializer for reviews with lightweight food item information.
    """

    food_item = serializers.SerializerMethodField()

    class Meta:
        model = FoodReview
        fields = [
            "id",
            "food_item",
            "reviewer_name",
            "rating",
            "comment",
            "created_at",
        ]

    def get_food_item(self, obj):
        if not obj.food_item:
            return None

        return {
            "id": obj.food_item.id,
            "name": obj.food_item.name,
        }


class FoodReviewCreateSerializer(serializers.Serializer):
    """
    Serializer used when a customer submits a review for a food item.
    """

    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField()

    def validate_comment(self, value):
        comment = (value or "").strip()

        if not comment:
            raise serializers.ValidationError("Review comment is required.")

        return comment


class FoodItemSerializer(serializers.ModelSerializer):
    """
    Public serializer for menu items.

    average_rating and review_count are calculated fields. For best performance,
    views can annotate these values or prefetch reviews before serialization.
    """

    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = FoodItem
        fields = [
            "id",
            "image",
            "name",
            "description",
            "category",
            "price",
            "size",
            "is_available",
            "average_rating",
            "review_count",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")

        if instance.image:
            image_url = instance.image.url
            data["image"] = request.build_absolute_uri(image_url) if request else image_url
        else:
            data["image"] = ""

        return data

    def validate_name(self, value):
        name = " ".join((value or "").split()).strip()

        if not name:
            raise serializers.ValidationError("Food item name is required.")

        return name

    def validate_category(self, value):
        category = " ".join((value or "").split()).strip()

        if not category:
            raise serializers.ValidationError("Category is required.")

        return category

    def validate_price(self, value):
        if value <= Decimal("0.00"):
            raise serializers.ValidationError("Price must be greater than 0.")

        return value

    def _get_prefetched_reviews(self, obj):
        """
        Return prefetched reviews when available.

        This helps avoid unnecessary database queries when the view uses
        prefetch_related("reviews").
        """
        prefetched_cache = getattr(obj, "_prefetched_objects_cache", {})

        return prefetched_cache.get("reviews")

    def get_average_rating(self, obj):
        annotated_average = getattr(obj, "average_rating_value", None)

        if annotated_average is not None:
            return round(float(annotated_average), 1)

        prefetched_reviews = self._get_prefetched_reviews(obj)

        if prefetched_reviews is not None:
            if not prefetched_reviews:
                return 0

            total_rating = sum(review.rating for review in prefetched_reviews)
            return round(total_rating / len(prefetched_reviews), 1)

        average = obj.reviews.aggregate(value=Avg("rating"))["value"]

        if average is None:
            return 0

        return round(float(average), 1)

    def get_review_count(self, obj):
        annotated_count = getattr(obj, "review_count_value", None)

        if annotated_count is not None:
            return annotated_count

        prefetched_reviews = self._get_prefetched_reviews(obj)

        if prefetched_reviews is not None:
            return len(prefetched_reviews)

        return obj.reviews.count()


class FoodItemDetailSerializer(FoodItemSerializer):
    """
    Detailed food item serializer with reviews and current user's review data.
    """

    reviews = FoodReviewSerializer(many=True, read_only=True)
    current_user_name = serializers.SerializerMethodField()
    current_user_review = serializers.SerializerMethodField()

    class Meta(FoodItemSerializer.Meta):
        fields = FoodItemSerializer.Meta.fields + [
            "reviews",
            "current_user_name",
            "current_user_review",
        ]

    def get_current_user_name(self, obj):
        request = self.context.get("request")

        if request and request.user.is_authenticated:
            return getattr(request.user, "full_name", "") or request.user.get_username()

        return ""

    def get_current_user_review(self, obj):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return None

        review = obj.reviews.filter(user=request.user).first()

        if not review:
            return None

        return {
            "id": review.id,
            "rating": review.rating,
            "comment": review.comment,
        }


class OrderItemSerializer(serializers.ModelSerializer):
    """
    Serializer for order item snapshots.
    """

    product_id = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product_id",
            "product_name",
            "image",
            "unit_price",
            "quantity",
            "item_total",
        ]

    def get_product_id(self, obj):
        return obj.food_item_id


class OrderSerializer(serializers.ModelSerializer):
    """
    Serializer for displaying customer orders with nested order items.
    """

    items = OrderItemSerializer(many=True, read_only=True)
    display_status = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "customer_name",
            "customer_email",
            "delivery_address",
            "payment_method",
            "items",
            "total_quantity",
            "total_price",
            "status",
            "display_status",
            "is_canceled",
            "canceled_at",
            "can_cancel",
            "created_at",
            "updated_at",
        ]

    def get_display_status(self, obj):
        return "Cancelled" if obj.is_canceled else obj.status

    def get_can_cancel(self, obj):
        return not obj.is_canceled and obj.status != Order.STATUS_DELIVERED


class OrderCreateItemSerializer(serializers.Serializer):
    """
    Validates one item from the frontend cart.

    If product_id is provided and valid, the backend uses the FoodItem price/name
    from the database. If product_id is missing, name and unit_price are required
    so the order can still store a snapshot of the item.
    """

    product_id = serializers.IntegerField(required=False, allow_null=True)
    name = serializers.CharField(required=False, allow_blank=True)
    image = serializers.CharField(required=False, allow_blank=True)
    unit_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
    )
    quantity = serializers.IntegerField(min_value=1)

    def validate(self, attrs):
        product_id = attrs.get("product_id")
        name = " ".join((attrs.get("name") or "").split()).strip()
        image = (attrs.get("image") or "").strip()
        unit_price = attrs.get("unit_price")

        if not product_id and not name:
            raise serializers.ValidationError(
                "Each item must include either product_id or name."
            )

        if not product_id and unit_price is None:
            raise serializers.ValidationError(
                "Each item must include unit_price when product_id is missing."
            )

        if unit_price is not None and unit_price <= Decimal("0.00"):
            raise serializers.ValidationError(
                {"unit_price": "Unit price must be greater than 0."}
            )

        attrs["name"] = name
        attrs["image"] = image

        return attrs


class OrderCreateSerializer(serializers.Serializer):
    """
    Creates an order with nested order items.

    The transaction ensures that either the full order is created successfully,
    or nothing is saved if one item is invalid.
    """

    delivery_address = serializers.CharField(required=False, allow_blank=True)
    payment_method = serializers.CharField(required=False, allow_blank=True, default="cod")
    items = OrderCreateItemSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Cart is empty.")

        return value

    def _get_authenticated_user(self):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Authentication is required to place an order.")

        return user

    @transaction.atomic
    def create(self, validated_data):
        user = self._get_authenticated_user()
        items_data = validated_data["items"]

        customer_name = getattr(user, "full_name", "") or user.get_username() or "Customer"
        customer_email = getattr(user, "email", "") or ""

        payment_method = (validated_data.get("payment_method") or "cod").strip() or "cod"
        delivery_address = (validated_data.get("delivery_address") or "").strip()

        order = Order.objects.create(
            user=user,
            customer_name=customer_name,
            customer_email=customer_email,
            delivery_address=delivery_address,
            payment_method=payment_method,
            total_quantity=0,
            total_price=Decimal("0.00"),
            status=Order.STATUS_NEW_ORDER,
            is_canceled=False,
        )

        total_quantity = 0
        total_price = Decimal("0.00")

        for item in items_data:
            product_id = item.get("product_id")
            quantity = item["quantity"]

            food_item = None
            product_name = item.get("name", "")
            image = item.get("image", "")
            unit_price = item.get("unit_price")

            if product_id:
                food_item = FoodItem.objects.filter(pk=product_id).first()

                if food_item:
                    # Server-side product data is trusted more than frontend cart data.
                    product_name = food_item.name
                    image = food_item.image.url if food_item.image else image
                    unit_price = Decimal(food_item.price)

            if not product_name:
                raise serializers.ValidationError(
                    {"items": ["One or more items have no valid product name."]}
                )

            if unit_price is None:
                raise serializers.ValidationError(
                    {"items": [f'Unit price is missing for "{product_name}".']}
                )

            if unit_price <= Decimal("0.00"):
                raise serializers.ValidationError(
                    {"items": [f'Unit price must be greater than 0 for "{product_name}".']}
                )

            order_item = OrderItem.objects.create(
                order=order,
                food_item=food_item,
                product_name=product_name,
                image=image,
                unit_price=Decimal(unit_price),
                quantity=quantity,
            )

            total_quantity += quantity
            total_price += order_item.item_total

        order.total_quantity = total_quantity
        order.total_price = total_price
        order.save(update_fields=["total_quantity", "total_price", "updated_at"])

        return order


class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for admin/staff order status updates.
    """

    class Meta:
        model = Order
        fields = ["status"]

    def validate_status(self, value):
        order = self.instance
        order.validate_status_transition(value)

        return value

    def update(self, instance, validated_data):
        instance.status = validated_data["status"]
        instance.save(update_fields=["status", "updated_at"])

        return instance


class AdminUserLiteSerializer(serializers.ModelSerializer):
    """
    Lightweight user serializer for admin-facing order/customer screens.
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