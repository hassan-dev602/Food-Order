import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  CssBaseline,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  Grid,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Category as CategoryIcon,
  Close as CloseIcon,
  Dashboard as DashboardIcon,
  Description as DescriptionIcon,
  Email as EmailIcon,
  ExpandLess,
  ExpandMore,
  Logout as LogoutIcon,
  LocalShipping as LocalShippingIcon,
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Receipt as ReceiptIcon,
  RestaurantMenu as RestaurantMenuIcon,
  Reviews as ReviewsIcon,
  Search as SearchIcon,
  ShoppingBag as ShoppingBagIcon,
} from "@mui/icons-material";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAdminAuth } from "../context/AdminAuthContext";

const DRAWER_WIDTH = 292;
const API_BASE_URL = "http://127.0.0.1:8000";
const NEW_ORDERS_API_URL = `${API_BASE_URL}/api/v1/orders/new-orders/`;

const ADMIN_MENU_PATHS = {
  category: ["/admin/add-category", "/admin/manage-category"],
  menu: ["/admin/add-item", "/admin/manage-item"],
  orders: [
    "/admin/being-prepared",
    "/admin/food-on-the-way",
    "/admin/delivered",
    "/admin/cancelled",
  ],
  reports: ["/admin/daily-report", "/admin/monthly-report"],
};

