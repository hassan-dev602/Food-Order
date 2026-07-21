from decimal import Decimal
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class FoodCategory(models.Model):
    """
    Represents a menu category such as Pizza, Burgers, Drinks, or Desserts.
    """

    name = models.CharField(max_length=100, unique=True, db_index=True)
    slug = models.SlugField(max_length=120, unique=True, db_index=True, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Food Category"
        verbose_name_plural = "Food Categories"

    def __str__(self):
        return self.name

    def clean(self):
        """
        Normalize the category name and prevent case-insensitive duplicates.

        The database unique constraint protects exact duplicates, while this
        validation also blocks names like "Pizza" and "pizza".
        """
        self.name = " ".join((self.name or "").split()).strip()

        if not self.name:
            raise ValidationError({"name": "Category name is required."})

        existing_category = FoodCategory.objects.filter(name__iexact=self.name)

        if self.pk:
            existing_category = existing_category.exclude(pk=self.pk)

        if existing_category.exists():
            raise ValidationError({"name": "Category with this name already exists."})

    def generate_unique_slug(self):
        """
        Generate a unique slug from the category name.

        A fallback UUID is used in rare cases where slugify() cannot create a
        valid slug, for example when the name contains only unsupported symbols.
        """
        base_slug = slugify(self.name) or f"category-{uuid.uuid4().hex[:8]}"
        slug_candidate = base_slug
        counter = 1

        while FoodCategory.objects.filter(slug=slug_candidate).exclude(pk=self.pk).exists():
            counter += 1
            slug_candidate = f"{base_slug}-{counter}"

        return slug_candidate

    def save(self, *args, **kwargs):
        self.full_clean()
        self.slug = self.generate_unique_slug()

        super().save(*args, **kwargs)


class FoodItem(models.Model):
    """
    Represents a food/menu item that customers can order.
    """

    SIZE_CHOICES = [
        ("small", "Small"),
        ("medium", "Medium"),
        ("large", "Large"),
    ]

    image = models.ImageField(upload_to="food_items/")
    name = models.CharField(max_length=100)
    description = models.TextField()
    category = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    size = models.CharField(max_length=10, choices=SIZE_CHOICES, default="medium")
    is_available = models.BooleanField(default=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return self.name

    def clean(self):
        """
        Keep menu item data clean before saving.

        The category is currently stored as text, not as a ForeignKey, so we
        normalize it here to avoid values like " Pizza " and "Pizza".
        """
        self.name = " ".join((self.name or "").split()).strip()
        self.category = " ".join((self.category or "").split()).strip()

        if not self.name:
            raise ValidationError({"name": "Food item name is required."})

        if not self.category:
            raise ValidationError({"category": "Food item category is required."})

        if self.price is not None and self.price < Decimal("0.00"):
            raise ValidationError({"price": "Price cannot be negative."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class FoodReview(models.Model):
    """
    Stores a customer review for a food item.

    The user field is optional so the project can support both authenticated
    reviews and guest-style reviews if required by the frontend.
    """

    food_item = models.ForeignKey(
        FoodItem,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="food_reviews",
        null=True,
        blank=True,
    )
    reviewer_name = models.CharField(max_length=100)
    rating = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.reviewer_name} - {self.food_item.name}"

    def clean(self):
        self.reviewer_name = " ".join((self.reviewer_name or "").split()).strip()
        self.comment = (self.comment or "").strip()

        if not self.reviewer_name:
            raise ValidationError({"reviewer_name": "Reviewer name is required."})

        if not self.comment:
            raise ValidationError({"comment": "Review comment is required."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class Order(models.Model):
    """
    Represents a customer's order.

    The model contains business rules for status changes, cancellation, total
    quantity, total price, and unique order number generation.
    """

    STATUS_NEW_ORDER = "New Order"
    STATUS_BEING_PREPARED = "Being Prepared"
    STATUS_FOOD_ON_THE_WAY = "Food On The Way"
    STATUS_DELIVERED = "Delivered"
    STATUS_CANCELLED = "Cancelled"

    # Old status values are kept as aliases for backward compatibility with
    # older frontend/admin values or existing database records.
    OLD_STATUS_FOOD_PREPARED = "Food Prepared"
    OLD_STATUS_FOOD_DELIVERED = "Food Delivered"

    STATUS_CHOICES = [
        (STATUS_NEW_ORDER, "New Order"),
        (STATUS_BEING_PREPARED, "Being Prepared"),
        (STATUS_FOOD_ON_THE_WAY, "Food On The Way"),
        (STATUS_DELIVERED, "Delivered"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    # Orders must move forward one step at a time.
    STATUS_FLOW = [
        STATUS_NEW_ORDER,
        STATUS_BEING_PREPARED,
        STATUS_FOOD_ON_THE_WAY,
        STATUS_DELIVERED,
    ]

    STATUS_ALIASES = {
        OLD_STATUS_FOOD_PREPARED: STATUS_BEING_PREPARED,
        OLD_STATUS_FOOD_DELIVERED: STATUS_DELIVERED,
        STATUS_FOOD_ON_THE_WAY: STATUS_FOOD_ON_THE_WAY,
    }

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="orders",
    )
    customer_name = models.CharField(max_length=150)
    customer_email = models.EmailField(blank=True)
    order_number = models.CharField(max_length=40, unique=True, db_index=True)

    delivery_address = models.TextField(blank=True)
    payment_method = models.CharField(max_length=50, default="cod")

    total_quantity = models.PositiveIntegerField(default=0)
    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default=STATUS_NEW_ORDER,
        db_index=True,
    )

    is_canceled = models.BooleanField(default=False, db_index=True)
    canceled_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_number

    @staticmethod
    def generate_order_number():
        """
        Generate a readable unique order number.

        Example:
        ORD-20260524-A1B2C3D4
        """
        date_part = timezone.now().strftime("%Y%m%d")
        unique_part = uuid.uuid4().hex[:8].upper()

        return f"ORD-{date_part}-{unique_part}"

    @classmethod
    def normalize_status(cls, status_value):
        """
        Convert old status values to the current status names.
        """
        return cls.STATUS_ALIASES.get(status_value, status_value)

    def validate_status_transition(self, new_status, current_status=None):
        """
        Validate that an order moves forward only one step at a time.

        Valid flow:
        New Order -> Being Prepared -> Food On The Way -> Delivered
        """
        current_status = self.normalize_status(current_status or self.status)
        new_status = self.normalize_status(new_status)

        if self.is_canceled:
            raise ValidationError({"status": "Cancelled orders cannot be updated further."})

        if current_status == self.STATUS_DELIVERED:
            raise ValidationError({"status": "Delivered orders cannot be updated further."})

        if new_status == self.STATUS_CANCELLED:
            raise ValidationError({"status": "Use cancel action to cancel an order."})

        if new_status not in self.STATUS_FLOW:
            raise ValidationError({"status": "Invalid order status."})

        if current_status not in self.STATUS_FLOW:
            raise ValidationError({"status": "Current order status is invalid."})

        if new_status == current_status:
            raise ValidationError({"status": "Current status cannot be selected again."})

        current_index = self.STATUS_FLOW.index(current_status)
        new_index = self.STATUS_FLOW.index(new_status)

        if new_index < current_index:
            raise ValidationError({"status": "Status cannot move backward."})

        if new_index - current_index != 1:
            raise ValidationError(
                {"status": "Status can move only one step forward at a time."}
            )

    def clean(self):
        """
        Validate order business rules before saving.
        """
        self.status = self.normalize_status(self.status)
        self.customer_name = " ".join((self.customer_name or "").split()).strip()
        self.customer_email = (self.customer_email or "").strip().lower()
        self.delivery_address = (self.delivery_address or "").strip()
        self.payment_method = (self.payment_method or "").strip()

        if not self.customer_name:
            raise ValidationError({"customer_name": "Customer name is required."})

        if self.total_price is not None and self.total_price < Decimal("0.00"):
            raise ValidationError({"total_price": "Total price cannot be negative."})

        if self.pk:
            previous_order = (
                Order.objects
                .filter(pk=self.pk)
                .only("status", "is_canceled")
                .first()
            )

            if previous_order:
                previous_status = self.normalize_status(previous_order.status)

                if previous_order.is_canceled:
                    if (
                        self.status != previous_status
                        or self.is_canceled != previous_order.is_canceled
                    ):
                        raise ValidationError(
                            "Cancelled orders cannot be updated further."
                        )

                if (
                    self.is_canceled
                    and not previous_order.is_canceled
                    and previous_status == self.STATUS_DELIVERED
                ):
                    raise ValidationError(
                        {"is_canceled": "Delivered orders cannot be cancelled."}
                    )

                if self.status != previous_status:
                    previous_state = Order(
                        status=previous_status,
                        is_canceled=previous_order.is_canceled,
                    )
                    previous_state.validate_status_transition(
                        self.status,
                        current_status=previous_status,
                    )

        if self.is_canceled and self.status == self.STATUS_DELIVERED:
            raise ValidationError(
                {"is_canceled": "Delivered orders cannot be cancelled."}
            )

    def save(self, *args, **kwargs):
        if not self.order_number:
            order_number = self.generate_order_number()

            while Order.objects.filter(order_number=order_number).exists():
                order_number = self.generate_order_number()

            self.order_number = order_number

        if self.is_canceled and self.canceled_at is None:
            self.canceled_at = timezone.now()

        if not self.is_canceled:
            self.canceled_at = None

        self.full_clean()
        super().save(*args, **kwargs)

    def cancel(self):
        """
        Cancel an order through the model's official cancellation path.

        This keeps cancellation separate from normal status updates and prevents
        delivered orders from being cancelled.
        """
        if self.is_canceled:
            raise ValidationError({"is_canceled": "Order is already cancelled."})

        if self.status == self.STATUS_DELIVERED:
            raise ValidationError({"is_canceled": "Delivered orders cannot be cancelled."})

        self.is_canceled = True
        self.canceled_at = timezone.now()

        self.save(update_fields=["is_canceled", "canceled_at", "updated_at"])


class OrderItem(models.Model):
    """
    Stores a snapshot of a food item at the time it was ordered.

    product_name, image, unit_price, and item_total are stored directly so the
    order history remains readable even if the original FoodItem changes later.
    """

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )
    food_item = models.ForeignKey(
        FoodItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items",
    )

    product_name = models.CharField(max_length=150)
    image = models.CharField(max_length=500, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    item_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.product_name} x {self.quantity}"

    def clean(self):
        self.product_name = " ".join((self.product_name or "").split()).strip()

        if not self.product_name:
            raise ValidationError({"product_name": "Product name is required."})

        if self.unit_price is not None and self.unit_price < Decimal("0.00"):
            raise ValidationError({"unit_price": "Unit price cannot be negative."})

    def calculate_item_total(self):
        """
        Calculate the total price for this order line.
        """
        return Decimal(self.unit_price) * self.quantity

    def save(self, *args, **kwargs):
        self.item_total = self.calculate_item_total()
        self.full_clean()

        super().save(*args, **kwargs)