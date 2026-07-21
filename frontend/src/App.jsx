import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Box } from "@mui/material";

import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Menu from "./pages/Menu";
import Track from "./pages/Track";
import Orders from "./pages/Orders";
import Wishlist from "./pages/Wishlist";
import Cart from "./pages/Cart";
import ProductDetailPage from "./pages/ProductDetailPage";
import PlaceOrder from "./pages/PlaceOrder";

import Login from "./auth/Login";
import Register from "./auth/Register";
import AdminLogin from "./auth/AdminLogin";
import ForgotPassword from "./auth/ForgotPassword";
import OTPVerification from "./auth/OTPVerification";
import PasswordReset from "./auth/PasswordReset";

import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";
import RequireResetEmail from "./components/RequireResetEmail";
import RequireVerifiedOTP from "./components/RequireVerifiedOTP";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminGuestRoute from "./components/AdminGuestRoute";

import AdminLayout from "./AdminPanel/AdminLayout";
import Dashboard from "./AdminPanel/Dashboard";
import RegisteredUsers from "./AdminPanel/RegisteredUsers";
import AddCategory from "./AdminPanel/AddCategory";
import ManageCategory from "./AdminPanel/ManageCategory";
import AddItem from "./AdminPanel/AddItem";
import ManageItem from "./AdminPanel/ManageItem";
import BeingPrepared from "./AdminPanel/BeingPrepared";
import FoodOnTheWay from "./AdminPanel/FoodOnTheWay";
import Delivered from "./AdminPanel/Delivered";
import Cancelled from "./AdminPanel/Cancelled";
import DailyReport from "./AdminPanel/DailyReport";
import MonthlyReport from "./AdminPanel/MonthlyReport";
import Search from "./AdminPanel/Search";
import ManageReviews from "./AdminPanel/ManageReviews";

const App = () => {
  const { pathname } = useLocation();

  // Hide the public Navbar on admin pages because the admin panel uses its own layout.
  const isAdminRoute =
    pathname === "/admin-login" ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      {!isAdminRoute && <Navbar />}

      <Box component="main" sx={{ minHeight: "100vh" }}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />

          {/* User protected routes */}
          <Route
            path="/menu"
            element={
              <ProtectedRoute>
                <Menu />
              </ProtectedRoute>
            }
          />

          <Route
            path="/track"
            element={
              <ProtectedRoute>
                <Track />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />

          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <Wishlist />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cart"
            element={
              <ProtectedRoute>
                <Cart />
              </ProtectedRoute>
            }
          />

          <Route
            path="/place-order"
            element={
              <ProtectedRoute>
                <PlaceOrder />
              </ProtectedRoute>
            }
          />

          {/* Guest-only authentication routes */}
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />

          <Route
            path="/register"
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            }
          />

          <Route
            path="/admin-login"
            element={
              <AdminGuestRoute>
                <AdminLogin />
              </AdminGuestRoute>
            }
          />

          {/* Password reset flow routes */}
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <ForgotPassword />
              </GuestRoute>
            }
          />

          <Route
            path="/otp-verification"
            element={
              <GuestRoute>
                <RequireResetEmail>
                  <OTPVerification />
                </RequireResetEmail>
              </GuestRoute>
            }
          />

          <Route
            path="/reset-password"
            element={
              <GuestRoute>
                <RequireVerifiedOTP>
                  <PasswordReset />
                </RequireVerifiedOTP>
              </GuestRoute>
            }
          />

          {/* Admin panel routes */}
          <Route
            path="/admin"
            element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="registered-users" element={<RegisteredUsers />} />
            <Route path="add-category" element={<AddCategory />} />
            <Route path="manage-category" element={<ManageCategory />} />
            <Route path="add-item" element={<AddItem />} />
            <Route path="manage-item" element={<ManageItem />} />
            <Route path="being-prepared" element={<BeingPrepared />} />
            <Route path="food-on-the-way" element={<FoodOnTheWay />} />
            <Route path="delivered" element={<Delivered />} />
            <Route path="cancelled" element={<Cancelled />} />
            <Route path="daily-report" element={<DailyReport />} />
            <Route path="monthly-report" element={<MonthlyReport />} />
            <Route path="search" element={<Search />} />
            <Route path="manage-reviews" element={<ManageReviews />} />
          </Route>
        </Routes>
      </Box>
    </Box>
  );
};

export default App;