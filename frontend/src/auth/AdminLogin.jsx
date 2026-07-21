import React, { useEffect, useState } from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";

import { useNavigate } from "react-router-dom";

import { useAdminAuth } from "../context/AdminAuthContext";

const INITIAL_FORM_DATA = {
  username: "",
  password: "",
};

const INITIAL_ERRORS = {
  username: "",
  password: "",
};

const AdminLogin = () => {
  const navigate = useNavigate();

  const {
    adminLogin,
    isAdminAuthenticated,
    loading: authLoading,
  } = useAdminAuth();

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [errorText, setErrorText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && isAdminAuthenticated) {
      navigate("/admin", {
        replace: true,
      });
    }
  }, [authLoading, isAdminAuthenticated, navigate]);

  const isFormDisabled = authLoading || isSubmitting;

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((previousErrors) => ({
        ...previousErrors,
        [name]: "",
      }));
    }

    if (errorText) {
      setErrorText("");
    }
  };

  const validateForm = () => {
    const newErrors = {
      username: "",
      password: "",
    };

    if (!formData.username.trim()) {
      newErrors.username = "Username is required.";
    }

    if (!formData.password) {
      newErrors.password = "Password is required.";
    }

    setErrors(newErrors);

    return !newErrors.username && !newErrors.password;
  };

  const getAdminLoginError = (error) => {
    if (typeof error?.response?.data?.detail === "string") {
      return error.response.data.detail;
    }

    if (typeof error?.response?.data?.message === "string") {
      return error.response.data.message;
    }

    if (typeof error?.message === "string") {
      return error.message;
    }

    return "Unable to sign in. Please check your admin credentials.";
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setErrorText("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await adminLogin({
        username: formData.username.trim(),
        password: formData.password,
      });

      navigate("/admin", {
        replace: true,
      });
    } catch (error) {
      setErrorText(getAdminLoginError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const commonTextFieldStyles = {
    width: "100%",

    "& .MuiOutlinedInput-root": {
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
        boxShadow: "0 0 0 4px rgba(128, 0, 1, 0.10)",
      },

      "&.Mui-focused fieldset": {
        borderColor: "#800001",
      },

      "&.Mui-error.Mui-focused": {
        boxShadow: "0 0 0 4px rgba(211, 47, 47, 0.10)",
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
      color: "#800001",
    },

    "& .MuiInputAdornment-root": {
      color: "#64748B",
    },

    "& .MuiFormHelperText-root": {
      minHeight: "20px",
      marginLeft: "4px",
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
          "linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 48%, #FFF5F5 100%)",

        "&::before": {
          content: '""',
          position: "absolute",
          width: 480,
          height: 480,
          top: -240,
          right: -170,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(128,0,1,0.16) 0%, rgba(128,0,1,0) 70%)",
        },

        "&::after": {
          content: '""',
          position: "absolute",
          width: 440,
          height: 440,
          bottom: -220,
          left: -160,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(15,23,42,0.10) 0%, rgba(15,23,42,0) 70%)",
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

          backgroundColor: "rgba(255,255,255,0.98)",

          boxShadow:
            "0 32px 90px rgba(15,23,42,0.15), 0 8px 26px rgba(15,23,42,0.07)",
        }}
      >
        {/* Left admin visual section */}
        <Box
          sx={{
            display: {
              xs: "none",
              lg: "flex",
            },

            width: "44%",
            flexShrink: 0,
            position: "relative",
            overflow: "hidden",
            p: 5,
            flexDirection: "column",
            justifyContent: "space-between",
            color: "#FFFFFF",

            backgroundImage:
              "linear-gradient(145deg, rgba(15,23,42,0.90), rgba(128,0,1,0.88)), url('/Foods.png')",

            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(15,23,42,0.10), rgba(15,23,42,0.62))",
            }}
          />

          <Box
            sx={{
              position: "absolute",
              width: 300,
              height: 300,
              top: -150,
              right: -130,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          />

          <Box
            sx={{
              position: "absolute",
              width: 220,
              height: 220,
              bottom: -100,
              left: -90,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          />

          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{
              position: "relative",
              zIndex: 1,
            }}
          >
            <Box
              sx={{
                width: 50,
                height: 50,
                display: "grid",
                placeItems: "center",
                borderRadius: "15px",
                backgroundColor: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.20)",
                backdropFilter: "blur(14px)",
              }}
            >
              <AdminPanelSettingsRoundedIcon />
            </Box>

            <Box>
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: "1.15rem",
                  lineHeight: 1.2,
                }}
              >
                Administration Portal
              </Typography>

              <Typography
                sx={{
                  mt: 0.35,
                  color: "rgba(255,255,255,0.68)",
                  fontSize: "0.78rem",
                }}
              >
                Secure management access
              </Typography>
            </Box>
          </Stack>

          <Box
            sx={{
              position: "relative",
              zIndex: 1,
            }}
          >
            <Typography
              component="h2"
              sx={{
                maxWidth: 430,
                color: "#FFFFFF",
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: "-0.045em",

                fontSize: {
                  lg: "2.55rem",
                  xl: "2.9rem",
                },
              }}
            >
              Manage your food business from one secure dashboard.
            </Typography>

            <Typography
              sx={{
                mt: 2,
                maxWidth: 400,
                color: "rgba(255,255,255,0.72)",
                lineHeight: 1.75,
                fontSize: "0.94rem",
              }}
            >
              Access orders, products, customers, reports and reviews through
              the administration panel.
            </Typography>

            <Stack spacing={1.7} mt={4}>
              {[
                "Monitor and manage customer orders",
                "Update menu items and availability",
                "Review reports and customer feedback",
              ].map((item) => (
                <Stack
                  key={item}
                  direction="row"
                  spacing={1.2}
                  alignItems="center"
                >
                  <CheckCircleRoundedIcon
                    sx={{
                      color: "#FDA4AF",
                      fontSize: 20,
                    }}
                  />

                  <Typography
                    sx={{
                      color: "rgba(255,255,255,0.90)",
                      fontSize: "0.89rem",
                    }}
                  >
                    {item}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              position: "relative",
              zIndex: 1,
              color: "rgba(255,255,255,0.62)",
            }}
          >
            <SecurityRoundedIcon sx={{ fontSize: 17 }} />

            <Typography
              sx={{
                fontSize: "0.77rem",
              }}
            >
              Authorized administrators only
            </Typography>
          </Stack>
        </Box>

        {/* Admin login form */}
        <Box
          component="form"
          onSubmit={handleLogin}
          noValidate
          autoComplete="on"
          sx={{
            width: {
              xs: "100%",
              lg: "56%",
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

                  width: 58,
                  height: 58,
                  mb: 2,
                  placeItems: "center",
                  borderRadius: "17px",
                  color: "#FFFFFF",

                  background:
                    "linear-gradient(135deg, #800001 0%, #3F0000 100%)",

                  boxShadow: "0 14px 28px rgba(128,0,1,0.25)",
                }}
              >
                <AdminPanelSettingsRoundedIcon sx={{ fontSize: 31 }} />
              </Box>

              <Typography
                component="h1"
                sx={{
                  color: "#0F172A",
                  fontWeight: 900,
                  lineHeight: 1.12,
                  letterSpacing: "-0.04em",

                  fontSize: {
                    xs: "1.8rem",
                    sm: "2.25rem",
                  },
                }}
              >
                Admin login
              </Typography>

              <Typography
                sx={{
                  mt: 1,
                  color: "#64748B",
                  lineHeight: 1.65,

                  fontSize: {
                    xs: "0.87rem",
                    sm: "0.95rem",
                  },
                }}
              >
                Enter your administrator credentials to access the dashboard.
              </Typography>
            </Box>

            <Divider
              sx={{
                borderColor: "#E2E8F0",
              }}
            />

            {errorText && (
              <Alert
                severity="error"
                onClose={() => setErrorText("")}
                sx={{
                  borderRadius: "13px",
                  border: "1px solid rgba(211,47,47,0.18)",
                }}
              >
                {errorText}
              </Alert>
            )}

            {authLoading && (
              <Alert
                severity="info"
                icon={
                  <CircularProgress
                    size={18}
                    thickness={5}
                    sx={{
                      color: "inherit",
                    }}
                  />
                }
                sx={{
                  borderRadius: "13px",
                  border: "1px solid rgba(2,136,209,0.16)",
                }}
              >
                Checking your existing admin session...
              </Alert>
            )}

            <Stack spacing={2}>
              <TextField
                required
                fullWidth
                disabled={isFormDisabled}
                name="username"
                label="Admin Username"
                placeholder="Enter admin username"
                value={formData.username}
                onChange={handleChange}
                autoComplete="username"
                error={Boolean(errors.username)}
                helperText={errors.username || " "}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={commonTextFieldStyles}
              />

              <TextField
                required
                fullWidth
                disabled={isFormDisabled}
                name="password"
                label="Admin Password"
                placeholder="Enter admin password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
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
                        disabled={isFormDisabled}
                        aria-label={
                          showPassword
                            ? "Hide admin password"
                            : "Show admin password"
                        }
                        onClick={() => {
                          setShowPassword((previousValue) => !previousValue);
                        }}
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

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isFormDisabled}
              endIcon={
                !isSubmitting && !authLoading ? (
                  <ArrowForwardRoundedIcon fontSize="small" />
                ) : null
              }
              sx={{
                minHeight: 56,
                borderRadius: "14px",
                color: "#FFFFFF",
                fontWeight: 800,
                fontSize: "0.98rem",
                textTransform: "none",

                background:
                  "linear-gradient(135deg, #800001 0%, #4A0000 100%)",

                boxShadow: "0 14px 28px rgba(128,0,1,0.24)",
                transition: "all 0.25s ease",

                "&:hover": {
                  transform: "translateY(-2px)",

                  background:
                    "linear-gradient(135deg, #700001 0%, #300000 100%)",

                  boxShadow: "0 18px 34px rgba(128,0,1,0.32)",
                },

                "&.Mui-disabled": {
                  color: "rgba(255,255,255,0.80)",

                  background:
                    "linear-gradient(135deg, #C98E8E 0%, #A66F6F 100%)",
                },
              }}
            >
              {isSubmitting ? (
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <CircularProgress
                    size={20}
                    thickness={5}
                    color="inherit"
                  />

                  <span>Signing in...</span>
                </Stack>
              ) : authLoading ? (
                "Checking session..."
              ) : (
                "Access Admin Dashboard"
              )}
            </Button>

            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: "14px",
                border: "1px solid #E2E8F0",
                backgroundColor: "#F8FAFC",
              }}
            >
              <Stack direction="row" spacing={1.3} alignItems="flex-start">
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "11px",
                    color: "#800001",
                    backgroundColor: "#FFF1F2",
                  }}
                >
                  <DashboardRoundedIcon sx={{ fontSize: 20 }} />
                </Box>

                <Box>
                  <Typography
                    sx={{
                      color: "#334155",
                      fontWeight: 800,
                      fontSize: "0.84rem",
                    }}
                  >
                    Secure administration area
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.35,
                      color: "#64748B",
                      lineHeight: 1.55,
                      fontSize: "0.77rem",
                    }}
                  >
                    Login activity may be monitored for security and account
                    protection.
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
};

export default AdminLogin;