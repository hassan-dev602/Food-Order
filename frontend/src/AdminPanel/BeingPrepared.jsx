import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Email as EmailIcon,
  Inventory2 as InventoryIcon,
  KeyboardArrowDown,
  KeyboardArrowUp,
  LocalShipping as LocalShippingIcon,
  LocationOn as LocationOnIcon,
  Payments as PaymentsIcon,
  Person as PersonIcon,
  ReceiptLong as ReceiptLongIcon,
  Refresh as RefreshIcon,
  RestaurantMenu as RestaurantMenuIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";

const API_BASE_URL = "http://127.0.0.1:8000";
const ORDER_API_URL = `${API_BASE_URL}/api/v1/orders/`;
const ORDER_STATUS_BEING_PREPARED = "Being Prepared";
const ORDER_STATUS_FOOD_ON_THE_WAY = "Food On The Way";

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

const getAdminToken = () => {
  return normalizeToken(localStorage.getItem("admin_access_token"));
};

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;

  return [];
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleString();
};

const formatPrice = (value) => {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
};

const extractApiErrorMessage = (
  data,
  fallbackMessage = "Something went wrong. Please try again."
) => {
  if (!data) return fallbackMessage;

  if (typeof data === "string") return data;
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.message === "string") return data.message;

  if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
    return data.non_field_errors[0];
  }

  const firstKey = Object.keys(data)[0];

  if (!firstKey) return fallbackMessage;

  const firstValue = data[firstKey];

  if (Array.isArray(firstValue) && firstValue.length > 0) {
    return String(firstValue[0]);
  }

  if (typeof firstValue === "string") {
    return firstValue;
  }

  return fallbackMessage;
};

const StatCard = ({ icon, label, value, helper }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2.25,
      height: "100%",
      borderRadius: 4,
      border: "1px solid rgba(15, 23, 42, 0.08)",
      background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
      boxShadow: "0 18px 50px rgba(15, 23, 42, 0.06)",
    }}
  >
    <Stack direction="row" spacing={1.75} alignItems="center">
      <Avatar
        sx={{
          width: 46,
          height: 46,
          bgcolor: "#fff7ed",
          color: "#f97316",
        }}
      >
        {icon}
      </Avatar>

      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 800 }}>
          {label}
        </Typography>

        <Typography
          variant="h5"
          sx={{
            color: "#0f172a",
            fontWeight: 950,
            lineHeight: 1.1,
          }}
        >
          {value}
        </Typography>

        {helper && (
          <Typography variant="caption" sx={{ color: "#94a3b8" }}>
            {helper}
          </Typography>
        )}
      </Box>
    </Stack>
  </Paper>
);

