import React, { memo, useCallback, useMemo, useState } from "react";
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
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  CalendarMonth as CalendarMonthIcon,
  Email as EmailIcon,
  ManageSearch as ManageSearchIcon,
  People as PeopleIcon,
  ReceiptLong as ReceiptLongIcon,
  Search as SearchIcon,
} from "@mui/icons-material";

const API_BASE_URL = "http://127.0.0.1:8000";

const EMPTY_RESULTS = {
  orders: [],
  users: [],
};

const panelStyles = {
  borderRadius: 5,
  border: "1px solid rgba(15, 23, 42, 0.08)",
  bgcolor: "#ffffff",
  boxShadow: "0 18px 55px rgba(15, 23, 42, 0.06)",
};

const cardStyles = {
  height: "100%",
  borderRadius: 4,
  border: "1px solid rgba(15, 23, 42, 0.08)",
  boxShadow: "0 16px 45px rgba(15, 23, 42, 0.06)",
};

const fieldStyles = {
  "& .MuiOutlinedInput-root": {
    minHeight: 60,
    borderRadius: 3,
    backgroundColor: "#ffffff",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
    transition: "0.2s ease",
    "&:hover": {
      boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
    },
    "&.Mui-focused": {
      boxShadow: "0 0 0 4px rgba(37, 99, 235, 0.10)",
    },
  },
  "& .MuiInputLabel-root": {
    fontWeight: 800,
    color: "#64748b",
  },
  "& .MuiInputBase-input": {
    fontWeight: 800,
    color: "#0f172a",
  },
};

const getAdminToken = () => {
  const rawToken = localStorage.getItem("admin_access_token");

  // Some apps store tokens with "Bearer". The API header below adds it again,
  // so we remove any existing prefix to avoid sending "Bearer Bearer token".
  return rawToken ? rawToken.replace(/^Bearer\s+/i, "").trim() : "";
};

const formatDate = (value) => {
  if (!value) return "N/A";

  return new Date(value).toLocaleDateString();
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

const SectionHeader = memo(({ icon, title, count }) => (
  <Stack
    direction={{ xs: "column", sm: "row" }}
    justifyContent="space-between"
    alignItems={{ xs: "flex-start", sm: "center" }}
    spacing={1.5}
    sx={{ mb: 1.5 }}
  >
    <Stack direction="row" spacing={1} alignItems="center">
      <Avatar
        sx={{
          width: 36,
          height: 36,
          bgcolor: "#eff6ff",
          color: "#2563eb",
        }}
      >
        {icon}
      </Avatar>

      <Typography variant="h6" sx={{ fontWeight: 950, color: "#0f172a" }}>
        {title}
      </Typography>
    </Stack>

    <Chip
      label={`${count} found`}
      size="small"
      sx={{
        borderRadius: 2,
        fontWeight: 900,
        bgcolor: "#f8fafc",
      }}
    />
  </Stack>
));

const EmptyState = memo(({ icon, title, message, iconColor = "#2563eb", iconBg = "#eff6ff" }) => (
  <Paper
    elevation={0}
    sx={{
      p: { xs: 3, md: 5 },
      ...panelStyles,
      textAlign: "center",
    }}
  >
    <Avatar
      sx={{
        width: 64,
        height: 64,
        mx: "auto",
        mb: 1.5,
        bgcolor: iconBg,
        color: iconColor,
      }}
    >
      {icon}
    </Avatar>

    <Typography variant="h6" sx={{ fontWeight: 950, color: "#0f172a" }}>
      {title}
    </Typography>

    <Typography sx={{ color: "#64748b", mt: 0.5 }}>{message}</Typography>
  </Paper>
));

const OrderCard = memo(({ order }) => (
  <Card elevation={0} sx={cardStyles}>
    <CardContent sx={{ p: 2.25 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.25}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 900 }}>
            ORDER NUMBER
          </Typography>

          <Typography
            sx={{
              fontWeight: 950,
              color: "#0f172a",
              overflowWrap: "anywhere",
            }}
          >
            {order.order_number || "N/A"}
          </Typography>
        </Box>

        <Chip
          label={order.display_status || order.status || "N/A"}
          size="small"
          color={getStatusColor(order)}
          sx={{
            borderRadius: 2,
            fontWeight: 900,
            maxWidth: 150,
            "& .MuiChip-label": {
              overflow: "hidden",
              textOverflow: "ellipsis",
            },
          }}
        />
      </Stack>

      <Box sx={{ my: 1.5, borderTop: "1px solid #e2e8f0" }} />

      <Stack spacing={1}>
        <Typography
          variant="body2"
          sx={{
            color: "#334155",
            fontWeight: 800,
            overflowWrap: "anywhere",
          }}
        >
          Customer: {order.customer_name || "N/A"}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: "#64748b",
            overflowWrap: "anywhere",
          }}
        >
          Email: {order.customer_email || "N/A"}
        </Typography>

        <Typography variant="body2" sx={{ color: "#16a34a", fontWeight: 950 }}>
          Total: {formatCurrency(order.total_price)}
        </Typography>
      </Stack>
    </CardContent>
  </Card>
));

