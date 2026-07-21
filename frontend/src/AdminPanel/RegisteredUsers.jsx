import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Email as EmailIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  VerifiedUser as VerifiedUserIcon,
} from "@mui/icons-material";

const API_BASE_URL = "http://127.0.0.1:8000";

/**
 * Removes duplicate "Bearer" text if the token was saved with it.
 * This keeps the Authorization header consistent.
 */
const getAdminToken = () => {
  const rawToken = localStorage.getItem("admin_access_token");
  return rawToken ? rawToken.replace(/^Bearer\s+/i, "").trim() : "";
};

/**
 * Supports both normal array responses and paginated DRF responses.
 */
const normalizeUserList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getUserInitial = (user) => {
  const name = user?.full_name || user?.username || user?.email || "U";
  return name.charAt(0).toUpperCase();
};

const getUserDisplayName = (user) => {
  return user?.full_name || user?.username || "N/A";
};

const getUserKey = (user, index) => {
  return user?.id || user?.email || user?.username || index;
};

const UserStatusChip = ({ isActive }) => (
  <Chip
    label={isActive ? "Active" : "Inactive"}
    color={isActive ? "success" : "default"}
    size="small"
    sx={{ fontWeight: 800 }}
  />
);

const UserRoleChip = ({ isStaff }) => (
  <Chip
    label={isStaff ? "Staff/Admin" : "Customer"}
    color={isStaff ? "primary" : "default"}
    size="small"
    sx={{ fontWeight: 800 }}
  />
);

const UserMobileCard = ({ user }) => {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: "1px solid",
        borderColor: "grey.200",
        bgcolor: "background.paper",
        boxShadow: "0 12px 35px rgba(15, 23, 42, 0.07)",
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              fontWeight: 900,
              boxShadow: "0 10px 24px rgba(37, 99, 235, 0.28)",
            }}
          >
            {getUserInitial(user)}
          </Avatar>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontWeight: 900,
                color: "grey.900",
                fontSize: "1rem",
                wordBreak: "break-word",
              }}
            >
              {getUserDisplayName(user)}
            </Typography>

            <Typography
              sx={{
                color: "text.secondary",
                fontSize: "0.85rem",
                mt: 0.3,
                wordBreak: "break-word",
              }}
            >
              @{user.username || "N/A"}
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 1.8 }} />

        <Stack spacing={1.3}>
          <Stack direction="row" spacing={1} alignItems="center">
            <EmailIcon sx={{ color: "text.secondary", fontSize: 18 }} />

            <Typography
              sx={{
                color: "text.primary",
                fontSize: "0.86rem",
                wordBreak: "break-word",
              }}
            >
              {user.email || "N/A"}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <VerifiedUserIcon sx={{ color: "text.secondary", fontSize: 18 }} />

            <Typography sx={{ color: "text.primary", fontSize: "0.86rem" }}>
              Joined: {formatDate(user.date_joined)}
            </Typography>
          </Stack>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            mt: 2,
            flexWrap: "wrap",
            rowGap: 1,
          }}
        >
          <UserStatusChip isActive={user.is_active} />
          <UserRoleChip isStaff={user.is_staff} />
        </Stack>
      </CardContent>
    </Card>
  );
};

const UsersLoadingState = () => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: {
        xs: "1fr",
        sm: "repeat(2, minmax(0, 1fr))",
        md: "repeat(3, minmax(0, 1fr))",
      },
      gap: 2,
    }}
  >
    {Array.from({ length: 6 }).map((_, index) => (
      <Skeleton
        key={index}
        variant="rounded"
        height={140}
        sx={{ borderRadius: 4 }}
      />
    ))}
  </Box>
);

const RegisteredUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    const token = getAdminToken();

    if (!token) {
      setUsers([]);
      setError("Admin token missing. Please login again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // Some failed responses may not return valid JSON, so this prevents parsing errors.
      const data = await response.json().catch(() => null);

      if (response.status === 401 || response.status === 403) {
        setUsers([]);
        setError("Session expired or access denied. Please login again.");
        return;
      }

      if (!response.ok) {
        throw new Error(data?.detail || "Failed to load registered users.");
      }

      setUsers(normalizeUserList(data));
    } catch (apiError) {
      setUsers([]);
      setError(apiError.message || "Failed to load registered users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalUsers = users.length;

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        bgcolor: "#f8fafc",
        background:
          "linear-gradient(180deg, #f8fafc 0%, #ffffff 48%, #f8fafc 100%)",
        p: { xs: 1.5, sm: 2.5, md: 3 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: { xs: 3, md: 5 },
          p: { xs: 2, sm: 3, md: 4 },
          mb: 3,
          border: "1px solid",
          borderColor: "grey.200",
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #2563eb 100%)",
          color: "#ffffff",
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.16)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: 240,
            height: 240,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.10)",
            right: -90,
            top: -100,
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
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 3,
                bgcolor: "rgba(255,255,255,0.14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 1.3,
              }}
            >
              <PersonIcon />
            </Box>

            <Typography
              component="h1"
              sx={{
                fontWeight: 900,
                letterSpacing: "-0.04em",
                fontSize: { xs: "1.9rem", sm: "2.35rem", md: "2.8rem" },
              }}
            >
              Registered Users
            </Typography>

            <Typography
              sx={{
                mt: 0.8,
                color: "rgba(255,255,255,0.82)",
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              View and monitor all users registered in the system.
            </Typography>

            {!loading && !error && (
              <Chip
                label={`${totalUsers} ${totalUsers === 1 ? "User" : "Users"}`}
                sx={{
                  mt: 1.5,
                  bgcolor: "rgba(255,255,255,0.15)",
                  color: "#ffffff",
                  fontWeight: 800,
                }}
              />
            )}
          </Box>

          <Button
            startIcon={
              loading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <RefreshIcon />
              )
            }
            variant="contained"
            onClick={fetchUsers}
            disabled={loading}
            sx={{
              width: { xs: "100%", sm: "auto" },
              textTransform: "none",
              borderRadius: 3,
              px: 2.5,
              py: 1.15,
              fontWeight: 800,
              bgcolor: "#ffffff",
              color: "#1d4ed8",
              boxShadow: "none",
              "&:hover": {
                bgcolor: "#eff6ff",
                boxShadow: "none",
              },
            }}
          >
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "error.light",
          }}
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <UsersLoadingState />
      ) : users.length === 0 ? (
        <Alert
          severity="info"
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: "primary.light",
          }}
        >
          No registered users found.
        </Alert>
      ) : (
        <>
          <Box
            sx={{
              display: { xs: "grid", md: "none" },
              gap: 2,
            }}
          >
            {users.map((user, index) => (
              <UserMobileCard key={getUserKey(user, index)} user={user} />
            ))}
          </Box>

          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
              display: { xs: "none", md: "block" },
              borderRadius: 4,
              overflow: "hidden",
              borderColor: "grey.200",
              boxShadow: "0 12px 35px rgba(15, 23, 42, 0.07)",
              bgcolor: "background.paper",
            }}
          >
            <Table aria-label="Registered users table">
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: "#f8fafc",
                    "& th": {
                      fontWeight: 900,
                      color: "text.primary",
                      borderBottom: "1px solid",
                      borderColor: "grey.200",
                      py: 2,
                      whiteSpace: "nowrap",
                    },
                  }}
                >
                  <TableCell>Full Name</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Date Joined</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Role</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {users.map((user, index) => (
                  <TableRow
                    key={getUserKey(user, index)}
                    hover
                    sx={{
                      "& td": {
                        py: 2,
                        borderBottom: "1px solid",
                        borderColor: "#f1f5f9",
                      },
                      "&:hover": {
                        bgcolor: "#f8fafc",
                      },
                    }}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          sx={{
                            width: 38,
                            height: 38,
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                            fontWeight: 900,
                          }}
                        >
                          {getUserInitial(user)}
                        </Avatar>

                        <Typography
                          sx={{
                            fontWeight: 900,
                            color: "grey.900",
                            maxWidth: 180,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {getUserDisplayName(user)}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>
                      @{user.username || "N/A"}
                    </TableCell>

                    <TableCell sx={{ color: "text.secondary" }}>
                      <Tooltip title={user.email || "N/A"} arrow>
                        <Typography
                          sx={{
                            maxWidth: 240,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: "0.9rem",
                          }}
                        >
                          {user.email || "N/A"}
                        </Typography>
                      </Tooltip>
                    </TableCell>

                    <TableCell sx={{ color: "text.secondary", fontWeight: 600 }}>
                      {formatDate(user.date_joined)}
                    </TableCell>

                    <TableCell>
                      <UserStatusChip isActive={user.is_active} />
                    </TableCell>

                    <TableCell>
                      <UserRoleChip isStaff={user.is_staff} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default RegisteredUsers;