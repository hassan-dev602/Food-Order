import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";

import { useAdminAuth } from "../context/AdminAuthContext";

const AdminProtectedRoute = ({ children }) => {
  const { isAdminAuthenticated, loading } = useAdminAuth();
  const location = useLocation();

  // Wait for admin auth restoration before redirecting.
  // This prevents redirecting a valid admin before localStorage/session checks finish.
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children || <Outlet />;
};

export default AdminProtectedRoute;