const UserCard = memo(({ user }) => {
  const displayName = user.full_name || user.username || "N/A";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <Card elevation={0} sx={cardStyles}>
      <CardContent sx={{ p: 2.25 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            sx={{
              bgcolor: user.is_staff ? "#eff6ff" : "#f8fafc",
              color: "#2563eb",
              fontWeight: 950,
            }}
          >
            {avatarLetter}
          </Avatar>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 950,
                color: "#0f172a",
                overflowWrap: "anywhere",
              }}
            >
              {displayName}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: "#64748b",
                overflowWrap: "anywhere",
              }}
            >
              @{user.username || "N/A"}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ my: 1.5, borderTop: "1px solid #e2e8f0" }} />

        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <EmailIcon sx={{ color: "#64748b", fontSize: 19, mt: 0.2 }} />

            <Typography
              variant="body2"
              sx={{
                color: "#64748b",
                overflowWrap: "anywhere",
                minWidth: 0,
              }}
            >
              {user.email || "N/A"}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <CalendarMonthIcon sx={{ color: "#64748b", fontSize: 19 }} />

            <Typography variant="body2" sx={{ color: "#475569", fontWeight: 800 }}>
              Joined: {formatDate(user.date_joined)}
            </Typography>
          </Stack>

          <Chip
            label={user.is_staff ? "Admin / Staff" : "Customer"}
            size="small"
            color={user.is_staff ? "primary" : "default"}
            sx={{
              mt: 0.5,
              borderRadius: 2,
              fontWeight: 900,
              width: "fit-content",
            }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
});

