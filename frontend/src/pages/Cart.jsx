import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RemoveIcon from "@mui/icons-material/Remove";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import { useNavigate } from "react-router-dom";

const CART_STORAGE_KEY = "cartItems";
const CART_UPDATED_EVENT = "cartUpdated";
const API_BASE_URL = "http://127.0.0.1:8000";
const PLACEHOLDER_IMAGE = "https://via.placeholder.com/160x120?text=Food+Item";

const isSameItemId = (firstId, secondId) => {
  return String(firstId) === String(secondId);
};

const formatPrice = (value) => {
  return Number(value || 0).toLocaleString();
};

const getImageUrl = (image) => {
  if (!image) return PLACEHOLDER_IMAGE;

  return image.startsWith("http") ? image : `${API_BASE_URL}${image}`;
};

const normalizeCartItem = (item = {}) => {
  return {
    id: item.id,
    image: item.image || "",
    name: item.name || "Food Item",
    category: item.category || "N/A",
    size: item.size || "standard",
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
  // This helps navbar badges or other cart listeners update without prop drilling.
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
};

const Cart = () => {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    setCartItems(getStoredCartItems());
  }, []);

  const syncCart = useCallback((updatedCart) => {
    const normalizedCart = updatedCart.map(normalizeCartItem);

    setCartItems(normalizedCart);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalizedCart));
    notifyCartUpdated();
  }, []);

  const increaseQuantity = useCallback(
    (itemId) => {
      const updatedCart = cartItems.map((item) =>
        isSameItemId(item.id, itemId)
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );

      syncCart(updatedCart);
    },
    [cartItems, syncCart]
  );

  const decreaseQuantity = useCallback(
    (itemId) => {
      const updatedCart = cartItems
        .map((item) =>
          isSameItemId(item.id, itemId)
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0);

      syncCart(updatedCart);
    },
    [cartItems, syncCart]
  );

  const removeItem = useCallback(
    (itemId) => {
      const updatedCart = cartItems.filter(
        (item) => !isSameItemId(item.id, itemId)
      );

      syncCart(updatedCart);
    },
    [cartItems, syncCart]
  );

  const clearCart = useCallback(() => {
    setCartItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
    notifyCartUpdated();
  }, []);

  const handleProceedToPayment = () => {
    navigate("/place-order");
  };

  const totalAmount = useMemo(() => {
    return cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }, [cartItems]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%)",
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: "auto", mb: 3 }}>
        <Button
          startIcon={<ArrowBackIosNewRoundedIcon />}
          onClick={() => navigate(-1)}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            borderRadius: 3,
            color: "#1f2937",
          }}
        >
          Back
        </Button>
      </Box>

      <Paper
        elevation={0}
        sx={{
          maxWidth: 1200,
          mx: "auto",
          p: { xs: 2, md: 4 },
          borderRadius: 5,
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 12px 40px rgba(15, 23, 42, 0.08)",
          border: "1px solid rgba(226,232,240,0.9)",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 900,
                color: "#0f172a",
              }}
            >
              Your Cart
            </Typography>

            <Typography sx={{ color: "#64748b", mt: 0.5 }}>
              Review your selected food items before placing the order.
            </Typography>
          </Box>

          {cartItems.length > 0 && (
            <Chip
              label={`${cartItems.length} item${cartItems.length > 1 ? "s" : ""}`}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          )}
        </Stack>

        {cartItems.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 3 }}>
            Cart is empty.
          </Alert>
        ) : (
          <>
            <Stack spacing={2.5}>
              {cartItems.map((item) => {
                const subtotal = item.price * item.quantity;

                return (
                  <Paper
                    key={item.id}
                    elevation={0}
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      borderRadius: 4,
                      border: "1px solid #e7edf4",
                      backgroundColor: "#fff",
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={2}
                      alignItems={{ xs: "stretch", sm: "center" }}
                      justifyContent="space-between"
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        alignItems={{ xs: "stretch", sm: "center" }}
                        sx={{ flex: 1 }}
                      >
                        <Box
                          component="img"
                          src={getImageUrl(item.image)}
                          alt={item.name}
                          onError={(event) => {
                            event.currentTarget.src = PLACEHOLDER_IMAGE;
                          }}
                          sx={{
                            width: { xs: "100%", sm: 120 },
                            height: { xs: 180, sm: 100 },
                            objectFit: "cover",
                            borderRadius: 3,
                            border: "1px solid #e5e7eb",
                          }}
                        />

                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontWeight: 800,
                              fontSize: "1.1rem",
                              color: "#0f172a",
                              mb: 0.75,
                            }}
                          >
                            {item.name}
                          </Typography>

                          <Stack
                            direction="row"
                            spacing={1}
                            useFlexGap
                            flexWrap="wrap"
                            sx={{ mb: 1 }}
                          >
                            <Chip
                              size="small"
                              label={`Category: ${item.category}`}
                              variant="outlined"
                            />
                            <Chip
                              size="small"
                              label={`Size: ${item.size}`}
                              variant="outlined"
                            />
                          </Stack>

                          <Typography
                            sx={{
                              fontWeight: 800,
                              color: "#1976d2",
                              fontSize: "1rem",
                            }}
                          >
                            PKR {formatPrice(item.price)}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        justifyContent={{ xs: "space-between", sm: "flex-end" }}
                        sx={{ mt: { xs: 1, sm: 0 } }}
                      >
                        <IconButton
                          aria-label={`Decrease quantity of ${item.name}`}
                          onClick={() => decreaseQuantity(item.id)}
                          sx={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 2,
                          }}
                        >
                          <RemoveIcon />
                        </IconButton>

                        <Typography
                          sx={{
                            minWidth: 32,
                            textAlign: "center",
                            fontWeight: 800,
                          }}
                        >
                          {item.quantity}
                        </Typography>

                        <IconButton
                          aria-label={`Increase quantity of ${item.name}`}
                          onClick={() => increaseQuantity(item.id)}
                          sx={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 2,
                          }}
                        >
                          <AddIcon />
                        </IconButton>

                        <IconButton
                          aria-label={`Remove ${item.name} from cart`}
                          onClick={() => removeItem(item.id)}
                          sx={{
                            border: "1px solid #fee2e2",
                            color: "#dc2626",
                            borderRadius: 2,
                            ml: 1,
                          }}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Stack>
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    <Typography
                      sx={{
                        textAlign: { xs: "left", sm: "right" },
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      Subtotal: PKR {formatPrice(subtotal)}
                    </Typography>
                  </Paper>
                );
              })}
            </Stack>

            <Paper
              elevation={0}
              sx={{
                mt: 4,
                p: { xs: 2, sm: 3 },
                borderRadius: 4,
                border: "1px solid #e7edf4",
                background: "#f8fbff",
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
              >
                <Box>
                  <Typography sx={{ color: "#64748b", mb: 0.5 }}>
                    Total Amount
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: "1.6rem", sm: "2rem" },
                      fontWeight: 900,
                      color: "#1976d2",
                    }}
                  >
                    PKR {formatPrice(totalAmount)}
                  </Typography>
                </Box>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ width: { xs: "100%", sm: "auto" } }}
                >
                  <Button
                    variant="outlined"
                    onClick={clearCart}
                    fullWidth
                    sx={{
                      borderRadius: 3,
                      px: 3,
                      py: 1.2,
                      textTransform: "none",
                      fontWeight: 700,
                    }}
                  >
                    Clear Cart
                  </Button>

                  <Button
                    variant="contained"
                    startIcon={<ShoppingCartCheckoutIcon />}
                    onClick={handleProceedToPayment}
                    fullWidth
                    sx={{
                      borderRadius: 3,
                      px: 3,
                      py: 1.2,
                      textTransform: "none",
                      fontWeight: 700,
                      boxShadow: "none",
                    }}
                  >
                    Proceed to Payment
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default Cart;