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
  Cancel as CancelIcon,
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

const getAdminToken = () => {
  const rawToken = localStorage.getItem("admin_access_token");
  return rawToken ? rawToken.replace(/^Bearer\s+/i, "").trim() : "";
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "N/A";
  }

  return parsedDate.toLocaleString();
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return `Rs. ${amount.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const getCancelledAt = (order) => {
  return order.canceled_at || order.cancelled_at || order.updated_at;
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

const OrderItemsTable = memo(({ order }) => (
  <Box sx={{ mt: 1.5 }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 950, mb: 1, color: "#0f172a" }}>
      Order Items
    </Typography>

    {order.items?.length ? (
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
            {order.items.map((item) => (
              <TableRow key={item.id}>
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
));

const MobileOrderCard = memo(({ order, expanded, onToggle }) => (
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
          label={order.display_status || order.status || "Cancelled"}
          color="error"
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
              {formatCurrency(order.total_price)}
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
              Created: {formatDate(order.created_at)}
            </Typography>
          </Stack>
        </Grid>

        <Grid item xs={12}>
          <Stack direction="row" spacing={1} alignItems="center">
            <CancelIcon sx={{ color: "#dc2626", fontSize: 20 }} />
            <Typography sx={{ color: "#475569", fontWeight: 700 }}>
              Cancelled: {formatDate(getCancelledAt(order))}
            </Typography>
          </Stack>
        </Grid>
      </Grid>

      <Button
        fullWidth
        variant="outlined"
        onClick={() => onToggle(order.id)}
        endIcon={expanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
        sx={{
          textTransform: "none",
          borderRadius: 3,
          fontWeight: 900,
          minHeight: 46,
          mt: 2,
        }}
      >
        Details
      </Button>

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
));

const Cancelled = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async (signal) => {
    const token = getAdminToken();

    if (!token) {
      setError("Admin token missing. Please login again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/orders/?cancelled=true`, {
        method: "GET",
        signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json().catch(() => []);

      if (response.status === 401 || response.status === 403) {
        setError("Session expired or access denied. Please login again.");
        setOrders([]);
        return;
      }

      if (!response.ok) {
        throw new Error(data?.detail || "Failed to load orders.");
      }

      // Supports both plain list responses and paginated DRF responses.
      setOrders(Array.isArray(data) ? data : data?.results || []);
    } catch (fetchError) {
      if (fetchError.name === "AbortError") {
        return;
      }

      setError(fetchError.message || "Failed to load orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchOrders(controller.signal);

    // Prevents setting state after the component unmounts during an active request.
    return () => controller.abort();
  }, [fetchOrders]);

  const stats = useMemo(() => {
    const totalQuantity = orders.reduce(
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
      totalQuantity,
      totalAmount,
      totalItems,
    };
  }, [orders]);

  const toggleExpand = useCallback((orderId) => {
    setExpandedOrderId((previousOrderId) =>
      previousOrderId === orderId ? null : orderId
    );
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
              Cancelled Orders
            </Typography>

            <Typography sx={{ mt: 1, color: "rgba(255,255,255,0.78)", fontWeight: 600 }}>
              View cancelled customer orders, payment details, and item breakdowns.
            </Typography>
          </Box>

          <Button
            startIcon={<RefreshIcon />}
            variant="contained"
            onClick={() => fetchOrders()}
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
              "&.Mui-disabled": {
                bgcolor: "rgba(255,255,255,0.75)",
                color: "#475569",
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
            helper="Cancelled"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <StatCard
            icon={<InventoryIcon />}
            label="Quantity"
            value={stats.totalQuantity}
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
            value={formatCurrency(stats.totalAmount)}
            helper="Total value"
          />
        </Grid>
      </Grid>

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
            Loading cancelled orders...
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
              bgcolor: "#fef2f2",
              color: "#dc2626",
            }}
          >
            <CancelIcon />
          </Avatar>

          <Typography variant="h6" sx={{ fontWeight: 950, color: "#0f172a" }}>
            No orders found
          </Typography>

          <Typography sx={{ color: "#64748b", mt: 0.5 }}>
            There are no cancelled orders available right now.
          </Typography>
        </Paper>
      ) : isMobile ? (
        <Stack spacing={2}>
          {orders.map((order) => (
            <MobileOrderCard
              key={order.id}
              order={order}
              expanded={expandedOrderId === order.id}
              onToggle={toggleExpand}
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
          <Table sx={{ minWidth: 1150 }}>
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
                <TableCell>Cancelled At</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {orders.map((order) => {
                const expanded = expandedOrderId === order.id;

                return (
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
                        <Tooltip title={expanded ? "Hide details" : "View details"}>
                          <IconButton
                            size="small"
                            onClick={() => toggleExpand(order.id)}
                            sx={{
                              bgcolor: "#eff6ff",
                              color: "#2563eb",
                              "&:hover": {
                                bgcolor: "#dbeafe",
                              },
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

                      <TableCell sx={{ color: "#64748b", maxWidth: 230 }}>
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
                          label={order.display_status || order.status || "Cancelled"}
                          size="small"
                          color="error"
                          sx={{ borderRadius: 2, fontWeight: 950 }}
                        />
                      </TableCell>

                      <TableCell sx={{ color: "#475569", fontWeight: 800 }}>
                        {order.payment_method || "N/A"}
                      </TableCell>

                      <TableCell sx={{ color: "#64748b", whiteSpace: "nowrap" }}>
                        {formatDate(order.created_at)}
                      </TableCell>

                      <TableCell sx={{ color: "#64748b", whiteSpace: "nowrap" }}>
                        {formatDate(getCancelledAt(order))}
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

export default Cancelled;