const OrderItemsTable = ({ order }) => (
  <Box sx={{ mt: 1.5 }}>
    <Typography
      variant="subtitle2"
      sx={{ fontWeight: 950, mb: 1, color: "#0f172a" }}
    >
      Order Items
    </Typography>

    {order.items?.length ? (
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{
                bgcolor: "#f8fafc",
                "& th": {
                  fontWeight: 950,
                  color: "#475569",
                  whiteSpace: "nowrap",
                },
              }}
            >
              <TableCell>Product</TableCell>
              <TableCell>Unit Price</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell>Total</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {order.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell sx={{ fontWeight: 800, color: "#0f172a" }}>
                  {item.product_name || "N/A"}
                </TableCell>
                <TableCell>{formatPrice(item.unit_price)}</TableCell>
                <TableCell>{item.quantity || 0}</TableCell>
                <TableCell sx={{ fontWeight: 900, color: "#16a34a" }}>
                  {formatPrice(item.item_total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    ) : (
      <Alert severity="info" sx={{ borderRadius: 3 }}>
        No items found for this order.
      </Alert>
    )}
  </Box>
);

const MobileOrderCard = ({
  order,
  expanded,
  updatingOrderId,
  onToggleExpand,
  onUpdateStatus,
}) => (
  <Card
    elevation={0}
    sx={{
      borderRadius: 4,
      border: "1px solid rgba(15, 23, 42, 0.08)",
      boxShadow: "0 16px 45px rgba(15, 23, 42, 0.06)",
      overflow: "hidden",
    }}
  >
    <CardContent sx={{ p: 2.25 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        spacing={1.5}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{ color: "#94a3b8", fontWeight: 900 }}
          >
            ORDER NUMBER
          </Typography>

          <Typography
            variant="h6"
            sx={{ color: "#0f172a", fontWeight: 950 }}
            noWrap
          >
            {order.order_number || "N/A"}
          </Typography>
        </Box>

        <Chip
          label={order.display_status || order.status || ORDER_STATUS_BEING_PREPARED}
          color="warning"
          size="small"
          sx={{ borderRadius: 2, fontWeight: 950, maxWidth: 150 }}
        />
      </Stack>

      <Divider sx={{ my: 1.75 }} />

      <Grid container spacing={1.5}>
        <Grid item xs={12}>
          <Stack direction="row" spacing={1} alignItems="center">
            <PersonIcon sx={{ color: "#64748b", fontSize: 20 }} />
            <Typography sx={{ color: "#334155", fontWeight: 800 }} noWrap>
              {order.customer_name || "N/A"}
            </Typography>
          </Stack>
        </Grid>

        <Grid item xs={12}>
          <Stack direction="row" spacing={1} alignItems="center">
            <EmailIcon sx={{ color: "#64748b", fontSize: 20 }} />
            <Typography sx={{ color: "#64748b" }} noWrap>
              {order.customer_email || "N/A"}
            </Typography>
          </Stack>
        </Grid>

        <Grid item xs={6}>
          <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: "#f8fafc" }}>
            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 900 }}>
              Quantity
            </Typography>
            <Typography sx={{ fontWeight: 950, color: "#0f172a" }}>
              {order.total_quantity || 0}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={6}>
          <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: "#f8fafc" }}>
            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 900 }}>
              Total
            </Typography>
            <Typography sx={{ fontWeight: 950, color: "#16a34a" }}>
              {formatPrice(order.total_price)}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Stack direction="row" spacing={1} alignItems="center">
            <PaymentsIcon sx={{ color: "#64748b", fontSize: 20 }} />
            <Typography sx={{ color: "#475569", fontWeight: 700 }}>
              {order.payment_method || "N/A"}
            </Typography>
          </Stack>
        </Grid>

        <Grid item xs={12}>
          <Stack direction="row" spacing={1} alignItems="center">
            <ScheduleIcon sx={{ color: "#64748b", fontSize: 20 }} />
            <Typography sx={{ color: "#475569", fontWeight: 700 }}>
              {formatDate(order.created_at)}
            </Typography>
          </Stack>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1.25} sx={{ mt: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          onClick={() => onToggleExpand(order.id)}
          endIcon={expanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          sx={{
            textTransform: "none",
            borderRadius: 3,
            fontWeight: 900,
            minHeight: 46,
          }}
        >
          Details
        </Button>

        <Button
          fullWidth
          variant="contained"
          startIcon={
            updatingOrderId === order.id ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <LocalShippingIcon />
            )
          }
          disabled={updatingOrderId === order.id}
          onClick={() => onUpdateStatus(order.id)}
          sx={{
            textTransform: "none",
            borderRadius: 3,
            fontWeight: 950,
            minHeight: 46,
            bgcolor: "#f97316",
            boxShadow: "0 12px 26px rgba(249, 115, 22, 0.25)",
            "&:hover": { bgcolor: "#ea580c" },
          }}
        >
          {updatingOrderId === order.id ? "Updating..." : "On The Way"}
        </Button>
      </Stack>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: 3,
            bgcolor: "#f8fafc",
            border: "1px solid #e2e8f0",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <LocationOnIcon sx={{ color: "#f97316", fontSize: 20, mt: 0.2 }} />

            <Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 950, color: "#0f172a" }}
              >
                Delivery Address
              </Typography>

              <Typography variant="body2" sx={{ color: "#475569", mt: 0.4 }}>
                {order.delivery_address || "N/A"}
              </Typography>
            </Box>
          </Stack>

          <OrderItemsTable order={order} />
        </Box>
      </Collapse>
    </CardContent>
  </Card>
);

