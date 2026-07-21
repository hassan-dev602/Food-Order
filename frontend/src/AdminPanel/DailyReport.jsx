import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Assessment as AssessmentIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Inventory2 as InventoryIcon,
  Payments as PaymentsIcon,
  PendingActions as PendingActionsIcon,
  ReceiptLong as ReceiptLongIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";

const API_BASE_URL = "http://127.0.0.1:8000";

const getAdminToken = () => {
  const rawToken = localStorage.getItem("admin_access_token");

  // The token is normalized here so the API request always receives a clean Bearer token.
  return rawToken ? rawToken.replace(/^Bearer\s+/i, "").trim() : "";
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleString();
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return `Rs. ${amount.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
};

const getStatusColor = (order) => {
  const status = String(order?.display_status || order?.status || "").toLowerCase();

  if (order?.is_canceled || status.includes("cancel")) return "error";
  if (status.includes("deliver")) return "success";
  if (status.includes("way")) return "info";
  if (status.includes("prepared") || status.includes("preparing")) return "warning";

  return "primary";
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
);

const MobileOrderCard = ({ order }) => (
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
          label={order.display_status || order.status || "N/A"}
          color={getStatusColor(order)}
          size="small"
          sx={{
            borderRadius: 2,
            fontWeight: 950,
            maxWidth: 150,
            "& .MuiChip-label": {
              overflow: "hidden",
              textOverflow: "ellipsis",
            },
          }}
        />
      </Stack>

      <Box sx={{ my: 1.75, borderTop: "1px solid #e2e8f0" }} />

      <Grid container spacing={1.5}>
        <Grid item xs={12}>
          <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 900 }}>
            Customer
          </Typography>

          <Typography sx={{ color: "#334155", fontWeight: 850 }} noWrap>
            {order.customer_name || "N/A"}
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 900 }}>
            Email
          </Typography>

          <Typography sx={{ color: "#64748b" }} noWrap>
            {order.customer_email || "N/A"}
          </Typography>
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
            <ScheduleIcon sx={{ color: "#64748b", fontSize: 20 }} />

            <Typography sx={{ color: "#475569", fontWeight: 700 }}>
              {formatDate(order.created_at)}
            </Typography>
          </Stack>
        </Grid>
      </Grid>
    </CardContent>
  </Card>
);

const LoadingState = () => (
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
      Loading daily report...
    </Typography>
  </Paper>
);

const EmptyState = ({ icon, title, description }) => (
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
      {icon}
    </Avatar>

    <Typography variant="h6" sx={{ fontWeight: 950, color: "#0f172a" }}>
      {title}
    </Typography>

    <Typography sx={{ color: "#64748b", mt: 0.5 }}>{description}</Typography>
  </Paper>
);

const DailyReport = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async (signal) => {
    const token = getAdminToken();

    if (!token) {
      setError("Admin token missing. Please login again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/reports/daily/`, {
        method: "GET",
        signal,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        setError("Session expired or access denied. Please login again.");
        setReport(null);
        return;
      }

      if (!response.ok) {
        throw new Error(data?.detail || "Failed to load daily report.");
      }

      setReport(data);
    } catch (requestError) {
      // Ignore aborted requests so the user does not see an error during component cleanup.
      if (requestError.name === "AbortError") return;

      setError(requestError.message || "Failed to load daily report.");
      setReport(null);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchReport(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchReport]);

  const reportCards = useMemo(
    () => [
      {
        label: "Total Orders",
        value: report?.total_orders ?? 0,
        helper: "Orders today",
        icon: <ReceiptLongIcon />,
      },
      {
        label: "Today Sales",
        value: formatCurrency(report?.today_sales),
        helper: "Daily revenue",
        icon: <PaymentsIcon />,
      },
      {
        label: "Delivered",
        value: report?.delivered_count ?? 0,
        helper: "Completed orders",
        icon: <CheckCircleIcon />,
      },
      {
        label: "Cancelled",
        value: report?.cancelled_count ?? 0,
        helper: "Cancelled orders",
        icon: <CancelIcon />,
      },
      {
        label: "Pending/New",
        value: report?.pending_or_new_count ?? 0,
        helper: "Waiting orders",
        icon: <PendingActionsIcon />,
      },
    ],
    [report]
  );

  const orders = report?.orders || [];

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
              Daily Report
            </Typography>

            <Typography sx={{ mt: 1, color: "rgba(255,255,255,0.78)", fontWeight: 700 }}>
              View today’s orders, revenue, and order status summary.
            </Typography>
          </Box>

          <Button
            startIcon={<RefreshIcon />}
            variant="contained"
            onClick={() => fetchReport()}
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
                bgcolor: "rgba(255,255,255,0.55)",
                color: "rgba(15,23,42,0.55)",
              },
            }}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 3, fontWeight: 800 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <LoadingState />
      ) : !report ? (
        <EmptyState
          icon={<AssessmentIcon />}
          title="No daily report found"
          description="Daily sales and order data is not available right now."
        />
      ) : (
        <>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 4,
              border: "1px solid rgba(15, 23, 42, 0.08)",
              bgcolor: "#ffffff",
              boxShadow: "0 14px 40px rgba(15, 23, 42, 0.05)",
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Chip
                icon={<ScheduleIcon />}
                label={`Report Date: ${report.date || "N/A"}`}
                sx={{
                  borderRadius: 2,
                  fontWeight: 900,
                  bgcolor: "#eff6ff",
                  color: "#2563eb",
                }}
              />

              <Typography sx={{ color: "#64748b", fontWeight: 700 }}>
                Today’s sales and order performance summary
              </Typography>
            </Stack>
          </Paper>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(5, 1fr)",
              },
              gap: 2,
              mb: 3,
            }}
          >
            {reportCards.map((card) => (
              <StatCard
                key={card.label}
                icon={card.icon}
                label={card.label}
                value={card.value}
                helper={card.helper}
              />
            ))}
          </Box>

          {orders.length ? (
            isMobile ? (
              <Stack spacing={2}>
                {orders.map((order) => (
                  <MobileOrderCard key={order.id} order={order} />
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
                <Table sx={{ minWidth: 980 }}>
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
                      <TableCell>Order Number</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Qty</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {orders.map((order) => (
                      <TableRow
                        key={order.id}
                        hover
                        sx={{
                          "& td": {
                            borderBottom: "1px solid #f1f5f9",
                          },
                          "&:last-child td": {
                            borderBottom: 0,
                          },
                        }}
                      >
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
                            label={order.display_status || order.status || "N/A"}
                            size="small"
                            color={getStatusColor(order)}
                            sx={{ borderRadius: 2, fontWeight: 950 }}
                          />
                        </TableCell>

                        <TableCell sx={{ color: "#64748b", whiteSpace: "nowrap" }}>
                          {formatDate(order.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          ) : (
            <EmptyState
              icon={<InventoryIcon />}
              title="No orders found for today"
              description="Today’s order list is currently empty."
            />
          )}
        </>
      )}
    </Box>
  );
};

export default DailyReport;