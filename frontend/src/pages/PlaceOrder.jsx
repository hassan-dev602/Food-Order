import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const API_BASE_URL = "http://127.0.0.1:8000";
const ORDER_API_URL = `${API_BASE_URL}/api/v1/orders/`;
const CART_STORAGE_KEY = "cartItems";
const CART_UPDATED_EVENT = "cartUpdated";
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

const normalizeCartItem = (item = {}) => {
  return {
    id: item.id,
    image: item.image || "",
    name: item.name || "Food Item",
    price: Number(item.price || 0),
    quantity: Math.max(Number(item.quantity || 1), 1),
  };
};

const getStoredCartItems = () => {
  try {
    const storedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));

    if (!Array.isArray(storedCart)) {
      return [];
    }

    return storedCart.map(normalizeCartItem);
  } catch (error) {
    return [];
  }
};

const notifyCartUpdated = () => {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
};

const extractErrorMessage = (payload) => {
  if (!payload) return "Unable to place order. Please try again.";

  if (typeof payload === "string") return payload;
  if (typeof payload.detail === "string") return payload.detail;

  const firstKey = Object.keys(payload)[0];

  if (!firstKey) {
    return "Unable to place order. Please check your input and try again.";
  }

  const firstValue = payload[firstKey];

  if (Array.isArray(firstValue) && firstValue.length > 0) {
    return String(firstValue[0]);
  }

  if (typeof firstValue === "string") {
    return firstValue;
  }

  return "Unable to place order. Please check your input and try again.";
};

const PlaceOrder = () => {
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [cartItems, setCartItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successOrder, setSuccessOrder] = useState(null);

  useEffect(() => {
    setCartItems(getStoredCartItems());
  }, []);

  const totalQuantity = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const totalAmount = useMemo(() => {
    return cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }, [cartItems]);

  const validateOrder = () => {
    if (!getStoredAccessToken()) {
      return "Please log in first to place an order.";
    }

    if (!cartItems.length) {
      return "Your cart is empty.";
    }

    if (!deliveryAddress.trim()) {
      return "Please enter your full delivery address.";
    }

    return null;
  };

  const buildOrderPayload = () => {
    return {
      delivery_address: deliveryAddress.trim(),
      payment_method: paymentMethod,
      items: cartItems.map((item) => ({
        product_id: item.id || null,
        name: item.name || "",
        image: item.image || "",
        unit_price: Number(item.price || 0).toFixed(2),
        quantity: Number(item.quantity || 0),
      })),
    };
  };

  const clearCartAfterOrder = () => {
    localStorage.removeItem(CART_STORAGE_KEY);
    setCartItems([]);
    notifyCartUpdated();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    setError("");
    setSuccessOrder(null);

    const validationError = validateOrder();

    if (validationError) {
      setError(validationError);
      return;
    }

    const token = getStoredAccessToken();

    setSubmitting(true);

    try {
      const response = await fetch(ORDER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildOrderPayload()),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(extractErrorMessage(data));
      }

      clearCartAfterOrder();
      setDeliveryAddress("");
      setPaymentMethod("cod");
      setSuccessOrder(data);
    } catch (requestError) {
      setError(requestError.message || "Unable to place order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Paper
        component="form"
        onSubmit={handleSubmit}
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 1000,
          mx: "auto",
          p: { xs: 2, sm: 3, md: 4 },
          borderRadius: 4,
          border: "1px solid #e5e7eb",
          boxShadow: "0 12px 40px rgba(15, 23, 42, 0.08)",
          backgroundColor: "#fff",
        }}
      >
        <Stack spacing={3}>
          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 800,
                fontSize: { xs: "1.8rem", sm: "2.125rem" },
              }}
            >
              Checkout & Payment
            </Typography>

            <Typography
              sx={{
                color: "text.secondary",
                mt: 1,
                maxWidth: 560,
                mx: "auto",
              }}
            >
              Review your cart, enter your delivery address, and confirm your
              order.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {successOrder && (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              Order placed successfully. Your order number is{" "}
              <strong>{successOrder.order_number}</strong>.
            </Alert>
          )}

          {!cartItems.length ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Your cart is empty. Add items before placing an order.
            </Alert>
          ) : (
            <>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, sm: 3 },
                  borderRadius: 3,
                  border: "1px solid #e5e7eb",
                  backgroundColor: "#fafafa",
                }}
              >
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 800 }}>
                  Order Summary
                </Typography>

                <Stack spacing={2}>
                  {cartItems.map((item) => {
                    const itemTotal = item.price * item.quantity;

                    return (
                      <Box
                        key={item.id}
                        sx={{
                          display: "flex",
                          flexDirection: { xs: "column", sm: "row" },
                          gap: 2,
                          alignItems: { xs: "stretch", sm: "center" },
                          justifyContent: "space-between",
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
                            alt={item.name}
                            onError={(event) => {
                              event.currentTarget.src = PLACEHOLDER_IMAGE;
                            }}
                            sx={{
                              width: { xs: "100%", sm: 90 },
                              height: { xs: 160, sm: 70 },
                              objectFit: "cover",
                              borderRadius: 2,
                              border: "1px solid #e5e7eb",
                            }}
                          />

                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700 }}>
                              {item.name}
                            </Typography>

                            <Typography variant="body2" sx={{ color: "#64748b" }}>
                              Qty: {item.quantity}
                            </Typography>

                            <Typography variant="body2" sx={{ color: "#64748b" }}>
                              Unit Price: {formatPrice(item.price)}
                            </Typography>
                          </Box>
                        </Stack>

                        <Typography
                          sx={{
                            fontWeight: 800,
                            textAlign: { xs: "left", sm: "right" },
                          }}
                        >
                          {formatPrice(itemTotal)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Typography sx={{ fontWeight: 700 }}>
                    Total Quantity: {totalQuantity}
                  </Typography>

                  <Typography sx={{ fontWeight: 800, color: "#1976d2" }}>
                    Total Amount: {formatPrice(totalAmount)}
                  </Typography>
                </Stack>
              </Paper>

              <TextField
                label="Full Delivery Address"
                placeholder="House number, street, area, city..."
                fullWidth
                required
                multiline
                rows={4}
                value={deliveryAddress}
                onChange={(event) => setDeliveryAddress(event.target.value)}
                disabled={submitting}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                  },
                }}
              />

              <FormControl>
                <FormLabel sx={{ fontWeight: 700, mb: 1 }}>
                  Payment Method
                </FormLabel>

                <RadioGroup
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                >
                  <FormControlLabel
                    value="cod"
                    control={<Radio disabled={submitting} />}
                    label="Cash on Delivery"
                  />
                </RadioGroup>
              </FormControl>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={submitting || !cartItems.length}
                sx={{
                  py: 1.4,
                  borderRadius: 3,
                  fontWeight: 800,
                  textTransform: "none",
                  boxShadow: "none",
                  "&:hover": {
                    backgroundColor: "#ff9800",
                    boxShadow: "none",
                  },
                }}
              >
                {submitting ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Confirm & Place Order"
                )}
              </Button>
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};

export default PlaceOrder;