const BeingPrepared = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const fetchAbortRef = useRef(null);

  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchOrders = useCallback(async () => {
    const token = getAdminToken();

    if (!token) {
      setError("Admin token is missing. Please log in again.");
      setOrders([]);
      setLoading(false);
      return;
    }

    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
    }

    const controller = new AbortController();
    fetchAbortRef.current = controller;

    const params = new URLSearchParams({
      status: ORDER_STATUS_BEING_PREPARED,
      cancelled: "false",
    });

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${ORDER_API_URL}?${params.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);

      if (response.status === 401 || response.status === 403) {
        throw new Error("Session expired or access denied. Please log in again.");
      }

      if (!response.ok) {
        throw new Error(extractApiErrorMessage(data, "Failed to load orders."));
      }

      setOrders(normalizeList(data));
    } catch (requestError) {
      if (requestError.name !== "AbortError") {
        setError(requestError.message || "Failed to load orders.");
        setOrders([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const updateStatus = useCallback(async (orderId) => {
    const token = getAdminToken();

    if (!token) {
      setError("Admin token is missing. Please log in again.");
      return;
    }

    setUpdatingOrderId(orderId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${ORDER_API_URL}${orderId}/update-status/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: ORDER_STATUS_FOOD_ON_THE_WAY }),
      });

      const data = await response.json().catch(() => null);

      if (response.status === 401 || response.status === 403) {
        throw new Error("Session expired or access denied. Please log in again.");
      }

      if (!response.ok) {
        throw new Error(
          extractApiErrorMessage(data, "Failed to update order.")
        );
      }

      setOrders((previousOrders) =>
        previousOrders.filter((order) => order.id !== orderId)
      );
      setSuccess("Order moved to Food On The Way successfully.");
    } catch (requestError) {
      setError(requestError.message || "Failed to update order.");
    } finally {
      setUpdatingOrderId(null);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    return () => {
      if (fetchAbortRef.current) {
        fetchAbortRef.current.abort();
      }
    };
  }, [fetchOrders]);

  const stats = useMemo(() => {
    const totalQty = orders.reduce(
      (sum, order) => sum + Number(order.total_quantity || 0),
      0
    );

    const totalAmount = orders.reduce(
      (sum, order) => sum + Number(order.total_price || 0),
      0
    );

    const totalItems = orders.reduce(
      (sum, order) => sum + Number(order.items?.length || 0),
      0
    );

    return {
      totalOrders: orders.length,
      totalQty,
      totalAmount,
      totalItems,
    };
  }, [orders]);

  const toggleExpand = (orderId) => {
    setExpandedOrderId((previousOrderId) =>
      previousOrderId === orderId ? null : orderId
    );
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        p: { xs: 1.5, sm: 2.5, md: 3.5 },
        background:
          "linear-gradient(135deg, #fff7ed 0%, #f8fafc 42%, #eef2ff 100%)",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.25, md: 3 },
          mb: 3,
          borderRadius: 5,
          color: "#ffffff",
          overflow: "hidden",
          position: "relative",
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 45%, #2563eb 100%)",
          boxShadow: "0 24px 70px rgba(15, 23, 42, 0.22)",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: 250,
            height: 250,
            borderRadius: "50%",
            right: -80,
            top: -90,
            background: "rgba(255,255,255,0.12)",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            width: 140,
            height: 140,
            borderRadius: "50%",
            right: 130,
            bottom: -80,
            background: "rgba(255,255,255,0.08)",
          }}
        />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{ position: "relative", zIndex: 1 }}
        >
          <Box>
            <Typography
              variant={isMobile ? "h4" : "h3"}
              sx={{
                fontWeight: 950,
                letterSpacing: "-0.04em",
                lineHeight: 1.05,
                color: "#ffffff",
              }}
            >
              Being Prepared
            </Typography>

            <Typography
              sx={{
                mt: 1,
                color: "rgba(255,255,255,0.75)",
                fontWeight: 600,
              }}
            >
              Review orders currently being prepared and move them to delivery
              when ready.
            </Typography>
          </Box>

          <Button
            startIcon={<RefreshIcon />}
            variant="contained"
            onClick={fetchOrders}
            disabled={loading}
            sx={{
              textTransform: "none",
              borderRadius: 3,
              fontWeight: 950,
              px: 2.6,
              py: 1.15,
              bgcolor: "#ffffff",
              color: "#0f172a",
              boxShadow: "none",
              "&:hover": {
                bgcolor: "#f8fafc",
                boxShadow: "none",
              },
            }}
          >
            Refresh
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={<ReceiptLongIcon />}
            label="Orders"
            value={stats.totalOrders}
            helper="Being prepared"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <StatCard
            icon={<InventoryIcon />}
            label="Quantity"
            value={stats.totalQty}
            helper="Total units"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <StatCard
            icon={<RestaurantMenuIcon />}
            label="Items"
            value={stats.totalItems}
            helper="Line items"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <StatCard
            icon={<PaymentsIcon />}
            label="Amount"
            value={formatPrice(stats.totalAmount)}
            helper="Total value"
          />
        </Grid>
      </Grid>

      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 3, fontWeight: 800 }}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 3, fontWeight: 800 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Paper
          elevation={0}
          sx={{
            py: 8,
            borderRadius: 5,
            display: "grid",
            placeItems: "center",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            bgcolor: "#ffffff",
          }}
        >
          <CircularProgress sx={{ color: "#f97316" }} />
          <Typography sx={{ mt: 2, color: "#64748b", fontWeight: 800 }}>
            Loading prepared orders...
          </Typography>
        </Paper>
      ) : orders.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 5,
            textAlign: "center",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            bgcolor: "#ffffff",
            boxShadow: "0 18px 55px rgba(15, 23, 42, 0.06)",
          }}
        >
          <Avatar
            sx={{
              width: 64,
              height: 64,
              mx: "auto",
              mb: 1.5,
              bgcolor: "#fff7ed",
              color: "#f97316",
            }}
          >
            <RestaurantMenuIcon />
          </Avatar>

          <Typography variant="h6" sx={{ fontWeight: 950, color: "#0f172a" }}>
            No orders found
          </Typography>

          <Typography sx={{ color: "#64748b", mt: 0.5 }}>
            There are no orders currently being prepared.
          </Typography>
        </Paper>
      ) : isMobile ? (
        <Stack spacing={2}>
          {orders.map((order) => (
            <MobileOrderCard
              key={order.id}
              order={order}
              expanded={expandedOrderId === order.id}
              updatingOrderId={updatingOrderId}
              onToggleExpand={toggleExpand}
              onUpdateStatus={updateStatus}
            />
          ))}
        </Stack>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 5,
            border: "1px solid rgba(15, 23, 42, 0.08)",
            overflow: "hidden",
            boxShadow: "0 18px 55px rgba(15, 23, 42, 0.07)",
          }}
        >
          <Table sx={{ minWidth: 1120 }}>
            <TableHead>
              <TableRow
                sx={{
                  background: "#f8fafc",
                  "& th": {
                    color: "#475569",
                    fontWeight: 950,
                    borderBottom: "1px solid #e2e8f0",
                    whiteSpace: "nowrap",
                  },
                }}
              >
                <TableCell />
                <TableCell>Order Number</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Qty</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Payment</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {orders.map((order) => (
                <React.Fragment key={order.id}>
                  <TableRow
                    hover
                    sx={{
                      "& td": {
                        borderBottom: "1px solid #f1f5f9",
                      },
                    }}
                  >
                    <TableCell>
                      <Tooltip
                        title={
                          expandedOrderId === order.id
                            ? "Hide details"
                            : "View details"
                        }
                      >
                        <IconButton
                          size="small"
                          onClick={() => toggleExpand(order.id)}
                          aria-label={
                            expandedOrderId === order.id
                              ? "Hide order details"
                              : "View order details"
                          }
                          sx={{
                            bgcolor: "#fff7ed",
                            color: "#f97316",
                            "&:hover": { bgcolor: "#ffedd5" },
                          }}
                        >
                          {expandedOrderId === order.id ? (
                            <KeyboardArrowUp />
                          ) : (
                            <KeyboardArrowDown />
                          )}
                        </IconButton>
                      </Tooltip>
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontWeight: 950, color: "#0f172a" }}>
                        {order.order_number || "N/A"}
                      </Typography>

                      <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                        ID: {order.id}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ fontWeight: 800, color: "#334155" }}>
                      {order.customer_name || "N/A"}
                    </TableCell>

                    <TableCell sx={{ color: "#64748b", maxWidth: 210 }}>
                      <Typography noWrap>
                        {order.customer_email || "N/A"}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ fontWeight: 900 }}>
                      {order.total_quantity || 0}
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontWeight: 950, color: "#16a34a" }}>
                        {formatPrice(order.total_price)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={
                          order.display_status ||
                          order.status ||
                          ORDER_STATUS_BEING_PREPARED
                        }
                        size="small"
                        color="warning"
                        sx={{ borderRadius: 2, fontWeight: 950 }}
                      />
                    </TableCell>

                    <TableCell sx={{ color: "#475569", fontWeight: 800 }}>
                      {order.payment_method || "N/A"}
                    </TableCell>

                    <TableCell sx={{ color: "#64748b", whiteSpace: "nowrap" }}>
                      {formatDate(order.created_at)}
                    </TableCell>

                    <TableCell align="right">
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={
                          updatingOrderId === order.id ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <LocalShippingIcon />
                          )
                        }
                        disabled={updatingOrderId === order.id}
                        onClick={() => updateStatus(order.id)}
                        sx={{
                          minHeight: 38,
                          px: 2,
                          textTransform: "none",
                          borderRadius: 3,
                          fontWeight: 950,
                          bgcolor: "#f97316",
                          boxShadow: "0 10px 22px rgba(249, 115, 22, 0.22)",
                          "&:hover": { bgcolor: "#ea580c" },
                        }}
                      >
                        {updatingOrderId === order.id
                          ? "Updating..."
                          : "Move On The Way"}
                      </Button>
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell
                      colSpan={10}
                      sx={{
                        py: 0,
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <Collapse
                        in={expandedOrderId === order.id}
                        timeout="auto"
                        unmountOnExit
                      >
                        <Box
                          sx={{
                            p: 2.25,
                            bgcolor: "#fff7ed",
                            borderTop: "1px solid #ffedd5",
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="flex-start"
                            sx={{ mb: 2 }}
                          >
                            <LocationOnIcon sx={{ color: "#f97316", mt: 0.2 }} />

                            <Box>
                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 950, color: "#0f172a" }}
                              >
                                Delivery Address
                              </Typography>

                              <Typography
                                variant="body2"
                                sx={{ color: "#475569", mt: 0.35 }}
                              >
                                {order.delivery_address || "N/A"}
                              </Typography>
                            </Box>
                          </Stack>

                          <OrderItemsTable order={order} />
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default BeingPrepared;