const SIDEBAR_GROUPS = [
  {
    key: "category",
    label: "Food Category",
    icon: <CategoryIcon />,
    children: [
      { label: "Add Category", path: "/admin/add-category" },
      { label: "Manage Category", path: "/admin/manage-category" },
    ],
  },
  {
    key: "menu",
    label: "Food Menu",
    icon: <RestaurantMenuIcon />,
    children: [
      { label: "Add Item", path: "/admin/add-item" },
      { label: "Manage Item", path: "/admin/manage-item" },
    ],
  },
  {
    key: "orders",
    label: "Orders",
    icon: <ReceiptIcon />,
    children: [
      { label: "Being Prepared", path: "/admin/being-prepared" },
      { label: "Food On The Way", path: "/admin/food-on-the-way" },
      { label: "Delivered", path: "/admin/delivered" },
      { label: "Cancelled", path: "/admin/cancelled" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    icon: <DescriptionIcon />,
    children: [
      { label: "Daily Report", path: "/admin/daily-report" },
      { label: "Monthly Report", path: "/admin/monthly-report" },
    ],
  },
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

const AdminLayout = ({ children }) => {
  const notificationAbortRef = useRef(null);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [openMenus, setOpenMenus] = useState({
    category: false,
    menu: false,
    orders: false,
    reports: false,
  });

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [newOrders, setNewOrders] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const location = useLocation();

  const { adminLogout, adminUser } = useAdminAuth();

  const adminDisplayName = useMemo(() => {
    return adminUser?.full_name || adminUser?.username || "Admin";
  }, [adminUser]);

  const adminInitial = useMemo(() => {
    return adminDisplayName.charAt(0).toUpperCase() || "A";
  }, [adminDisplayName]);

  const isMenuActive = useCallback(
    (key) => {
      return ADMIN_MENU_PATHS[key]?.includes(location.pathname);
    },
    [location.pathname]
  );

  const closeMobileDrawer = useCallback(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  const fetchNewOrders = useCallback(async () => {
    const token = getAdminToken();

    if (!token) {
      setNotificationError("Admin token is missing. Please log in again.");
      setNewOrders([]);
      return;
    }

    if (notificationAbortRef.current) {
      notificationAbortRef.current.abort();
    }

    const controller = new AbortController();
    notificationAbortRef.current = controller;

    setNotificationLoading(true);
    setNotificationError("");

    try {
      const response = await fetch(NEW_ORDERS_API_URL, {
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
        throw new Error(
          extractApiErrorMessage(data, "Failed to load new orders.")
        );
      }

      setNewOrders(normalizeList(data));
    } catch (requestError) {
      if (requestError.name !== "AbortError") {
        setNotificationError(
          requestError.message || "Failed to load new orders."
        );
        setNewOrders([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setNotificationLoading(false);
      }
    }
  }, []);

  const moveToBeingPrepared = useCallback(async (orderId) => {
    const token = getAdminToken();

    if (!token) {
      setNotificationError("Admin token is missing. Please log in again.");
      return;
    }

    setUpdatingOrderId(orderId);
    setNotificationError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/orders/${orderId}/update-status/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "Being Prepared" }),
        }
      );

      const data = await response.json().catch(() => null);

      if (response.status === 401 || response.status === 403) {
        throw new Error("Session expired or access denied. Please log in again.");
      }

      if (!response.ok) {
        throw new Error(
          extractApiErrorMessage(data, "Failed to update order status.")
        );
      }

      setNewOrders((previousOrders) =>
        previousOrders.filter((order) => order.id !== orderId)
      );
    } catch (requestError) {
      setNotificationError(
        requestError.message || "Failed to update order status."
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }, []);

  useEffect(() => {
    fetchNewOrders();

    return () => {
      if (notificationAbortRef.current) {
        notificationAbortRef.current.abort();
      }
    };
  }, [fetchNewOrders]);

  useEffect(() => {
    setOpenMenus((previousMenus) => ({
      ...previousMenus,
      category: ADMIN_MENU_PATHS.category.includes(location.pathname),
      menu: ADMIN_MENU_PATHS.menu.includes(location.pathname),
      orders: ADMIN_MENU_PATHS.orders.includes(location.pathname),
      reports: ADMIN_MENU_PATHS.reports.includes(location.pathname),
    }));
  }, [location.pathname]);

  const toggleDrawer = () => {
    setMobileOpen((previousValue) => !previousValue);
  };

  const handleToggleMenu = (key) => {
    setOpenMenus((previousMenus) => ({
      ...previousMenus,
      [key]: !previousMenus[key],
    }));
  };

  const handleNotificationOpen = () => {
    setNotificationOpen(true);
    fetchNewOrders();
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await adminLogout();
      navigate("/admin-login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const activeMainItemSx = {
    background:
      "linear-gradient(135deg, rgba(37, 99, 235, 0.38), rgba(59, 130, 246, 0.22))",
    color: "#ffffff",
    boxShadow:
      "inset 0 0 0 1px rgba(147, 197, 253, 0.28), 0 12px 30px rgba(15, 23, 42, 0.16)",
    "& .MuiListItemIcon-root": { color: "#bfdbfe" },
    "& .MuiListItemText-primary": {
      color: "#ffffff",
      fontWeight: 900,
    },
  };

  const activeNestedItemSx = {
    backgroundColor: "rgba(37, 99, 235, 0.28)",
    color: "#ffffff",
    "& .MuiListItemText-primary": {
      color: "#ffffff",
      fontWeight: 850,
    },
  };

  const mainItemSx = {
    mx: 1.25,
    my: 0.45,
    px: 1.7,
    py: 1.08,
    gap: 1,
    borderRadius: 3,
    minHeight: 48,
    color: "rgba(255,255,255,0.88)",
    transition: "all 0.22s ease",
    textDecoration: "none",
    "& .MuiListItemIcon-root": {
      color: "rgba(255,255,255,0.78)",
      minWidth: 38,
    },
    "& .MuiListItemText-primary": {
      fontSize: "0.94rem",
      fontWeight: 650,
    },
    "&:hover": {
      backgroundColor: "rgba(37, 99, 235, 0.20)",
      color: "#ffffff",
      transform: "translateX(4px)",
    },
    "&.active": activeMainItemSx,
  };

  const nestedItemSx = {
    ml: 2.4,
    mr: 1.25,
    my: 0.35,
    px: 1.6,
    py: 0.85,
    borderRadius: 2.5,
    minHeight: 40,
    color: "rgba(255,255,255,0.72)",
    textDecoration: "none",
    "& .MuiListItemText-primary": {
      fontSize: "0.86rem",
      fontWeight: 650,
    },
    "&:hover": {
      backgroundColor: "rgba(59, 130, 246, 0.18)",
      color: "#ffffff",
      transform: "translateX(3px)",
    },
    "&.active": activeNestedItemSx,
  };

  const renderMenuGroup = (group) => {
    const groupIsActive = isMenuActive(group.key);

    return (
      <React.Fragment key={group.key}>
        <ListItemButton
          onClick={() => handleToggleMenu(group.key)}
          sx={[mainItemSx, groupIsActive ? activeMainItemSx : null]}
        >
          <ListItemIcon>{group.icon}</ListItemIcon>
          <ListItemText primary={group.label} />
          {openMenus[group.key] ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>

        <Collapse in={openMenus[group.key]} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {group.children.map((child) => (
              <ListItemButton
                key={child.path}
                component={NavLink}
                to={child.path}
                end
                onClick={closeMobileDrawer}
                sx={nestedItemSx}
              >
                <ListItemText primary={child.label} />
              </ListItemButton>
            ))}
          </List>
        </Collapse>
      </React.Fragment>
    );
  };

  const NewOrderCard = ({ order }) => (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: "1px solid rgba(15, 23, 42, 0.08)",
        boxShadow: "0 16px 45px rgba(15, 23, 42, 0.06)",
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
              sx={{ fontWeight: 950, color: "#0f172a" }}
              noWrap
            >
              {order.order_number || "N/A"}
            </Typography>
          </Box>

          <Chip
            label={order.display_status || order.status || "New"}
            color="warning"
            size="small"
            sx={{ borderRadius: 2, fontWeight: 950 }}
          />
        </Stack>

        <Divider sx={{ my: 1.75 }} />

        <Grid container spacing={1.5}>
          <Grid item xs={12}>
            <Stack direction="row" spacing={1} alignItems="center">
              <PersonIcon sx={{ color: "#64748b", fontSize: 20 }} />
              <Typography sx={{ color: "#334155", fontWeight: 850 }} noWrap>
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
            <Paper
              elevation={0}
              sx={{ p: 1.4, borderRadius: 3, bgcolor: "#f8fafc" }}
            >
              <Typography
                variant="caption"
                sx={{ color: "#94a3b8", fontWeight: 900 }}
              >
                Quantity
              </Typography>

              <Typography sx={{ color: "#0f172a", fontWeight: 950 }}>
                {order.total_quantity || 0}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={6}>
            <Paper
              elevation={0}
              sx={{ p: 1.4, borderRadius: 3, bgcolor: "#f8fafc" }}
            >
              <Typography
                variant="caption"
                sx={{ color: "#94a3b8", fontWeight: 900 }}
              >
                Total
              </Typography>

              <Typography sx={{ color: "#16a34a", fontWeight: 950 }}>
                {formatPrice(order.total_price)}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Typography
              variant="body2"
              sx={{ color: "#64748b", fontWeight: 700 }}
            >
              Created: {formatDate(order.created_at)}
            </Typography>
          </Grid>
        </Grid>

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
          onClick={() => moveToBeingPrepared(order.id)}
          sx={{
            mt: 2,
            minHeight: 46,
            borderRadius: 3,
            textTransform: "none",
            fontWeight: 950,
            bgcolor: "#2563eb",
            boxShadow: "0 12px 26px rgba(37, 99, 235, 0.25)",
            "&:hover": { bgcolor: "#1d4ed8" },
          }}
        >
          {updatingOrderId === order.id
            ? "Updating..."
            : "Move to Being Prepared"}
        </Button>
      </CardContent>
    </Card>
  );

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(180deg, #0f172a 0%, #111827 52%, #020617 100%)",
        color: "white",
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
          right: -120,
          top: -80,
          bgcolor: "rgba(37, 99, 235, 0.25)",
          filter: "blur(2px)",
        }}
      />

      <Box
        sx={{
          px: 2.4,
          py: 2.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          position: "relative",
          zIndex: 1,
        }}
      >
        <Avatar
          sx={{
            width: 54,
            height: 54,
            background: "linear-gradient(135deg, #2563eb, #60a5fa)",
            fontWeight: 950,
            boxShadow: "0 14px 32px rgba(37, 99, 235, 0.35)",
          }}
        >
          A
        </Avatar>

        <Box sx={{ overflow: "hidden" }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 950, letterSpacing: "-0.02em" }}
            noWrap
          >
            Admin Panel
          </Typography>

          <Typography
            variant="body2"
            sx={{ color: "rgba(255,255,255,0.62)" }}
            noWrap
          >
            Food Ordering System
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          py: 1.25,
          position: "relative",
          zIndex: 1,
        }}
      >
        <List disablePadding>
          <ListItemButton
            component={NavLink}
            to="/admin"
            end
            onClick={closeMobileDrawer}
            sx={mainItemSx}
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>

          <ListItemButton
            component={NavLink}
            to="/admin/registered-users"
            end
            onClick={closeMobileDrawer}
            sx={mainItemSx}
          >
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText primary="Registered Users" />
          </ListItemButton>

          {SIDEBAR_GROUPS.map(renderMenuGroup)}

          <ListItemButton
            component={NavLink}
            to="/admin/search"
            end
            onClick={closeMobileDrawer}
            sx={mainItemSx}
          >
            <ListItemIcon>
              <SearchIcon />
            </ListItemIcon>
            <ListItemText primary="Search" />
          </ListItemButton>

          <ListItemButton
            component={NavLink}
            to="/admin/manage-reviews"
            end
            onClick={closeMobileDrawer}
            sx={mainItemSx}
          >
            <ListItemIcon>
              <ReviewsIcon />
            </ListItemIcon>
            <ListItemText primary="Manage Reviews" />
          </ListItemButton>
        </List>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

      <Box sx={{ p: 2, position: "relative", zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 4,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#ffffff",
          }}
        >
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: "#2563eb",
                fontWeight: 950,
              }}
            >
              {adminInitial}
            </Avatar>

            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap>
                {adminDisplayName}
              </Typography>

              <Typography
                variant="caption"
                sx={{ color: "rgba(255,255,255,0.62)" }}
                noWrap
              >
                System administrator
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #eff6ff 0%, #f8fafc 42%, #eef2ff 100%)",
      }}
    >
      <CssBaseline />

      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          backgroundColor: alpha("#ffffff", 0.88),
          backdropFilter: "blur(16px)",
          color: "#0f172a",
          borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
          boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
        }}
      >
        <Toolbar
          sx={{
            minHeight: { xs: 66, sm: 74 },
            px: { xs: 1.5, sm: 2.5, md: 3 },
            display: "flex",
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              minWidth: 0,
            }}
          >
            {isMobile && (
              <IconButton
                onClick={toggleDrawer}
                aria-label="Open admin navigation"
                sx={{
                  bgcolor: "#eff6ff",
                  color: "#2563eb",
                  borderRadius: 3,
                  "&:hover": { bgcolor: "#dbeafe" },
                }}
              >
                <MenuIcon />
              </IconButton>
            )}

            <Avatar
              sx={{
                display: { xs: "none", sm: "flex" },
                width: 42,
                height: 42,
                background: "linear-gradient(135deg, #2563eb, #60a5fa)",
                boxShadow: "0 10px 22px rgba(37, 99, 235, 0.22)",
              }}
            >
              <ShoppingBagIcon />
            </Avatar>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h6"
                noWrap
                sx={{
                  fontWeight: 950,
                  letterSpacing: "-0.03em",
                  fontSize: { xs: "1rem", sm: "1.18rem", md: "1.28rem" },
                }}
              >
                Food Ordering System
              </Typography>

              <Typography
                variant="body2"
                noWrap
                sx={{
                  color: "#64748b",
                  display: { xs: "none", sm: "block" },
                  fontWeight: 650,
                }}
              >
                Welcome back, {adminDisplayName}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 1, sm: 1.25 },
              flexShrink: 0,
            }}
          >
            <Tooltip title="New orders">
              <IconButton
                onClick={handleNotificationOpen}
                aria-label="Open new order notifications"
                sx={{
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  borderRadius: 3,
                  backgroundColor: "#ffffff",
                  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
                  "&:hover": { bgcolor: "#f8fafc" },
                }}
              >
                <Badge badgeContent={newOrders.length} color="error">
                  <NotificationsIcon sx={{ color: "#2563eb" }} />
                </Badge>
              </IconButton>
            </Tooltip>

            <Button
              variant="contained"
              color="error"
              size={isMobile ? "small" : "medium"}
              startIcon={!isMobile ? <LogoutIcon /> : null}
              disabled={isLoggingOut}
              onClick={handleLogout}
              sx={{
                minHeight: { xs: 40, sm: 44 },
                borderRadius: 3,
                textTransform: "none",
                fontWeight: 950,
                boxShadow: "0 10px 24px rgba(220, 38, 38, 0.20)",
              }}
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { md: DRAWER_WIDTH },
          flexShrink: { md: 0 },
        }}
      >
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={toggleDrawer}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: "block", md: "none" },
              "& .MuiDrawer-paper": {
                width: DRAWER_WIDTH,
                borderRight: "none",
                boxSizing: "border-box",
              },
            }}
          >
            {drawerContent}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            open
            sx={{
              display: { xs: "none", md: "block" },
              "& .MuiDrawer-paper": {
                width: DRAWER_WIDTH,
                borderRight: "none",
                boxSizing: "border-box",
              },
            }}
          >
            {drawerContent}
          </Drawer>
        )}
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: "100%", md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: "100vh",
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 66, sm: 74 } }} />

        <Box sx={{ p: { xs: 1.25, sm: 2, md: 2.5 } }}>
          <Box
            sx={{
              minHeight: "calc(100vh - 98px)",
              borderRadius: { xs: 3, md: 5 },
              overflow: "hidden",
              border: "1px solid rgba(15, 23, 42, 0.08)",
              boxShadow: "0 18px 55px rgba(15, 23, 42, 0.05)",
              bgcolor: "rgba(255,255,255,0.76)",
              backdropFilter: "blur(10px)",
            }}
          >
            {children || <Outlet />}
          </Box>
        </Box>
      </Box>

      <Dialog
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            borderRadius: 5,
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle
          sx={{
            p: 2.5,
            background:
              "linear-gradient(135deg, #0f172a 0%, #1e293b 45%, #2563eb 100%)",
            color: "#ffffff",
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
          >
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 950, letterSpacing: "-0.03em" }}
              >
                New Order Notifications
              </Typography>

              <Typography
                variant="body2"
                sx={{ color: "rgba(255,255,255,0.72)", mt: 0.4 }}
              >
                Review incoming orders and move them to preparation.
              </Typography>
            </Box>

            <IconButton
              onClick={() => setNotificationOpen(false)}
              aria-label="Close new order notifications"
              sx={{
                color: "#ffffff",
                bgcolor: "rgba(255,255,255,0.12)",
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, md: 2.5 }, bgcolor: "#f8fafc" }}>
          {notificationError && (
            <Alert
              severity="error"
              sx={{ mb: 2, borderRadius: 3, fontWeight: 800 }}
            >
              {notificationError}
            </Alert>
          )}

          {notificationLoading ? (
            <Paper
              elevation={0}
              sx={{
                py: 7,
                borderRadius: 4,
                display: "grid",
                placeItems: "center",
                bgcolor: "#ffffff",
              }}
            >
              <CircularProgress sx={{ color: "#2563eb" }} />
              <Typography sx={{ mt: 2, color: "#64748b", fontWeight: 800 }}>
                Loading new orders...
              </Typography>
            </Paper>
          ) : newOrders.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                borderRadius: 4,
                textAlign: "center",
                bgcolor: "#ffffff",
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
                <NotificationsIcon />
              </Avatar>

              <Typography
                variant="h6"
                sx={{ fontWeight: 950, color: "#0f172a" }}
              >
                No new orders found
              </Typography>

              <Typography sx={{ color: "#64748b", mt: 0.5 }}>
                You are all caught up.
              </Typography>
            </Paper>
          ) : isMobile ? (
            <Stack spacing={2}>
              {newOrders.map((order) => (
                <NewOrderCard key={order.id} order={order} />
              ))}
            </Stack>
          ) : (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                borderRadius: 4,
                border: "1px solid rgba(15, 23, 42, 0.08)",
                overflow: "hidden",
                boxShadow: "0 18px 55px rgba(15, 23, 42, 0.06)",
              }}
            >
              <Table sx={{ minWidth: 980 }}>
                <TableHead>
                  <TableRow
                    sx={{
                      bgcolor: "#f8fafc",
                      "& th": {
                        color: "#475569",
                        fontWeight: 950,
                        borderBottom: "1px solid #e2e8f0",
                        whiteSpace: "nowrap",
                      },
                    }}
                  >
                    <TableCell>Order Number</TableCell>
                    <TableCell>Customer Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Total Quantity</TableCell>
                    <TableCell>Total Price</TableCell>
                    <TableCell>Current Status</TableCell>
                    <TableCell>Created Date</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {newOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      hover
                      sx={{
                        "& td": {
                          borderBottom: "1px solid #f1f5f9",
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

                      <TableCell sx={{ color: "#64748b", maxWidth: 210 }}>
                        <Typography noWrap>
                          {order.customer_email || "N/A"}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ fontWeight: 900 }}>
                        {order.total_quantity || 0}
                      </TableCell>

                      <TableCell>
                        <Typography sx={{ color: "#16a34a", fontWeight: 950 }}>
                          {formatPrice(order.total_price)}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={order.display_status || order.status || "N/A"}
                          size="small"
                          color="warning"
                          sx={{ borderRadius: 2, fontWeight: 950 }}
                        />
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
                          onClick={() => moveToBeingPrepared(order.id)}
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
                          {updatingOrderId === order.id
                            ? "Updating..."
                            : "Move to Being Prepared"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AdminLayout;