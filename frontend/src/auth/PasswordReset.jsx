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
import LockIcon from "@mui/icons-material/Lock";
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

const getApiErrorMessage = (error, fallbackMessage) => {
  const data = error.response?.data;

  if (!data) return fallbackMessage;

  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.non_field_errors)) return data.non_field_errors[0];
  if (typeof data.non_field_errors === "string") return data.non_field_errors;

  if (Array.isArray(data.new_password)) return data.new_password[0];
  if (typeof data.new_password === "string") return data.new_password;

  if (Array.isArray(data.confirm_password)) return data.confirm_password[0];
  if (typeof data.confirm_password === "string") return data.confirm_password;

  if (Array.isArray(data.email)) return data.email[0];
  if (typeof data.email === "string") return data.email;

  return fallbackMessage;
};

const PasswordReset = () => {
  const navigate = useNavigate();
  const redirectTimerRef = useRef(null);

  const { resetEmail, clearResetFlow } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
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

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!resetEmail) {
      return "Password reset session expired. Please request a new OTP.";
    }

    if (!formData.newPassword || !formData.confirmPassword) {
      return "Please fill all fields.";
    }

    if (formData.newPassword !== formData.confirmPassword) {
      return "New password and confirm password do not match.";
    }

    if (formData.newPassword.length < 8) {
      return "Password must be at least 8 characters.";
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      showSnackbar(validationError, "error");
      return;
    }

    setLoading(true);

    try {
      await api.post("set-new-password/", {
        email: resetEmail,
        new_password: formData.newPassword,
        confirm_password: formData.confirmPassword,
      });

      showSnackbar("Password reset successfully. Redirecting to login...", "success");

      // Clear reset-only session data after the backend confirms success.
      clearResetFlow();

      redirectTimerRef.current = setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1000);
    } catch (error) {
      showSnackbar(
        getApiErrorMessage(error, "Failed to reset password."),
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
        autoComplete="off"
        noValidate
        onSubmit={handleSubmit}
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
              Reset Your Password
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ maxWidth: 420 }}
            >
              Enter a new password for your account. Make sure it is strong and
              easy for you to remember.
            </Typography>
          </Stack>

          {!resetEmail && (
            <Alert severity="warning">
              Your password reset session is missing or expired. Please request
              a new OTP before setting a new password.
            </Alert>
          )}

          <TextField
            required
            fullWidth
            disabled={loading}
            name="newPassword"
            label="New Password"
            placeholder="Enter new password"
            type="password"
            value={formData.newPassword}
            onChange={handleChange}
            autoComplete="new-password"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="primary" />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
              },
            }}
          />

          <TextField
            required
            fullWidth
            disabled={loading}
            name="confirmPassword"
            label="Confirm New Password"
            placeholder="Confirm new password"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
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
                Reset Password
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

export default PasswordReset;