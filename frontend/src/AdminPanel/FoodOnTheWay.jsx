import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
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
  DoneAll as DoneAllIcon,
  Email as EmailIcon,
  Inventory2 as InventoryIcon,
  KeyboardArrowDown,
  KeyboardArrowUp,
  LocationOn as LocationOnIcon,
  Payments as PaymentsIcon,
  Person as PersonIcon,
  ReceiptLong as ReceiptLongIcon,
  Refresh as RefreshIcon,
  RestaurantMenu as RestaurantMenuIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";

const API_BASE_URL = "http://127.0.0.1:8000";

const DELIVERY_STATUS = "Food On The Way";
const DELIVERED_STATUS = "Delivered";

const getAdminToken = () => {
  const rawToken = localStorage.getItem("admin_access_token");

  // Remove "Bearer" if it was saved with the token to avoid sending "Bearer Bearer token".
  return rawToken ? rawToken.replace(/^Bearer\s+/i, "").trim() : "";
};

const readJsonSafely = async (response, fallbackValue) => {
  try {
    return await response.json();
  } catch {
    return fallbackValue;
  }
};

const getApiErrorMessage = (data, fallbackMessage) => {
  return data?.detail || data?.status?.[0] || data?.message || fallbackMessage;
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString();
};

const formatCurrency = (value, fractionDigits = 2) => {
  const amount = Number(value || 0);

  return `Rs. ${amount.toLocaleString("en-PK", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
};

const getOrdersFromResponse = (data) => {
  if (Array.isArray(data)) return data;

  return Array.isArray(data?.results) ? data.results : [];
};

const StatCard = memo(({ icon, label, value, helper }) => (
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
          bgcolor: "#eff6ff",
          color: "#2563eb",
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
            wordBreak: "break-word",
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
));

const OrderItemsTable = memo(({ order }) => {
  const orderItems = Array.isArray(order.items) ? order.items : [];

  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 950, mb: 1, color: "#0f172a" }}>
        Order Items
      </Typography>

      {orderItems.length > 0 ? (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            overflowX: "auto",
          }}
        >
          <Table size="small" sx={{ minWidth: 520 }}>
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
              {orderItems.map((item) => (
                <TableRow key={item.id || `${item.product_name}-${item.quantity}`}>
                  <TableCell sx={{ fontWeight: 800, color: "#0f172a" }}>
                    {item.product_name || "N/A"}
                  </TableCell>
                  <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                  <TableCell>{item.quantity || 0}</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: "#16a34a" }}>
                    {formatCurrency(item.item_total)}
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
});

const MobileInfoRow = memo(({ icon, children, bold = false }) => (
  <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
    {icon}
    <Typography
      sx={{
        color: bold ? "#334155" : "#64748b",
        fontWeight: bold ? 800 : 700,
        minWidth: 0,
      }}
      noWrap
    >
      {children}
    </Typography>
  </Stack>
));

const MobileOrderCard = memo(
  ({ order, expanded, isUpdating, onToggleExpand, onMarkDelivered }) => (
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
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 900 }}>
              ORDER NUMBER
            </Typography>

            <Typography variant="h6" sx={{ color: "#0f172a", fontWeight: 950 }} noWrap>
              {order.order_number || "N/A"}
            </Typography>
          </Box>

          <Chip
            label={order.display_status || order.status || DELIVERY_STATUS}
            color="info"
            size="small"
            sx={{
              borderRadius: 2,
              fontWeight: 950,
              maxWidth: 160,
            }}
          />
        </Stack>

        <Divider sx={{ my: 1.75 }} />

        <Grid container spacing={1.5}>
          <Grid item xs={12}>
            <MobileInfoRow
              bold
              icon={<PersonIcon sx={{ color: "#64748b", fontSize: 20 }} />}
            >
              {order.customer_name || "N/A"}
            </MobileInfoRow>
          </Grid>

          <Grid item xs={12}>
            <MobileInfoRow icon={<EmailIcon sx={{ color: "#64748b", fontSize: 20 }} />}>
              {order.customer_email || "N/A"}
            </MobileInfoRow>
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
                {formatCurrency(order.total_price)}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <MobileInfoRow icon={<PaymentsIcon sx={{ color: "#64748b", fontSize: 20 }} />}>
              {order.payment_method || "N/A"}
            </MobileInfoRow>
          </Grid>

          <Grid item xs={12}>
            <MobileInfoRow icon={<ScheduleIcon sx={{ color: "#64748b", fontSize: 20 }} />}>
              {formatDate(order.created_at)}
            </MobileInfoRow>
          </Grid>
        </Grid>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mt: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => onToggleExpand(order.id)}
            endIcon={expanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            aria-expanded={expanded}
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
              isUpdating ? <CircularProgress size={16} color="inherit" /> : <DoneAllIcon />
            }
            disabled={isUpdating}
            onClick={() => onMarkDelivered(order.id)}
            sx={{
              textTransform: "none",
              borderRadius: 3,
              fontWeight: 950,
              minHeight: 46,
              bgcolor: "#2563eb",
              boxShadow: "0 12px 26px rgba(37, 99, 235, 0.25)",
              "&:hover": { bgcolor: "#1d4ed8" },
            }}
          >
            {isUpdating ? "Updating..." : "Delivered"}
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
              <LocationOnIcon sx={{ color: "#2563eb", fontSize: 20, mt: 0.2 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 950, color: "#0f172a" }}>
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
  )
);

const FoodOnTheWay = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchOrders = useCallback(async () => {
    const token = getAdminToken();

    if (!token) {
      setError("Admin token missing. Please login again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/orders/?status=${encodeURIComponent(
          DELIVERY_STATUS
        )}&cancelled=false`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await readJsonSafely(response, []);

      if (response.status === 401 || response.status === 403) {
        setOrders([]);
        setError("Session expired or access denied. Please login again.");
        return;
      }

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "Failed to load orders."));
      }

      setOrders(getOrdersFromResponse(data));
    } catch (error) {
      setOrders([]);
      setError(error.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (orderId) => {
    const token = getAdminToken();

    if (!token) {
      setError("Admin token missing. Please login again.");
      return;
    }

    setUpdatingOrderId(orderId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/orders/${orderId}/update-status/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: DELIVERED_STATUS }),
      });

      const data = await readJsonSafely(response, {});

      if (response.status === 401 || response.status === 403) {
        setError("Session expired or access denied. Please login again.");
        return;
      }

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "Failed to update order."));
      }

      // Remove the order from this screen because it no longer belongs to "Food On The Way".
      setOrders((previousOrders) => previousOrders.filter((order) => order.id !== orderId));
      setSuccess("Order marked as delivered successfully.");
    } catch (error) {
      setError(error.message || "Failed to update order.");
    } finally {
      setUpdatingOrderId(null);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const stats = useMemo(() => {
    return orders.reduce(
      (summary, order) => {
        const orderItems = Array.isArray(order.items) ? order.items : [];

        summary.totalOrders += 1;
        summary.totalQty += Number(order.total_quantity || 0);
        summary.totalAmount += Number(order.total_price || 0);
        summary.totalItems += orderItems.length;

        return summary;
      },
      {
        totalOrders: 0,
        totalQty: 0,
        totalAmount: 0,
        totalItems: 0,
      }
    );
  }, [orders]);

  const toggleExpand = useCallback((orderId) => {
    setExpandedOrderId((previousOrderId) => (previousOrderId === orderId ? null : orderId));
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        p: { xs: 1.5, sm: 2.5, md: 3.5 },
        background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 42%, #eef2ff 100%)",
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
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 45%, #2563eb 100%)",
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
              Food On The Way
            </Typography>

            <Typography sx={{ mt: 1, color: "rgba(255,255,255,0.74)", fontWeight: 700 }}>
              Track delivery orders and mark completed orders as delivered.
            </Typography>
          </Box>

          <Button
            startIcon={
              loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />
            }
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
              "&:hover": { bgcolor: "#f8fafc", boxShadow: "none" },
              "&.Mui-disabled": {
                bgcolor: "rgba(255,255,255,0.75)",
                color: "#475569",
              },
            }}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={<ReceiptLongIcon />}
            label="Orders"
            value={stats.totalOrders}
            helper="On the way"
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
            value={formatCurrency(stats.totalAmount, 0)}
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
          <CircularProgress sx={{ color: "#2563eb" }} />

          <Typography sx={{ mt: 2, color: "#64748b", fontWeight: 800 }}>
            Loading delivery orders...
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
              bgcolor: "#eff6ff",
              color: "#2563eb",
            }}
          >
            <DoneAllIcon />
          </Avatar>

          <Typography variant="h6" sx={{ fontWeight: 950, color: "#0f172a" }}>
            No orders found
          </Typography>

          <Typography sx={{ color: "#64748b", mt: 0.5 }}>
            There are no orders currently out for delivery.
          </Typography>
        </Paper>
      ) : isMobile ? (
        <Stack spacing={2}>
          {orders.map((order) => (
            <MobileOrderCard
              key={order.id}
              order={order}
              expanded={expandedOrderId === order.id}
              isUpdating={updatingOrderId === order.id}
              onToggleExpand={toggleExpand}
              onMarkDelivered={updateStatus}
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
            overflowX: "auto",
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
              {orders.map((order) => {
                const expanded = expandedOrderId === order.id;
                const isUpdating = updatingOrderId === order.id;

                return (
                  <React.Fragment key={order.id}>
                    <TableRow
                      hover
                      sx={{
                        "& td": { borderBottom: "1px solid #f1f5f9" },
                      }}
                    >
                      <TableCell>
                        <Tooltip title={expanded ? "Hide details" : "View details"}>
                          <IconButton
                            size="small"
                            onClick={() => toggleExpand(order.id)}
                            aria-label={expanded ? "Hide order details" : "View order details"}
                            aria-expanded={expanded}
                            sx={{
                              bgcolor: "#eff6ff",
                              color: "#2563eb",
                              "&:hover": { bgcolor: "#dbeafe" },
                            }}
                          >
                            {expanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
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
                        <Typography noWrap>{order.customer_email || "N/A"}</Typography>
                      </TableCell>

                      <TableCell sx={{ fontWeight: 900 }}>
                        {order.total_quantity || 0}
                      </TableCell>

                      <TableCell>
                        <Typography sx={{ fontWeight: 950, color: "#16a34a" }}>
                          {formatCurrency(order.total_price)}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={order.display_status || order.status || DELIVERY_STATUS}
                          size="small"
                          color="info"
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
                            isUpdating ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <DoneAllIcon />
                            )
                          }
                          disabled={isUpdating}
                          onClick={() => updateStatus(order.id)}
                          sx={{
                            minHeight: 38,
                            px: 2,
                            textTransform: "none",
                            borderRadius: 3,
                            fontWeight: 950,
                            bgcolor: "#2563eb",
                            boxShadow: "0 10px 22px rgba(37, 99, 235, 0.22)",
                            "&:hover": { bgcolor: "#1d4ed8" },
                          }}
                        >
                          {isUpdating ? "Updating..." : "Mark Delivered"}
                        </Button>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell colSpan={10} sx={{ py: 0, borderBottom: "1px solid #f1f5f9" }}>
                        <Collapse in={expanded} timeout="auto" unmountOnExit>
                          <Box
                            sx={{
                              p: 2.25,
                              bgcolor: "#eff6ff",
                              borderTop: "1px solid #dbeafe",
                            }}
                          >
                            <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 2 }}>
                              <LocationOnIcon sx={{ color: "#2563eb", mt: 0.2 }} />

                              <Box>
                                <Typography
                                  variant="subtitle2"
                                  sx={{ fontWeight: 950, color: "#0f172a" }}
                                >
                                  Delivery Address
                                </Typography>

                                <Typography variant="body2" sx={{ color: "#475569", mt: 0.35 }}>
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
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default FoodOnTheWay;