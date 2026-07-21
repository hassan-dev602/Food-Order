import React, { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";

const GuestRoute = ({ children }) => {
  const { user } = useContext(AuthContext);

  // Guest pages should not be accessible after login.
  // Example: a logged-in user should not visit login or register again.
  if (user) {
    return <Navigate to="/" replace />;
  }

  return children || <Outlet />;
};

export default GuestRoute;