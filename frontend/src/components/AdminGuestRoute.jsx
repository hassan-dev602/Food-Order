import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";

import { useAdminAuth } from "../context/AdminAuthContext";

const AdminGuestRoute = ({ children }) => {
  const { isAdminAuthenticated, loading } = useAdminAuth();

  // Wait until admin auth is restored before deciding whether to redirect.
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

  if (isAdminAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  return children || <Outlet />;
};

export default AdminGuestRoute;