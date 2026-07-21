import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";

import { useTheme } from "@mui/material/styles";

import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

const API_BASE_URL = "http://127.0.0.1:8000";
const TRACK_BASE_URL = `${API_BASE_URL}/api/v1/orders/track/`;

const PLACEHOLDER_IMAGE =
  "https://via.placeholder.com/400x300/F8FAFC/64748B?text=Food+Item";

const ORDER_STATUS_STEPS = [
  {
    status: "New Order",
    label: "Order Received",
  },
  {
    status: "Being Prepared",
    label: "Being Prepared",
  },
  {
    status: "Food On The Way",
    label: "Food On The Way",
  },
  {
    status: "Delivered",
    label: "Delivered",
  },
];

const STATUS_ALIASES = {
  "new order": "New Order",
  "order received": "New Order",
  pending: "New Order",

  "being prepared": "Being Prepared",
  "food prepared": "Being Prepared",
  preparing: "Being Prepared",

  "food on the way": "Food On The Way",
  "on the way": "Food On The Way",
  dispatched: "Food On The Way",

  delivered: "Delivered",
  "food delivered": "Delivered",
};

const normalizeOrderStatus = (status) => {
  const originalStatus = String(status || "").trim();

  if (!originalStatus) {
    return "";
  }

  return (
    STATUS_ALIASES[originalStatus.toLowerCase()] ||
    ORDER_STATUS_STEPS.find(
      (step) => step.status.toLowerCase() === originalStatus.toLowerCase()
    )?.status ||
    originalStatus
  );
};

const getImageUrl = (image) => {
  if (!image) {
    return PLACEHOLDER_IMAGE;
  }

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:")
  ) {
    return image;
  }

  const normalizedImagePath = image.startsWith("/") ? image : `/${image}`;

  return `${API_BASE_URL}${normalizedImagePath}`;
};

