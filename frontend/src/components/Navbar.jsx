import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  AppBar,
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  AccountCircle,
  AdminPanelSettings,
  Favorite,
  Home,
  Login,
  Menu as MenuIcon,
  Restaurant,
  ShoppingCart,
  TrackChanges,
} from "@mui/icons-material";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";
import { getWishlistItems } from "../utils/wishlist";

const CART_STORAGE_KEY = "cartItems";
const WISHLIST_UPDATED_EVENT = "wishlistUpdated";
const CART_UPDATED_EVENT = "cartUpdated";

const getStoredCartCount = () => {
  try {
    const storedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));

    if (!Array.isArray(storedCart)) {
      return 0;
    }

    return storedCart.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );
  } catch (error) {
    return 0;
  }
};

const getFirstName = (fullName = "") => {
  return fullName.trim().split(" ")[0] || "User";
};

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { user, logout } = useContext(AuthContext);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);

  const syncWishlistCount = useCallback(() => {
    setWishlistCount(getWishlistItems().length);
  }, []);

  const syncCartCount = useCallback(() => {
    setCartCount(getStoredCartCount());
  }, []);

  useEffect(() => {
    syncWishlistCount();
    syncCartCount();

    // These custom events keep navbar badges updated after localStorage changes.
    window.addEventListener(WISHLIST_UPDATED_EVENT, syncWishlistCount);
    window.addEventListener(CART_UPDATED_EVENT, syncCartCount);
    window.addEventListener("storage", syncWishlistCount);
    window.addEventListener("storage", syncCartCount);

    return () => {
      window.removeEventListener(WISHLIST_UPDATED_EVENT, syncWishlistCount);
      window.removeEventListener(CART_UPDATED_EVENT, syncCartCount);
      window.removeEventListener("storage", syncWishlistCount);
      window.removeEventListener("storage", syncCartCount);
    };
  }, [syncWishlistCount, syncCartCount]);

  const menuItems = useMemo(() => {
    if (user) {
      return [
        { text: "Home", icon: <Home />, path: "/" },
        { text: "Menu", icon: <Restaurant />, path: "/menu" },
        { text: "Track", icon: <TrackChanges />, path: "/track" },
        { text: "My Orders", icon: <ShoppingCart />, path: "/orders" },
        { text: "Cart", icon: <ShoppingCart />, path: "/cart", badge: cartCount },
        {
          text: "Wishlist",
          icon: <Favorite />,
          path: "/wishlist",
          badge: wishlistCount,
        },
      ];
    }

    return [
      { text: "Home", icon: <Home />, path: "/" },
      { text: "Register", icon: <AccountCircle />, path: "/register" },
      { text: "Login", icon: <Login />, path: "/login" },
      { text: "Admin", icon: <AdminPanelSettings />, path: "/admin-login" },
    ];
  }, [user, cartCount, wishlistCount]);

  const toggleDrawer = () => {
    setDrawerOpen((previousValue) => !previousValue);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const handleLogout = () => {
    setLogoutLoading(true);

    logout();
    closeDrawer();
    navigate("/", { replace: true });

    setLogoutLoading(false);
  };

  const renderMenuIcon = (item) => {
    if (item.badge === undefined) {
      return item.icon;
    }

    return (
      <Badge badgeContent={item.badge} color="error">
        {item.icon}
      </Badge>
    );
  };

  const isActivePath = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname.startsWith(path);
  };

  const renderDesktopMenu = () => {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {menuItems.map((item) => {
          const isActive = isActivePath(item.path);

          return (
            <Button
              key={item.path}
              component={RouterLink}
              to={item.path}
              startIcon={renderMenuIcon(item)}
              sx={{
                color: "#fff",
                px: 1.5,
                py: 1,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 700,
                backgroundColor: isActive ? "#ff9800" : "transparent",
                "&:hover": {
                  backgroundColor: isActive
                    ? "#fb8c00"
                    : "rgba(255,255,255,0.12)",
                },
              }}
            >
              {item.text}
            </Button>
          );
        })}

        {user && (
          <Button
            variant="contained"
            color="error"
            onClick={handleLogout}
            disabled={logoutLoading}
            sx={{
              ml: 1,
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            {logoutLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Logout"
            )}
          </Button>
        )}
      </Box>
    );
  };

  const renderMobileDrawer = () => {
    return (
      <Drawer anchor="left" open={drawerOpen} onClose={closeDrawer}>
        <Box sx={{ width: 280 }} role="presentation">
          <Box
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 1,
              backgroundColor: "#111827",
              color: "#fff",
            }}
          >
            <Restaurant />
            <Box>
              <Typography sx={{ fontWeight: 800 }}>Food Order</Typography>
              {user && (
                <Typography variant="body2" sx={{ color: "#ffd54f" }}>
                  Welcome, {getFirstName(user.full_name)}
                </Typography>
              )}
            </Box>
          </Box>

          <List>
            {menuItems.map((item) => {
              const isActive = isActivePath(item.path);

              return (
                <React.Fragment key={item.path}>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => {
                        navigate(item.path);
                        closeDrawer();
                      }}
                      sx={{
                        backgroundColor: isActive ? "#ff9800" : "transparent",
                        color: isActive ? "#fff" : "inherit",
                        "&:hover": {
                          backgroundColor: isActive ? "#fb8c00" : "#fff3e0",
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color: isActive ? "#fff" : "inherit",
                          minWidth: 42,
                        }}
                      >
                        {renderMenuIcon(item)}
                      </ListItemIcon>

                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{
                          fontWeight: isActive ? 800 : 500,
                        }}
                      />
                    </ListItemButton>
                  </ListItem>

                  <Divider />
                </React.Fragment>
              );
            })}

            {user && (
              <ListItem sx={{ p: 2 }}>
                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  onClick={handleLogout}
                  disabled={logoutLoading}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                  }}
                >
                  {logoutLoading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    "Logout"
                  )}
                </Button>
              </ListItem>
            )}
          </List>
        </Box>
      </Drawer>
    );
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        backgroundColor: "#000",
        width: "100%",
      }}
    >
      <Toolbar
        sx={{
          minHeight: 68,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: { xs: 2, sm: 3 },
          gap: 2,
        }}
      >
        <Button
          component={RouterLink}
          to="/"
          startIcon={<Restaurant />}
          sx={{
            color: "#fff",
            textTransform: "none",
            minWidth: 0,
            px: 0,
            "&:hover": {
              backgroundColor: "transparent",
            },
          }}
        >
          <Box sx={{ textAlign: "left" }}>
            <Typography
              variant="h6"
              sx={{
                color: "#fff",
                fontWeight: 800,
                lineHeight: 1.1,
              }}
            >
              Food Order
            </Typography>

            {user && !isMobile && (
              <Typography
                variant="body2"
                sx={{
                  color: "#ffd54f",
                  fontWeight: 600,
                  lineHeight: 1.2,
                }}
              >
                Welcome, {getFirstName(user.full_name)} 👋
              </Typography>
            )}
          </Box>
        </Button>

        {isMobile ? (
          <IconButton
            color="inherit"
            onClick={toggleDrawer}
            aria-label="Open navigation menu"
          >
            <MenuIcon />
          </IconButton>
        ) : (
          renderDesktopMenu()
        )}

        {renderMobileDrawer()}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;