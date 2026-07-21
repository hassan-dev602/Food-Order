import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/v1/",
  headers: {
    "Content-Type": "application/json",
  },
});

const INITIAL_SNACKBAR = {
  open: false,
  message: "",
  severity: "success",
};

const OTP_LENGTH = 6;

const getApiErrorMessage = (error, fallbackMessage) => {
  const data = error.response?.data;

  if (!data) return fallbackMessage;

  if (typeof data.detail === "string") return data.detail;

  if (Array.isArray(data.otp)) return data.otp[0];
  if (typeof data.otp === "string") return data.otp;

  if (Array.isArray(data.email)) return data.email[0];
  if (typeof data.email === "string") return data.email;

  if (Array.isArray(data.non_field_errors)) return data.non_field_errors[0];
  if (typeof data.non_field_errors === "string") return data.non_field_errors;

  return fallbackMessage;
};

const OTPVerification = () => {
  const navigate = useNavigate();
  const redirectTimerRef = useRef(null);

  const { resetEmail, setOtpVerified } = useContext(AuthContext);

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState(INITIAL_SNACKBAR);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleSnackbarClose = () => {
    setSnackbar((previousSnackbar) => ({
      ...previousSnackbar,
      open: false,
    }));
  };

  const handleOtpChange = (event) => {
    const onlyDigits = event.target.value.replace(/\D/g, "");

    setOtp(onlyDigits.slice(0, OTP_LENGTH));
  };

  const validateOtpForm = () => {
    if (!resetEmail) {
      return "Password reset session expired. Please request a new OTP.";
    }

    if (!otp.trim()) {
      return "Please enter OTP.";
    }

    if (otp.length !== OTP_LENGTH) {
      return `OTP must be ${OTP_LENGTH} digits.`;
    }

    return null;
  };

  const handleVerify = async (event) => {
    event.preventDefault();

    const validationError = validateOtpForm();

    if (validationError) {
      showSnackbar(validationError, "error");
      return;
    }

    setLoading(true);

    try {
      await api.post("otp-verify/", {
        email: resetEmail,
        otp: Number(otp),
      });

      setOtpVerified(true);

      showSnackbar("OTP verified successfully. Redirecting...", "success");

      redirectTimerRef.current = setTimeout(() => {
        navigate("/reset-password", { replace: true });
      }, 1000);
    } catch (error) {
      showSnackbar(
        getApiErrorMessage(error, "OTP verification failed."),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        px: { xs: 2, sm: 3 },
        py: { xs: 4, md: 6 },
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundImage:
          "linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url(/Foods.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Paper
        component="form"
        elevation={12}
        onSubmit={handleVerify}
        noValidate
        sx={{
          width: "100%",
          maxWidth: 560,
          p: { xs: 3, sm: 4 },
          borderRadius: { xs: 3, sm: 5 },
          bgcolor: "background.paper",
        }}
      >
        <Stack spacing={3}>
          <Stack alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                bgcolor: "primary.light",
                color: "primary.contrastText",
              }}
            >
              <LockOpenIcon sx={{ fontSize: 36 }} />
            </Box>

            <Typography
              variant="h4"
              component="h1"
              align="center"
              sx={{
                fontWeight: 800,
                fontSize: { xs: "1.75rem", sm: "2.125rem" },
              }}
            >
              Verify OTP
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ maxWidth: 430 }}
            >
              Enter the verification code sent to{" "}
              <Box component="span" sx={{ fontWeight: 700 }}>
                {resetEmail || "your email"}
              </Box>
              .
            </Typography>
          </Stack>

          {!resetEmail && (
            <Alert severity="warning">
              Your password reset session is missing or expired. Please request
              a new OTP before continuing.
            </Alert>
          )}

          <TextField
            required
            fullWidth
            disabled={loading}
            name="otp"
            label="OTP Code"
            placeholder="Enter 6-digit OTP"
            type="text"
            value={otp}
            onChange={handleOtpChange}
            autoComplete="one-time-code"
            inputProps={{
              maxLength: OTP_LENGTH,
              inputMode: "numeric",
              pattern: "[0-9]*",
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOpenIcon color="primary" />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
              },
            }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{
              py: 1.4,
              borderRadius: 3,
              fontWeight: 700,
              textTransform: "none",
              fontSize: "1rem",
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              <>
                <CheckCircleIcon sx={{ mr: 1 }} />
                Verify OTP
              </>
            )}
          </Button>
        </Stack>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={handleSnackbarClose}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OTPVerification;