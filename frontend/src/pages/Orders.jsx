import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

const API_BASE_URL = "http://127.0.0.1:8000";
const ORDER_API_URL = `${API_BASE_URL}/api/v1/orders/`;
const PLACEHOLDER_IMAGE = "https://via.placeholder.com/120x90?text=Food+Item";

const TOKEN_STORAGE_KEYS = [
  "access_token",
  "access",
  "accessToken",
  "token",
];

const normalizeToken = (rawToken) => {
  if (!rawToken) return "";

  let token = String(rawToken).trim();

  try {
    const parsedToken = JSON.parse(token);

    if (typeof parsedToken === "string") {
      token = parsedToken.trim();
    }
  } catch (error) {
    // Token is already a plain string, so JSON parsing is not required.
  }

  // Store/send only the raw JWT token. The Authorization header adds "Bearer".
  return token.replace(/^Bearer\s+/i, "").trim();
};

const getStoredAccessToken = () => {
  const rawToken = TOKEN_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(
    Boolean
  );

  return normalizeToken(rawToken);
};

const getImageUrl = (image) => {
  if (!image) return PLACEHOLDER_IMAGE;

  return image.startsWith("http") ? image : `${API_BASE_URL}${image}`;
};

const formatPrice = (value) => {
  return `PKR ${Number(value || 0).toLocaleString()}`;
};

const formatDate = (value) => {
  if (!value) return "N/A";

  return new Date(value).toLocaleString();
};

const getStatusColor = (order) => {
  if (order.is_canceled) return "error";

  if (
    order.status === "Delivered" ||
    order.status === "Food Delivered"
  ) {
    return "success";
  }

  if (order.status === "Food On The Way") {
    return "info";
  }

  return "warning";
};

const extractErrorMessage = (payload) => {
  if (!payload) return "Something went wrong. Please try again.";
  if (typeof payload === "string") return payload;
  if (typeof payload.detail === "string") return payload.detail;

  const firstKey = Object.keys(payload)[0];

  if (!firstKey) {
    return "Something went wrong. Please try again.";
  }

  const firstValue = payload[firstKey];

  if (Array.isArray(firstValue) && firstValue.length > 0) {
    return String(firstValue[0]);
  }

  if (typeof firstValue === "string") {
    return firstValue;
  }

  return "Something went wrong. Please try again.";
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState(null);
  const [error, setError] = useState("");

  const token = useMemo(() => getStoredAccessToken(), []);

  const loadOrders = useCallback(
    async (signal) => {
      if (!token) {
        setError("Please log in to view your orders.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(ORDER_API_URL, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal,
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(extractErrorMessage(data));
        }

        setOrders(Array.isArray(data) ? data : []);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(requestError.message || "Unable to load orders.");
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [token]
  );

  useEffect(() => {
    const controller = new AbortController();

    loadOrders(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadOrders]);

  const handleCancelOrder = async (orderId) => {
    if (!token || cancelingId) return;

    setCancelingId(orderId);
    setError("");

    try {
      const response = await fetch(`${ORDER_API_URL}${orderId}/cancel/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(extractErrorMessage(data));
      }

      // The backend returns the updated order, so replace only that order locally.
      setOrders((previousOrders) =>
        previousOrders.map((order) => (order.id === orderId ? data : order))
      );
    } catch (requestError) {
      setError(requestError.message || "Unable to cancel order.");
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Box sx={{ maxWidth: 1100, mx: "auto" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
              My Orders
            </Typography>

            <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
              View your order history, delivery progress, and cancellation status.
            </Typography>
          </Box>

          {!loading && orders.length > 0 && (
            <Chip
              label={`${orders.length} order${orders.length > 1 ? "s" : ""}`}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          )}
        </Stack>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2, borderRadius: 2 }}
            action={
              token ? (
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => loadOrders()}
                >
                  Retry
                </Button>
              ) : null
            }
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <Box
            sx={{
              minHeight: 260,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <CircularProgress />
          </Box>
        ) : orders.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            No orders found.
          </Alert>
        ) : (
          <Stack spacing={3}>
            {orders.map((order) => (
              <Paper
                key={order.id}
                elevation={0}
                sx={{
                  p: { xs: 2, sm: 3 },
                  borderRadius: 3,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
                }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                  spacing={2}
                  sx={{ mb: 2 }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: "1.1rem" }}>
                      Order #{order.order_number}
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{ color: "#64748b", mt: 0.5 }}
                    >
                      Placed on: {formatDate(order.created_at)}
                    </Typography>
                  </Box>

                  <Chip
                    label={order.display_status || order.status}
                    color={getStatusColor(order)}
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>

                {order.is_canceled && (
                  <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                    This order was canceled
                    {order.canceled_at ? ` on ${formatDate(order.canceled_at)}` : ""}.
                  </Alert>
                )}

                <Stack spacing={2}>
                  {(order.items || []).map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        justifyContent: "space-between",
                        gap: 2,
                        alignItems: { xs: "stretch", sm: "center" },
                      }}
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        alignItems={{ xs: "stretch", sm: "center" }}
                        sx={{ minWidth: 0 }}
                      >
                        <Box
                          component="img"
                          src={getImageUrl(item.image)}
                          alt={item.product_name}
                          onError={(event) => {
                            event.currentTarget.src = PLACEHOLDER_IMAGE;
                          }}
                          sx={{
                            width: { xs: "100%", sm: 90 },
                            height: { xs: 150, sm: 70 },
                            objectFit: "cover",
                            borderRadius: 2,
                            border: "1px solid #e5e7eb",
                          }}
                        />

                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700 }}>
                            {item.product_name}
                          </Typography>

                          <Typography variant="body2" sx={{ color: "#64748b" }}>
                            Qty: {item.quantity}
                          </Typography>

                          <Typography variant="body2" sx={{ color: "#64748b" }}>
                            Unit Price: {formatPrice(item.unit_price)}
                          </Typography>
                        </Box>
                      </Stack>

                      <Typography
                        sx={{
                          fontWeight: 800,
                          textAlign: { xs: "left", sm: "right" },
                          color: "#0f172a",
                        }}
                      >
                        {formatPrice(item.item_total)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "stretch", md: "center" }}
                  spacing={2}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>
                      Total Quantity: {order.total_quantity}
                    </Typography>

                    <Typography sx={{ fontWeight: 800, color: "#1976d2" }}>
                      Total Price: {formatPrice(order.total_price)}
                    </Typography>
                  </Box>

                  {order.can_cancel && (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={cancelingId === order.id}
                      sx={{
                        borderRadius: 2,
                        fontWeight: 700,
                        textTransform: "none",
                        width: { xs: "100%", md: "auto" },
                      }}
                    >
                      {cancelingId === order.id ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        "Cancel Order"
                      )}
                    </Button>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default Orders;