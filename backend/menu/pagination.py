from rest_framework.pagination import PageNumberPagination


class FoodItemPagination(PageNumberPagination):
    """
    Pagination class for food item listing APIs.

    Default behavior:
    - ?page=2 moves to the second page.
    - ?page_size=10 lets the frontend request a custom page size.
    - max_page_size prevents very large responses from being requested.
    """

    page_size = 6
    page_query_param = "page"
    page_size_query_param = "page_size"
    max_page_size = 20