const Search = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const stats = useMemo(
    () => ({
      orders: results.orders.length,
      users: results.users.length,
      total: results.orders.length + results.users.length,
    }),
    [results]
  );

  const hasAnyResult = stats.total > 0;

  const handleSearch = useCallback(
    async (event) => {
      event.preventDefault();

      // Prevent duplicate requests if the user presses Enter repeatedly.
      if (loading) return;

      const trimmedQuery = query.trim();
      const token = getAdminToken();

      if (!token) {
        setError("Admin token missing. Please login again.");
        setResults(EMPTY_RESULTS);
        setSearched(false);
        return;
      }

      if (!trimmedQuery) {
        setError("Please enter an order number or username to search.");
        setResults(EMPTY_RESULTS);
        setSearched(false);
        return;
      }

      setLoading(true);
      setError("");
      setSearched(true);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/admin/search/?q=${encodeURIComponent(trimmedQuery)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        // Some error responses may not return valid JSON, so this keeps the UI from crashing.
        const data = await response.json().catch(() => ({}));

        if (response.status === 401 || response.status === 403) {
          setError("Session expired or access denied. Please login again.");
          setResults(EMPTY_RESULTS);
          return;
        }

        if (!response.ok) {
          throw new Error(data?.detail || "Search failed.");
        }

        setResults({
          orders: Array.isArray(data.orders) ? data.orders : [],
          users: Array.isArray(data.users) ? data.users : [],
        });
      } catch (searchError) {
        setError(searchError.message || "Search failed.");
        setResults(EMPTY_RESULTS);
      } finally {
        setLoading(false);
      }
    },
    [loading, query]
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        p: { xs: 1.5, sm: 2.5, md: 3.5 },
        background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 42%, #eef2ff 100%)",
      }}
    >
      <Box sx={{ maxWidth: 1400, mx: "auto" }}>
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
                variant="h3"
                sx={{
                  fontSize: { xs: "2rem", md: "3rem" },
                  fontWeight: 950,
                  letterSpacing: "-0.04em",
                  lineHeight: 1.05,
                  color: "#ffffff",
                }}
              >
                Search Records
              </Typography>

              <Typography
                sx={{
                  mt: 1,
                  color: "rgba(255,255,255,0.78)",
                  fontWeight: 600,
                  maxWidth: 560,
                }}
              >
                Quickly find customer users and order records from the admin dashboard.
              </Typography>
            </Box>

            <Avatar
              sx={{
                bgcolor: "rgba(255,255,255,0.16)",
                color: "#ffffff",
                width: 52,
                height: 52,
              }}
            >
              <ManageSearchIcon />
            </Avatar>
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.5 },
            mb: 3,
            ...panelStyles,
          }}
        >
          <Box component="form" onSubmit={handleSearch}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
                gap: 2,
                alignItems: "center",
              }}
            >
              <TextField
                label="Search by order number or username"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                fullWidth
                disabled={loading}
                autoComplete="off"
                sx={fieldStyles}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "#94a3b8" }} />
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                variant="contained"
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
                disabled={loading}
                sx={{
                  minHeight: 60,
                  width: { xs: "100%", md: "auto" },
                  minWidth: { md: 165 },
                  px: 3,
                  textTransform: "none",
                  borderRadius: 3,
                  fontWeight: 950,
                  bgcolor: "#2563eb",
                  boxShadow: "0 14px 30px rgba(37, 99, 235, 0.28)",
                  "&:hover": {
                    bgcolor: "#1d4ed8",
                    boxShadow: "0 16px 34px rgba(37, 99, 235, 0.34)",
                  },
                }}
              >
                {loading ? "Searching..." : "Search"}
              </Button>
            </Box>
          </Box>
        </Paper>

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 2,
              borderRadius: 3,
              fontWeight: 800,
            }}
          >
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <StatCard
              icon={<SearchIcon />}
              label="Total Results"
              value={stats.total}
              helper="Order number + username matches"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <StatCard
              icon={<ReceiptLongIcon />}
              label="Orders"
              value={stats.orders}
              helper="Matched order numbers"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <StatCard
              icon={<PeopleIcon />}
              label="Users"
              value={stats.users}
              helper="Matched usernames"
            />
          </Grid>
        </Grid>

        {loading ? (
          <Paper
            elevation={0}
            sx={{
              py: 8,
              ...panelStyles,
              display: "grid",
              placeItems: "center",
            }}
          >
            <CircularProgress sx={{ color: "#2563eb" }} />

            <Typography sx={{ mt: 2, color: "#64748b", fontWeight: 800 }}>
              Searching records...
            </Typography>
          </Paper>
        ) : !searched ? (
          <EmptyState
            icon={<ManageSearchIcon />}
            title="Start searching"
            message="Search only by order number or username."
          />
        ) : !hasAnyResult ? (
          <EmptyState
            icon={<SearchIcon />}
            title="No data found"
            message="Try another order number or username."
            iconColor="#64748b"
            iconBg="#f8fafc"
          />
        ) : (
          <Stack spacing={3}>
            {results.orders.length > 0 && (
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, md: 2.5 },
                  ...panelStyles,
                }}
              >
                <SectionHeader
                  icon={<ReceiptLongIcon />}
                  title="Orders"
                  count={results.orders.length}
                />

                <Grid container spacing={2}>
                  {results.orders.map((order) => (
                    <Grid item xs={12} md={6} lg={4} key={order.id || order.order_number}>
                      <OrderCard order={order} />
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}

            {results.users.length > 0 && (
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, md: 2.5 },
                  ...panelStyles,
                }}
              >
                <SectionHeader
                  icon={<PeopleIcon />}
                  title="Users"
                  count={results.users.length}
                />

                <Grid container spacing={2}>
                  {results.users.map((user) => (
                    <Grid item xs={12} md={6} lg={4} key={user.id || user.username}>
                      <UserCard user={user} />
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default Search;