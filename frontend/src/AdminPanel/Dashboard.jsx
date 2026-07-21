import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import {
  Assignment,
  Cancel,
  CheckCircle,
  DoneAll,
  LocalShipping,
  MonetizationOn,
  PendingActions,
  RateReview,
  Restaurant,
  Refresh,
  TrendingUp,
} from "@mui/icons-material";

const API_BASE_URL = "http://127.0.0.1:8000";
const DASHBOARD_API_URL = `${API_BASE_URL}/api/v1/admin/dashboard/`;

const CARD_GRID_STYLES = {
  display: "grid",
  gridTemplateColumns: {
    xs: "1fr",
    sm: "repeat(2, minmax(0, 1fr))",
    md: "repeat(3, minmax(0, 1fr))",
    lg: "repeat(4, minmax(0, 1fr))",
  },
  gap: { xs: 2, md: 2.5 },
};

const getAdminToken = () => {
  const rawToken = localStorage.getItem("admin_access_token");

  // Some apps store tokens with "Bearer" included, so this keeps the header clean.
  return rawToken ? rawToken.replace(/^Bearer\s+/i, "").trim() : "";
};

const formatCurrency = (value) => {
  const number = Number(value || 0);

  return `Rs. ${number.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const buildDashboardCards = (stats) => [
  {
    title: "Total Orders",
    value: stats?.total_orders ?? 0,
    icon: <Assignment />,
    color: "#2563eb",
    bg: "rgba(37, 99, 235, 0.10)",
  },
  {
    title: "New Orders",
    value: stats?.new_orders ?? 0,
    icon: <PendingActions />,
    color: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.10)",
  },
  {
    title: "Being Prepared",
    value: stats?.being_prepared ?? 0,
    icon: <Restaurant />,
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.12)",
  },
  {
    title: "Food On The Way",
    value: stats?.food_on_the_way ?? 0,
    icon: <LocalShipping />,
    color: "#0891b2",
    bg: "rgba(8, 145, 178, 0.10)",
  },
  {
    title: "Delivered",
    value: stats?.delivered ?? 0,
    icon: <DoneAll />,
    color: "#16a34a",
    bg: "rgba(22, 163, 74, 0.10)",
  },
  {
    title: "Cancelled",
    value: stats?.cancelled ?? 0,
    icon: <Cancel />,
    color: "#dc2626",
    bg: "rgba(220, 38, 38, 0.10)",
  },
  {
    title: "Today Sales",
    value: formatCurrency(stats?.today_sales),
    icon: <MonetizationOn />,
    color: "#059669",
    bg: "rgba(5, 150, 105, 0.10)",
  },
  {
    title: "This Week Sales",
    value: formatCurrency(stats?.this_week_sales),
    icon: <TrendingUp />,
    color: "#0f766e",
    bg: "rgba(15, 118, 110, 0.10)",
  },
  {
    title: "This Month Sales",
    value: formatCurrency(stats?.this_month_sales),
    icon: <CheckCircle />,
    color: "#4338ca",
    bg: "rgba(67, 56, 202, 0.10)",
  },
  {
    title: "This Year Sales",
    value: formatCurrency(stats?.this_year_sales),
    icon: <MonetizationOn />,
    color: "#be123c",
    bg: "rgba(190, 18, 60, 0.10)",
  },
  {
    title: "Total Reviews",
    value: stats?.total_reviews ?? 0,
    icon: <RateReview />,
    color: "#9333ea",
    bg: "rgba(147, 51, 234, 0.10)",
  },
];

const StatCard = memo(({ card }) => {
  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        borderRadius: { xs: 3, md: 4 },
        border: "1px solid #e5e7eb",
        background:
          "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)",
        overflow: "hidden",
        position: "relative",
        transition: "all 0.25s ease",
        "&:hover": {
          transform: { xs: "none", md: "translateY(-6px)" },
          boxShadow: "0 18px 45px rgba(15, 23, 42, 0.10)",
          borderColor: "rgba(37, 99, 235, 0.25)",
        },
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "4px",
          background: card.color,
        },
      }}
    >
      <CardContent
        sx={{
          p: { xs: 2, sm: 2.3, md: 2.6 },
          height: "100%",
          "&:last-child": {
            pb: { xs: 2, sm: 2.3, md: 2.6 },
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={2}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                color: "#64748b",
                fontWeight: 700,
                mb: 1,
                fontSize: { xs: "0.82rem", md: "0.9rem" },
              }}
            >
              {card.title}
            </Typography>

            <Typography
              component="p"
              sx={{
                fontWeight: 900,
                color: "#0f172a",
                lineHeight: 1.15,
                fontSize: {
                  xs: "1.35rem",
                  sm: "1.45rem",
                  md: "1.55rem",
                },
                wordBreak: "break-word",
              }}
            >
              {card.value}
            </Typography>
          </Box>

          <Box
            sx={{
              width: { xs: 44, md: 50 },
              height: { xs: 44, md: 50 },
              minWidth: { xs: 44, md: 50 },
              borderRadius: 3,
              bgcolor: card.bg,
              color: card.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              "& svg": {
                fontSize: { xs: 24, md: 28 },
              },
            }}
          >
            {card.icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
});

StatCard.displayName = "StatCard";

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardStats = useCallback(async (signal) => {
    const token = getAdminToken();

    if (!token) {
      setStats(null);
      setError("Admin token missing. Please login again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(DASHBOARD_API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal,
      });

      // Safely handle cases where the backend returns an empty or non-JSON error response.
      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        setStats(null);
        setError("Session expired or access denied. Please login again.");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.detail || data?.message || "Failed to load dashboard stats."
        );
      }

      setStats(data);
    } catch (error) {
      if (error.name === "AbortError") return;

      setStats(null);
      setError(error.message || "Failed to load dashboard stats.");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchDashboardStats(controller.signal);

    // Prevents state updates if the component unmounts while the API request is running.
    return () => controller.abort();
  }, [fetchDashboardStats]);

  const cards = useMemo(() => buildDashboardCards(stats), [stats]);

  return (
    <Box
      component="main"
      sx={{
        width: "100%",
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f8fafc 0%, #ffffff 45%, #f8fafc 100%)",
        p: { xs: 1.5, sm: 2.5, md: 3 },
      }}
    >
      <Box sx={{ maxWidth: 1600, mx: "auto" }}>
        <Box
          component="section"
          sx={{
            borderRadius: { xs: 3, md: 5 },
            p: { xs: 2, sm: 3, md: 4 },
            mb: 3,
            border: "1px solid #e5e7eb",
            background:
              "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #2563eb 100%)",
            color: "#ffffff",
            boxShadow: "0 20px 60px rgba(15, 23, 42, 0.18)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              width: 220,
              height: 220,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.10)",
              right: -70,
              top: -80,
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
                component="h1"
                sx={{
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  fontSize: {
                    xs: "2rem",
                    sm: "2.4rem",
                    md: "3rem",
                  },
                }}
              >
                Dashboard
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,
                  color: "rgba(255,255,255,0.78)",
                  fontWeight: 500,
                  fontSize: { xs: "0.9rem", md: "1rem" },
                }}
              >
                Overview of orders, sales, and customer reviews.
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={
                loading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <Refresh />
                )
              }
              onClick={() => fetchDashboardStats()}
              disabled={loading}
              aria-label="Refresh dashboard statistics"
              sx={{
                borderRadius: 3,
                px: 2.4,
                py: 1.15,
                bgcolor: "#ffffff",
                color: "#1d4ed8",
                fontWeight: 800,
                textTransform: "none",
                boxShadow: "none",
                "&:hover": {
                  bgcolor: "#eff6ff",
                  boxShadow: "none",
                },
                width: { xs: "100%", sm: "auto" },
              }}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </Stack>
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: 3,
              border: "1px solid #fecaca",
            }}
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={CARD_GRID_STYLES}>
            {Array.from({ length: 11 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="rounded"
                height={138}
                sx={{ borderRadius: 4 }}
              />
            ))}
          </Box>
        ) : !stats ? (
          <Alert
            severity="info"
            sx={{
              borderRadius: 3,
              border: "1px solid #bfdbfe",
            }}
          >
            No dashboard data found.
          </Alert>
        ) : (
          <Box component="section" sx={CARD_GRID_STYLES}>
            {cards.map((card) => (
              <StatCard key={card.title} card={card} />
            ))}
          </Box>
        )}

        {loading && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ mt: 3 }}
          >
            <CircularProgress size={20} />
            <Typography
              variant="body2"
              sx={{ color: "#64748b", fontWeight: 600 }}
            >
              Loading real dashboard stats...
            </Typography>
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default Dashboard;