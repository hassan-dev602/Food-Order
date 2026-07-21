import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";

import axios from "axios";
import { Link as RouterLink, useNavigate } from "react-router-dom";

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

const getLoginErrorMessage = (error) => {
  const data = error.response?.data;

  if (!data) {
    return "Unable to connect with the server. Please try again.";
  }

  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  if (Array.isArray(data.non_field_errors)) {
    return data.non_field_errors[0];
  }

  if (typeof data.non_field_errors === "string") {
    return data.non_field_errors;
  }

  if (Array.isArray(data.login)) {
    return data.login[0];
  }

  if (typeof data.login === "string") {
    return data.login;
  }

  if (Array.isArray(data.password)) {
    return data.password[0];
  }

  if (typeof data.password === "string") {
    return data.password;
  }

  return "Login failed. Please check your credentials.";
};

const Login = () => {
  const navigate = useNavigate();
  const redirectTimerRef = useRef(null);

  const { login: loginContext } = useContext(AuthContext);

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
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

  const handleSnackbarClose = (_, reason) => {
    if (reason === "clickaway") return;

    setSnackbar((previous) => ({
      ...previous,
      open: false,
    }));
  };

  const handleIdentifierChange = (event) => {
    setLoginIdentifier(event.target.value);

    if (errors.loginIdentifier) {
      setErrors((previous) => ({
        ...previous,
        loginIdentifier: "",
      }));
    }
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);

    if (errors.password) {
      setErrors((previous) => ({
        ...previous,
        password: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!loginIdentifier.trim()) {
      newErrors.loginIdentifier = "Email or mobile number is required.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      showSnackbar("Please complete the required fields.", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("login/", {
        login: loginIdentifier.trim(),
        password,
      });

      loginContext({
        full_name: response.data.full_name,
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
      });

      showSnackbar(
        `Welcome back, ${response.data.full_name || "User"}!`,
        "success"
      );

      redirectTimerRef.current = setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (error) {
      showSnackbar(getLoginErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };

  const commonTextFieldStyles = {
    width: "100%",

    "& .MuiOutlinedInput-root": {
      width: "100%",
      minHeight: 58,
      borderRadius: "14px",
      backgroundColor: "#F8FAFC",
      transition: "all 0.25s ease",

      "& fieldset": {
        borderColor: "#E2E8F0",
      },

      "&:hover fieldset": {
        borderColor: "#94A3B8",
      },

      "&.Mui-focused": {
        backgroundColor: "#FFFFFF",
        boxShadow: "0 0 0 4px rgba(234, 88, 12, 0.10)",
      },

      "&.Mui-focused fieldset": {
        borderColor: "#EA580C",
      },
    },

    "& .MuiInputBase-input": {
      fontSize: "0.96rem",

      "&::placeholder": {
        color: "#64748B",
        opacity: 0.75,
      },
    },

    "& .MuiInputLabel-root.Mui-focused": {
      color: "#EA580C",
    },

    "& .MuiInputAdornment-root": {
      color: "#64748B",
    },

    "& .MuiFormHelperText-root": {
      marginLeft: "4px",
      minHeight: "20px",
    },
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",

        px: {
          xs: 1.5,
          sm: 3,
          md: 4,
        },

        py: {
          xs: 2,
          sm: 4,
          md: 5,
        },

        background:
          "linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 48%, #FFF1F2 100%)",

        "&::before": {
          content: '""',
          position: "absolute",
          width: 430,
          height: 430,
          borderRadius: "50%",
          top: -190,
          right: -130,
          background:
            "radial-gradient(circle, rgba(249,115,22,0.20) 0%, rgba(249,115,22,0) 70%)",
        },

        "&::after": {
          content: '""',
          position: "absolute",
          width: 430,
          height: 430,
          borderRadius: "50%",
          bottom: -220,
          left: -150,
          background:
            "radial-gradient(circle, rgba(239,68,68,0.14) 0%, rgba(239,68,68,0) 70%)",
        },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 1180,

          minHeight: {
            lg: 650,
          },

          display: "flex",
          overflow: "hidden",

          borderRadius: {
            xs: "22px",
            sm: "30px",
          },

          border: "1px solid rgba(226,232,240,0.9)",

          boxShadow:
            "0 30px 80px rgba(15,23,42,0.14), 0 8px 24px rgba(15,23,42,0.08)",

          backgroundColor: "rgba(255,255,255,0.97)",
        }}
      >
        {/* Left image area */}
        <Box
          sx={{
            display: {
              xs: "none",
              lg: "flex",
            },

            width: {
              lg: "42%",
            },

            flexShrink: 0,
            position: "relative",
            overflow: "hidden",
            p: 5,
            flexDirection: "column",
            justifyContent: "space-between",
            color: "#FFFFFF",

            backgroundImage:
              "linear-gradient(160deg, rgba(15,23,42,0.30), rgba(124,45,18,0.84)), url('/Foods.png')",

            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.46))",
            }}
          />

          <Box sx={{ position: "relative", zIndex: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "14px",
                  display: "grid",
                  placeItems: "center",
                  backgroundColor: "rgba(255,255,255,0.16)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <LoginRoundedIcon />
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: "1.15rem",
                    lineHeight: 1.2,
                  }}
                >
                  Food Delivery
                </Typography>

                <Typography
                  sx={{
                    mt: 0.4,
                    color: "rgba(255,255,255,0.75)",
                    fontSize: "0.78rem",
                  }}
                >
                  Fresh meals, delivered quickly
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ position: "relative", zIndex: 1 }}>
            <Typography
              component="h2"
              sx={{
                maxWidth: 400,
                mb: 2,
                fontSize: {
                  lg: "2.5rem",
                  xl: "2.85rem",
                },
                lineHeight: 1.08,
                fontWeight: 900,
                letterSpacing: "-0.04em",
              }}
            >
              Welcome back to your favourite meals.
            </Typography>

            <Typography
              sx={{
                maxWidth: 390,
                color: "rgba(255,255,255,0.78)",
                lineHeight: 1.75,
                fontSize: "0.95rem",
              }}
            >
              Sign in to manage your orders, track deliveries and discover
              delicious food near you.
            </Typography>

            <Stack spacing={1.6} mt={4}>
              {[
                "Order your favourite meals",
                "Track deliveries in real time",
                "Manage your account securely",
              ].map((item) => (
                <Stack
                  key={item}
                  direction="row"
                  spacing={1.2}
                  alignItems="center"
                >
                  <CheckCircleRoundedIcon
                    sx={{
                      fontSize: 20,
                      color: "#FDBA74",
                    }}
                  />

                  <Typography
                    sx={{
                      color: "rgba(255,255,255,0.9)",
                      fontSize: "0.9rem",
                    }}
                  >
                    {item}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

          <Typography
            sx={{
              position: "relative",
              zIndex: 1,
              color: "rgba(255,255,255,0.62)",
              fontSize: "0.78rem",
            }}
          >
            Fast delivery. Fresh taste. Better experience.
          </Typography>
        </Box>

        {/* Login form */}
        <Box
          component="form"
          onSubmit={handleLogin}
          noValidate
          autoComplete="off"
          sx={{
            width: {
              xs: "100%",
              lg: "58%",
            },

            minWidth: 0,

            p: {
              xs: 2.5,
              sm: 4,
              md: 6,
              lg: 7,
            },

            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Stack
            spacing={{
              xs: 2.5,
              sm: 3,
            }}
          >
            <Box>
              <Box
                sx={{
                  display: {
                    xs: "grid",
                    lg: "none",
                  },

                  width: 56,
                  height: 56,
                  mb: 2,
                  borderRadius: "16px",
                  placeItems: "center",
                  color: "#FFFFFF",

                  background:
                    "linear-gradient(135deg, #F97316 0%, #DC2626 100%)",

                  boxShadow: "0 12px 25px rgba(234,88,12,0.25)",
                }}
              >
                <PersonRoundedIcon sx={{ fontSize: 29 }} />
              </Box>

              <Typography
                component="h1"
                sx={{
                  color: "#0F172A",
                  fontWeight: 900,

                  fontSize: {
                    xs: "1.8rem",
                    sm: "2.25rem",
                  },

                  lineHeight: 1.15,
                  letterSpacing: "-0.035em",
                }}
              >
                Welcome back
              </Typography>

              <Typography
                sx={{
                  mt: 1,
                  color: "#64748B",
                  fontSize: {
                    xs: "0.88rem",
                    sm: "0.96rem",
                  },
                }}
              >
                Enter your account details to continue.
              </Typography>
            </Box>

            <Stack spacing={2}>
              <TextField
                required
                fullWidth
                disabled={loading}
                label="Email or Mobile Number"
                placeholder="Enter email or mobile number"
                value={loginIdentifier}
                onChange={handleIdentifierChange}
                autoComplete="username"
                error={Boolean(errors.loginIdentifier)}
                helperText={errors.loginIdentifier || " "}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={commonTextFieldStyles}
              />

              <TextField
                required
                fullWidth
                disabled={loading}
                label="Password"
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={handlePasswordChange}
                autoComplete="current-password"
                error={Boolean(errors.password)}
                helperText={errors.password || " "}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),

                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        type="button"
                        edge="end"
                        disabled={loading}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onClick={() =>
                          setShowPassword((previous) => !previous)
                        }
                      >
                        {showPassword ? (
                          <VisibilityOffRoundedIcon />
                        ) : (
                          <VisibilityRoundedIcon />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={commonTextFieldStyles}
              />
            </Stack>

            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                mt: "-8px !important",
              }}
            >
              <MuiLink
                component={RouterLink}
                to="/forgot-password"
                underline="hover"
                sx={{
                  color: "#EA580C",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                }}
              >
                Forgot Password?
              </MuiLink>
            </Box>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              endIcon={
                !loading ? <ArrowForwardRoundedIcon fontSize="small" /> : null
              }
              sx={{
                minHeight: 56,
                borderRadius: "14px",
                fontWeight: 800,
                fontSize: "0.98rem",
                textTransform: "none",

                background:
                  "linear-gradient(135deg, #F97316 0%, #DC2626 100%)",

                boxShadow: "0 12px 24px rgba(234,88,12,0.24)",
                transition: "all 0.25s ease",

                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 16px 30px rgba(234,88,12,0.32)",

                  background:
                    "linear-gradient(135deg, #EA580C 0%, #B91C1C 100%)",
                },

                "&.Mui-disabled": {
                  color: "rgba(255,255,255,0.82)",

                  background:
                    "linear-gradient(135deg, #FDBA74 0%, #FCA5A5 100%)",
                },
              }}
            >
              {loading ? (
                <Stack direction="row" alignItems="center" spacing={1.2}>
                  <CircularProgress size={20} thickness={5} color="inherit" />
                  <span>Signing in...</span>
                </Stack>
              ) : (
                "Login"
              )}
            </Button>

            <Typography
              align="center"
              sx={{
                color: "#64748B",
                fontSize: "0.9rem",
              }}
            >
              Don&apos;t have an account?{" "}
              <MuiLink
                component={RouterLink}
                to="/register"
                underline="hover"
                sx={{
                  color: "#EA580C",
                  fontWeight: 800,
                }}
              >
                Create account
              </MuiLink>
            </Typography>
          </Stack>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4500}
        onClose={handleSnackbarClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <Alert
          variant="filled"
          severity={snackbar.severity}
          onClose={handleSnackbarClose}
          sx={{
            width: "100%",

            minWidth: {
              sm: 360,
            },

            borderRadius: "12px",
            boxShadow: "0 12px 30px rgba(15,23,42,0.18)",
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Login;