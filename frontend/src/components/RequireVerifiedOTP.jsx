import React, { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";

const RequireVerifiedOTP = ({ children }) => {
  const { resetEmail, otpVerified } = useContext(AuthContext);
  const location = useLocation();

  // The new-password page should only be accessible after email + OTP verification.
  if (!resetEmail || !otpVerified) {
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

export default RequireVerifiedOTP;