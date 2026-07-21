import django_filters
from django.core.exceptions import ValidationError

from .models import FoodItem


class FoodItemFilter(django_filters.FilterSet):
    """
    Filters food items for menu/listing APIs.

    Supported query parameters:
    - ?min_price=100
    - ?max_price=1000
    - ?category=Pizza
    - ?size=medium
    - ?is_available=true
    """

    min_price = django_filters.NumberFilter(
        field_name="price",
        lookup_expr="gte",
        label="Minimum price",
    )
    max_price = django_filters.NumberFilter(
        field_name="price",
        lookup_expr="lte",
        label="Maximum price",
    )
    category = django_filters.CharFilter(
        method="filter_category",
        label="Category",
    )
    size = django_filters.CharFilter(
        method="filter_size",
        label="Size",
    )
    is_available = django_filters.BooleanFilter(
        field_name="is_available",
        label="Availability",
    )

    class Meta:
        model = FoodItem
        fields = [
            "category",
            "size",
            "is_available",
            "min_price",
            "max_price",
        ]

    def filter_category(self, queryset, name, value):
        """
        Filter category case-insensitively after trimming whitespace.

        This keeps values like " Pizza " and "pizza" working the same way.
        """
        category = (value or "").strip()

        if not category:
            return queryset

        return queryset.filter(category__iexact=category)

    def filter_size(self, queryset, name, value):
        """
        Filter size case-insensitively after trimming whitespace.
        """
        size = (value or "").strip()

        if not size:
            return queryset

        return queryset.filter(size__iexact=size)

    @property
    def qs(self):
        """
        Validate price range filters before returning the filtered queryset.
        """
        queryset = super().qs

        if not self.form.is_valid():
            return queryset

        min_price = self.form.cleaned_data.get("min_price")
        max_price = self.form.cleaned_data.get("max_price")

        if min_price is not None and min_price < 0:
            raise ValidationError({"min_price": "Minimum price cannot be negative."})

        if max_price is not None and max_price < 0:
            raise ValidationError({"max_price": "Maximum price cannot be negative."})

        if min_price is not None and max_price is not None and min_price > max_price:
            raise ValidationError(
                {"max_price": "Maximum price must be greater than or equal to minimum price."}
            )

        return queryset