const formatPrice = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "PKR 0";
  }

  return `PKR ${numericValue.toLocaleString("en-PK", {
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const extractErrorMessage = (payload, statusCode) => {
  if (statusCode === 404) {
    return "No order was found for this tracking number.";
  }

  if (statusCode >= 500) {
    return "The server is currently unavailable. Please try again.";
  }

  if (!payload) {
    return "Unable to track your order right now.";
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (typeof payload.detail === "string") {
    return payload.detail;
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  if (Array.isArray(payload.non_field_errors)) {
    return payload.non_field_errors[0];
  }

  const firstKey = Object.keys(payload)[0];

  if (!firstKey) {
    return "Unable to track your order right now.";
  }

  const firstValue = payload[firstKey];

  if (Array.isArray(firstValue) && firstValue.length > 0) {
    return String(firstValue[0]);
  }

  if (typeof firstValue === "string") {
    return firstValue;
  }

  return "Unable to track your order right now.";
};

const getStatusColor = (order) => {
  if (!order) {
    return "default";
  }

  if (order.is_canceled) {
    return "error";
  }

  const status = normalizeOrderStatus(order.status);

  if (status === "Delivered") {
    return "success";
  }

  if (status === "Food On The Way") {
    return "info";
  }

  if (status === "Being Prepared") {
    return "warning";
  }

  if (status === "New Order") {
    return "primary";
  }

  return "default";
};

const getActiveStep = (order) => {
  if (!order || order.is_canceled) {
    return -1;
  }

  const normalizedStatus = normalizeOrderStatus(order.status);

  return ORDER_STATUS_STEPS.findIndex(
    (step) => step.status === normalizedStatus
  );
};

const Track = () => {
  const theme = useTheme();

  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const abortControllerRef = useRef(null);
  const resultSectionRef = useRef(null);

  const [trackingNumber, setTrackingNumber] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const items = useMemo(() => {
    return Array.isArray(order?.items) ? order.items : [];
  }, [order]);

  const activeStep = useMemo(() => {
    return getActiveStep(order);
  }, [order]);

  const displayStatus = useMemo(() => {
    if (!order) {
      return "";
    }

    if (order.is_canceled) {
      return "Cancelled";
    }

    return (
      order.display_status ||
      normalizeOrderStatus(order.status) ||
      "Status unavailable"
    );
  }, [order]);

  const totalQuantity = useMemo(() => {
    if (!order) {
      return 0;
    }

    if (order.total_quantity !== undefined) {
      return order.total_quantity;
    }

    return items.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );
  }, [order, items]);

  const totalPrice = useMemo(() => {
    if (!order) {
      return 0;
    }

    if (order.total_price !== undefined) {
      return order.total_price;
    }

    return items.reduce(
      (total, item) => total + Number(item.item_total || 0),
      0
    );
  }, [order, items]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (order && resultSectionRef.current) {
      resultSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [order]);

  const handleTrackingNumberChange = (event) => {
    setTrackingNumber(event.target.value);

    if (error) {
      setError("");
    }
  };

  const handleTrackOrder = useCallback(
    async (event) => {
      event.preventDefault();

      const trimmedTrackingNumber = trackingNumber.trim();

      setError("");
      setOrder(null);

      if (!trimmedTrackingNumber) {
        setError("Please enter your order number.");
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();

      abortControllerRef.current = controller;
      setLoading(true);

      try {
        const response = await fetch(
          `${TRACK_BASE_URL}${encodeURIComponent(trimmedTrackingNumber)}/`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          }
        );

        const contentType = response.headers.get("content-type");

        let data = null;

        if (contentType?.includes("application/json")) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        if (!response.ok) {
          throw new Error(extractErrorMessage(data, response.status));
        }

        if (!data || typeof data !== "object") {
          throw new Error("The server returned an invalid order response.");
        }

        setOrder(data);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(
            requestError.message ||
              "Unable to track your order. Please try again."
          );
        }
      } finally {
        /*
         * This prevents an older cancelled request from changing
         * the loading state of a newer request.
         */
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setLoading(false);
        }
      }
    },
    [trackingNumber]
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",

        px: {
          xs: 1.5,
          sm: 3,
          md: 4,
        },

        py: {
          xs: 3,
          sm: 4,
          md: 6,
        },

        background:
          "linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 48%, #FFF1F2 100%)",

        "&::before": {
          content: '""',
          position: "absolute",
          width: 460,
          height: 460,
          top: -220,
          right: -160,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(249,115,22,0.18), rgba(249,115,22,0) 70%)",
        },

        "&::after": {
          content: '""',
          position: "absolute",
          width: 440,
          height: 440,
          bottom: -230,
          left: -170,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(239,68,68,0.12), rgba(239,68,68,0) 70%)",
        },
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 1180,
          mx: "auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Page heading */}
        <Stack
          direction={{
            xs: "column",
            sm: "row",
          }}
          spacing={2}
          alignItems={{
            xs: "flex-start",
            sm: "center",
          }}
          sx={{
            mb: {
              xs: 3,
              md: 4,
            },
          }}
        >
          <Box
            sx={{
              width: 62,
              height: 62,
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              borderRadius: "18px",
              color: "#FFFFFF",
              background:
                "linear-gradient(135deg, #F97316 0%, #DC2626 100%)",
              boxShadow: "0 14px 30px rgba(234,88,12,0.26)",
            }}
          >
            <LocalShippingRoundedIcon sx={{ fontSize: 32 }} />
          </Box>

          <Box>
            <Typography
              component="h1"
              sx={{
                color: "#0F172A",
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: "-0.04em",

                fontSize: {
                  xs: "1.9rem",
                  sm: "2.35rem",
                  md: "2.7rem",
                },
              }}
            >
              Track your order
            </Typography>

            <Typography
              sx={{
                mt: 0.8,
                color: "#64748B",
                lineHeight: 1.65,

                fontSize: {
                  xs: "0.9rem",
                  sm: "0.98rem",
                },
              }}
            >
              Enter your tracking number to view the latest delivery progress.
            </Typography>
          </Box>
        </Stack>

        {/* Search card */}
        <Paper
          elevation={0}
          sx={{
            mb: 3,

            p: {
              xs: 2,
              sm: 3,
              md: 4,
            },

            overflow: "hidden",
            borderRadius: {
              xs: "20px",
              sm: "26px",
            },

            border: "1px solid rgba(226,232,240,0.9)",
            backgroundColor: "rgba(255,255,255,0.96)",

            boxShadow:
              "0 22px 60px rgba(15,23,42,0.10), 0 5px 18px rgba(15,23,42,0.05)",
          }}
        >
          <Box component="form" onSubmit={handleTrackOrder} noValidate>
            <Stack
              direction={{
                xs: "column",
                md: "row",
              }}
              spacing={2}
              alignItems="stretch"
            >
              <TextField
                fullWidth
                required
                disabled={loading}
                label="Order or Tracking Number"
                placeholder="For example: ORD-20260327-AB12CD34"
                value={trackingNumber}
                onChange={handleTrackingNumberChange}
                autoComplete="off"
                error={Boolean(error && !trackingNumber.trim())}
                inputProps={{
                  "aria-label": "Order tracking number",
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ReceiptLongRoundedIcon
                        sx={{
                          color: "#64748B",
                        }}
                      />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  minWidth: 0,

                  "& .MuiOutlinedInput-root": {
                    minHeight: 58,
                    borderRadius: "14px",
                    backgroundColor: "#F8FAFC",
                    transition: "all 0.25s ease",

                    "& fieldset": {
                      borderColor: "#E2E8F0",
                    },

                    "&:hover fieldset": {
                      borderColor: "#94A3B8",
                    },

                    "&.Mui-focused": {
                      backgroundColor: "#FFFFFF",
                      boxShadow: "0 0 0 4px rgba(234,88,12,0.10)",
                    },

                    "&.Mui-focused fieldset": {
                      borderColor: "#EA580C",
                    },
                  },

                  "& .MuiInputLabel-root.Mui-focused": {
                    color: "#EA580C",
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={
                  loading ? null : <SearchRoundedIcon fontSize="small" />
                }
                sx={{
                  minHeight: 58,

                  minWidth: {
                    xs: "100%",
                    md: 190,
                  },

                  px: 3,
                  flexShrink: 0,
                  borderRadius: "14px",
                  fontWeight: 800,
                  fontSize: "0.96rem",
                  textTransform: "none",

                  background:
                    "linear-gradient(135deg, #F97316 0%, #DC2626 100%)",

                  boxShadow: "0 12px 24px rgba(234,88,12,0.24)",
                  transition: "all 0.25s ease",

                  "&:hover": {
                    transform: "translateY(-2px)",

                    background:
                      "linear-gradient(135deg, #EA580C 0%, #B91C1C 100%)",

                    boxShadow: "0 16px 30px rgba(234,88,12,0.32)",
                  },

                  "&.Mui-disabled": {
                    color: "rgba(255,255,255,0.85)",

                    background:
                      "linear-gradient(135deg, #FDBA74 0%, #FCA5A5 100%)",
                  },
                }}
              >
                {loading ? (
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <CircularProgress
                      size={20}
                      thickness={5}
                      color="inherit"
                    />

                    <span>Tracking...</span>
                  </Stack>
                ) : (
                  "Track Order"
                )}
              </Button>
            </Stack>
          </Box>
        </Paper>

        {error && (
          <Alert
            severity="error"
            onClose={() => setError("")}
            sx={{
              mb: 3,
              borderRadius: "14px",
              border: "1px solid rgba(239,68,68,0.18)",
            }}
          >
            {error}
          </Alert>
        )}

        {loading && (
          <Paper
            elevation={0}
            sx={{
              p: {
                xs: 4,
                sm: 6,
              },

              borderRadius: "22px",
              border: "1px solid #E2E8F0",
              backgroundColor: "rgba(255,255,255,0.92)",
            }}
          >
            <Stack spacing={2} alignItems="center">
              <CircularProgress
                size={38}
                sx={{
                  color: "#EA580C",
                }}
              />

              <Typography
                sx={{
                  color: "#64748B",
                  fontWeight: 600,
                }}
              >
                Finding your order details...
              </Typography>
            </Stack>
          </Paper>
        )}

        {order && !loading && (
          <Stack
            ref={resultSectionRef}
            spacing={3}
            sx={{
              scrollMarginTop: 24,
            }}
          >
            {/* Order summary */}
            <Paper
              elevation={0}
              sx={{
                position: "relative",
                overflow: "hidden",

                p: {
                  xs: 2.5,
                  sm: 3,
                  md: 4,
                },

                borderRadius: {
                  xs: "20px",
                  sm: "26px",
                },

                border: "1px solid rgba(226,232,240,0.9)",
                backgroundColor: "#FFFFFF",

                boxShadow:
                  "0 18px 50px rgba(15,23,42,0.08), 0 4px 14px rgba(15,23,42,0.04)",

                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: 5,

                  background: order.is_canceled
                    ? "linear-gradient(90deg, #DC2626, #F87171)"
                    : "linear-gradient(90deg, #F97316, #DC2626)",
                },
              }}
            >
              <Stack
                direction={{
                  xs: "column",
                  sm: "row",
                }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{
                  xs: "flex-start",
                  sm: "center",
                }}
              >
                <Stack direction="row" spacing={1.8} alignItems="center">
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: "14px",
                      color: "#EA580C",
                      backgroundColor: "#FFF7ED",
                    }}
                  >
                    <ReceiptLongRoundedIcon />
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        color: "#64748B",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Order number
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.35,
                        color: "#0F172A",
                        fontWeight: 900,
                        wordBreak: "break-word",

                        fontSize: {
                          xs: "1.05rem",
                          sm: "1.2rem",
                        },
                      }}
                    >
                      #{order.order_number || trackingNumber}
                    </Typography>
                  </Box>
                </Stack>

                <Chip
                  label={displayStatus}
                  color={getStatusColor(order)}
                  icon={
                    order.is_canceled ? undefined : (
                      <CheckCircleRoundedIcon />
                    )
                  }
                  sx={{
                    minHeight: 36,
                    px: 0.5,
                    borderRadius: "10px",
                    fontWeight: 800,
                  }}
                />
              </Stack>

              <Divider
                sx={{
                  my: 3,
                  borderColor: "#E2E8F0",
                }}
              />

              <Box
                sx={{
                  display: "grid",

                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(3, minmax(0, 1fr))",
                  },

                  gap: {
                    xs: 2,
                    sm: 3,
                  },
                }}
              >
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <AccessTimeRoundedIcon
                    sx={{
                      color: "#64748B",
                      fontSize: 22,
                    }}
                  />

                  <Box>
                    <Typography
                      sx={{
                        color: "#64748B",
                        fontSize: "0.76rem",
                        fontWeight: 700,
                      }}
                    >
                      Placed on
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.2,
                        color: "#0F172A",
                        fontWeight: 700,
                        fontSize: "0.88rem",
                      }}
                    >
                      {formatDate(order.created_at)}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1.2} alignItems="center">
                  <Inventory2RoundedIcon
                    sx={{
                      color: "#64748B",
                      fontSize: 22,
                    }}
                  />

                  <Box>
                    <Typography
                      sx={{
                        color: "#64748B",
                        fontSize: "0.76rem",
                        fontWeight: 700,
                      }}
                    >
                      Total quantity
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.2,
                        color: "#0F172A",
                        fontWeight: 800,
                        fontSize: "0.9rem",
                      }}
                    >
                      {totalQuantity}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1.2} alignItems="center">
                  <RestaurantRoundedIcon
                    sx={{
                      color: "#64748B",
                      fontSize: 22,
                    }}
                  />

                  <Box>
                    <Typography
                      sx={{
                        color: "#64748B",
                        fontSize: "0.76rem",
                        fontWeight: 700,
                      }}
                    >
                      Order total
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.2,
                        color: "#EA580C",
                        fontWeight: 900,
                        fontSize: "0.95rem",
                      }}
                    >
                      {formatPrice(totalPrice)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Paper>

            {order.is_canceled && (
              <Alert
                severity="warning"
                sx={{
                  borderRadius: "14px",
                  border: "1px solid rgba(245,158,11,0.22)",
                }}
              >
                This order was cancelled
                {order.canceled_at
                  ? ` on ${formatDate(order.canceled_at)}`
                  : ""}
                .
              </Alert>
            )}

            {/* Delivery progress */}
            <Paper
              elevation={0}
              sx={{
                p: {
                  xs: 2.5,
                  sm: 3,
                  md: 4,
                },

                borderRadius: {
                  xs: "20px",
                  sm: "26px",
                },

                border: "1px solid #E2E8F0",
                backgroundColor: "#FFFFFF",
              }}
            >
              <Stack direction="row" spacing={1.3} alignItems="center" mb={3.5}>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "12px",
                    color: "#EA580C",
                    backgroundColor: "#FFF7ED",
                  }}
                >
                  <LocalShippingRoundedIcon fontSize="small" />
                </Box>

                <Box>
                  <Typography
                    sx={{
                      color: "#0F172A",
                      fontWeight: 900,
                      fontSize: "1.1rem",
                    }}
                  >
                    Delivery progress
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.2,
                      color: "#64748B",
                      fontSize: "0.82rem",
                    }}
                  >
                    Follow your order through every stage.
                  </Typography>
                </Box>
              </Stack>

              <Stepper
                activeStep={activeStep}
                alternativeLabel={!isSmallScreen}
                orientation={isSmallScreen ? "vertical" : "horizontal"}
                sx={{
                  "& .MuiStepLabel-label": {
                    fontWeight: 700,
                    fontSize: "0.82rem",
                  },

                  "& .MuiStepIcon-root.Mui-active": {
                    color: "#EA580C",
                  },

                  "& .MuiStepIcon-root.Mui-completed": {
                    color: "#16A34A",
                  },

                  "& .MuiStepConnector-line": {
                    borderColor: "#CBD5E1",
                  },
                }}
              >
                {ORDER_STATUS_STEPS.map((step) => (
                  <Step key={step.status}>
                    <StepLabel>{step.label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              {activeStep === -1 && !order.is_canceled && (
                <Alert
                  severity="info"
                  sx={{
                    mt: 3,
                    borderRadius: "12px",
                  }}
                >
                  Current status: {displayStatus}
                </Alert>
              )}

              {order.is_canceled && (
                <Typography
                  sx={{
                    mt: 3,
                    color: "#64748B",
                    lineHeight: 1.6,
                    fontSize: "0.9rem",
                  }}
                >
                  Delivery tracking has stopped because this order was
                  cancelled.
                </Typography>
              )}
            </Paper>

            {/* Order items */}
            <Paper
              elevation={0}
              sx={{
                p: {
                  xs: 2.5,
                  sm: 3,
                  md: 4,
                },

                borderRadius: {
                  xs: "20px",
                  sm: "26px",
                },

                border: "1px solid #E2E8F0",
                backgroundColor: "#FFFFFF",
              }}
            >
              <Typography
                sx={{
                  color: "#0F172A",
                  fontWeight: 900,
                  fontSize: "1.12rem",
                }}
              >
                Ordered items
              </Typography>

              <Typography
                sx={{
                  mt: 0.45,
                  mb: 3,
                  color: "#64748B",
                  fontSize: "0.84rem",
                }}
              >
                Review the products included in this order.
              </Typography>

              {items.length === 0 ? (
                <Alert
                  severity="info"
                  sx={{
                    borderRadius: "12px",
                  }}
                >
                  No item details are available for this order.
                </Alert>
              ) : (
                <Stack spacing={2}>
                  {items.map((item, index) => (
                    <Paper
                      key={
                        item.id ||
                        `${item.product_name || "food-item"}-${index}`
                      }
                      elevation={0}
                      sx={{
                        p: {
                          xs: 1.5,
                          sm: 2,
                        },

                        borderRadius: "16px",
                        border: "1px solid #E2E8F0",
                        backgroundColor: "#F8FAFC",
                        transition:
                          "transform 0.2s ease, box-shadow 0.2s ease",

                        "&:hover": {
                          transform: {
                            sm: "translateY(-2px)",
                          },

                          boxShadow: {
                            sm: "0 12px 28px rgba(15,23,42,0.08)",
                          },
                        },
                      }}
                    >
                      <Stack
                        direction={{
                          xs: "column",
                          sm: "row",
                        }}
                        spacing={2}
                        justifyContent="space-between"
                        alignItems={{
                          xs: "stretch",
                          sm: "center",
                        }}
                      >
                        <Stack
                          direction={{
                            xs: "column",
                            sm: "row",
                          }}
                          spacing={2}
                          alignItems={{
                            xs: "stretch",
                            sm: "center",
                          }}
                          sx={{
                            minWidth: 0,
                          }}
                        >
                          <Box
                            component="img"
                            src={getImageUrl(item.image)}
                            alt={item.product_name || "Food item"}
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src = PLACEHOLDER_IMAGE;
                            }}
                            sx={{
                              width: {
                                xs: "100%",
                                sm: 104,
                              },

                              height: {
                                xs: 180,
                                sm: 82,
                              },

                              flexShrink: 0,
                              objectFit: "cover",
                              borderRadius: "12px",
                              border: "1px solid #E2E8F0",
                              backgroundColor: "#FFFFFF",
                            }}
                          />

                          <Box
                            sx={{
                              minWidth: 0,
                            }}
                          >
                            <Typography
                              sx={{
                                color: "#0F172A",
                                fontWeight: 800,
                                wordBreak: "break-word",

                                fontSize: {
                                  xs: "0.98rem",
                                  sm: "1rem",
                                },
                              }}
                            >
                              {item.product_name || "Food Item"}
                            </Typography>

                            <Stack
                              direction={{
                                xs: "column",
                                sm: "row",
                              }}
                              spacing={{
                                xs: 0.3,
                                sm: 2,
                              }}
                              mt={0.7}
                            >
                              <Typography
                                sx={{
                                  color: "#64748B",
                                  fontSize: "0.83rem",
                                }}
                              >
                                Quantity: {Number(item.quantity || 0)}
                              </Typography>

                              <Typography
                                sx={{
                                  color: "#64748B",
                                  fontSize: "0.83rem",
                                }}
                              >
                                Unit price: {formatPrice(item.unit_price)}
                              </Typography>
                            </Stack>
                          </Box>
                        </Stack>

                        <Box
                          sx={{
                            flexShrink: 0,

                            textAlign: {
                              xs: "left",
                              sm: "right",
                            },
                          }}
                        >
                          <Typography
                            sx={{
                              color: "#64748B",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                            }}
                          >
                            Item total
                          </Typography>

                          <Typography
                            sx={{
                              mt: 0.25,
                              color: "#0F172A",
                              fontWeight: 900,
                              fontSize: "1rem",
                            }}
                          >
                            {formatPrice(item.item_total)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}

              <Divider
                sx={{
                  my: 3,
                  borderColor: "#E2E8F0",
                }}
              />

              <Stack
                direction={{
                  xs: "column",
                  sm: "row",
                }}
                spacing={1.5}
                justifyContent="space-between"
                alignItems={{
                  xs: "stretch",
                  sm: "center",
                }}
              >
                <Typography
                  sx={{
                    color: "#475569",
                    fontWeight: 700,
                  }}
                >
                  Total items: {totalQuantity}
                </Typography>

                <Box
                  sx={{
                    px: 2.5,
                    py: 1.4,
                    borderRadius: "14px",
                    backgroundColor: "#FFF7ED",

                    textAlign: {
                      xs: "left",
                      sm: "right",
                    },
                  }}
                >
                  <Typography
                    sx={{
                      color: "#9A3412",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Total price
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.25,
                      color: "#EA580C",
                      fontWeight: 900,
                      fontSize: "1.18rem",
                    }}
                  >
                    {formatPrice(totalPrice)}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default Track;