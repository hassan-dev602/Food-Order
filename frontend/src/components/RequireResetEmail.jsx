import React, { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";

const RequireResetEmail = ({ children }) => {
  const { resetEmail } = useContext(AuthContext);
  const location = useLocation();

  // Password reset steps require an email from the forgot-password flow.
  // If the user opens this page directly, send them back to request an OTP first.
  if (!resetEmail) {
    return (
      <Navigate
        to="/forgot-password"
        replace
        state={{ from: location }}
      />
    );
  }

  return children || <Outlet />;
};

export default RequireResetEmail;