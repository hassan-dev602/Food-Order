import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";

import axios from "axios";
import { useNavigate } from "react-router-dom";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/v1/",
  headers: {
    "Content-Type": "application/json",
  },
});

const INITIAL_FORM_DATA = {
  first_name: "",
  last_name: "",
  email: "",
  mobile: "",
  password: "",
  repeat_password: "",
};

const getRegistrationErrorMessage = (error) => {
  const data = error.response?.data;

  if (!data) {
    return "Unable to connect with the server. Please try again.";
  }

  if (data.phone_number) {
    return Array.isArray(data.phone_number)
      ? data.phone_number[0]
      : "This mobile number is already registered.";
  }

  if (data.email) {
    return Array.isArray(data.email)
      ? data.email[0]
      : "This email address is already registered.";
  }

  if (data.password) {
    return Array.isArray(data.password)
      ? data.password[0]
      : "Please choose a stronger password.";
  }

  if (data.password2) {
    return Array.isArray(data.password2)
      ? data.password2[0]
      : "Passwords do not match.";
  }

  if (data.detail) {
    return data.detail;
  }

  return "Registration failed. Please check your information.";
};

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

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

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((previous) => ({
        ...previous,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const mobilePattern = /^[+]?[\d\s()-]{7,20}$/;

    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required.";
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!emailPattern.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!formData.mobile.trim()) {
      newErrors.mobile = "Mobile number is required.";
    } else if (!mobilePattern.test(formData.mobile.trim())) {
      newErrors.mobile = "Please enter a valid mobile number.";
    }

    if (!formData.password) {
      newErrors.password = "Password is required.";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must contain at least 8 characters.";
    }

    if (!formData.repeat_password) {
      newErrors.repeat_password = "Please confirm your password.";
    } else if (formData.password !== formData.repeat_password) {
      newErrors.repeat_password = "Passwords do not match.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const buildRegisterPayload = () => ({
    first_name: formData.first_name.trim(),
    last_name: formData.last_name.trim(),
    email: formData.email.trim().toLowerCase(),
    phone_number: formData.mobile.trim(),
    password: formData.password,
    password2: formData.repeat_password,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      showSnackbar("Please correct the highlighted fields.", "error");
      return;
    }

    setLoading(true);

    try {
      await api.post("register/", buildRegisterPayload());

      setFormData(INITIAL_FORM_DATA);
      setErrors({});

      showSnackbar(
        "Account created successfully. Redirecting to login...",
        "success"
      );

      setTimeout(() => {
        navigate("/login");
      }, 1300);
    } catch (error) {
      showSnackbar(getRegistrationErrorMessage(error), "error");
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
      fontSize: "0.95rem",
      paddingRight: "12px",

      "&::placeholder": {
        opacity: 0.75,
        color: "#64748B",
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
        alignItems: "center",
        justifyContent: "center",

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
          width: 420,
          height: 420,
          borderRadius: "50%",
          top: -180,
          right: -120,
          background:
            "radial-gradient(circle, rgba(249,115,22,0.20) 0%, rgba(249,115,22,0) 70%)",
        },

        "&::after": {
          content: '""',
          position: "absolute",
          width: 420,
          height: 420,
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
          maxWidth: 1440,

          minHeight: {
            lg: 660,
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

          backgroundColor: "rgba(255,255,255,0.96)",
        }}
      >
        {/* Left image section */}
        <Box
          sx={{
            display: {
              xs: "none",
              lg: "flex",
            },

            width: {
              lg: "30%",
              xl: "32%",
            },

            flexShrink: 0,
            position: "relative",
            overflow: "hidden",
            p: 5,
            flexDirection: "column",
            justifyContent: "space-between",
            color: "#FFFFFF",

            backgroundImage:
              "linear-gradient(160deg, rgba(15,23,42,0.34), rgba(124,45,18,0.82)), url('/Foods.png')",

            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.42))",
            }}
          />

          <Box sx={{ position: "relative", zIndex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 46,
                  height: 46,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "14px",
                  backgroundColor: "rgba(255,255,255,0.16)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <PersonAddAlt1RoundedIcon />
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
                    color: "rgba(255,255,255,0.75)",
                    fontSize: "0.78rem",
                  }}
                >
                  Fresh food, delivered fast
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ position: "relative", zIndex: 1 }}>
            <Typography
              component="h2"
              sx={{
                maxWidth: 380,
                mb: 2,

                fontSize: {
                  lg: "2.3rem",
                  xl: "2.7rem",
                },

                lineHeight: 1.08,
                fontWeight: 900,
                letterSpacing: "-0.04em",
              }}
            >
              Delicious food is just a few clicks away.
            </Typography>

            <Typography
              sx={{
                maxWidth: 390,
                color: "rgba(255,255,255,0.78)",
                lineHeight: 1.75,
                fontSize: "0.95rem",
              }}
            >
              Create your account and discover your favourite meals from nearby
              restaurants.
            </Typography>

            <Stack spacing={1.5} mt={4}>
              {[
                "Quick and secure ordering",
                "Real-time delivery tracking",
                "Exclusive member offers",
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
                      fontSize: "0.9rem",
                      color: "rgba(255,255,255,0.9)",
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

        {/* Form section */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{
            width: {
              xs: "100%",
              lg: "70%",
              xl: "68%",
            },

            minWidth: 0,

            p: {
              xs: 2.5,
              sm: 4,
              md: 5,
              lg: 5,
              xl: 6,
            },

            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Stack spacing={{ xs: 2.5, sm: 3 }}>
            <Box>
              <Box
                sx={{
                  display: {
                    xs: "grid",
                    lg: "none",
                  },

                  width: 54,
                  height: 54,
                  mb: 2,
                  borderRadius: "16px",
                  placeItems: "center",
                  color: "#FFFFFF",

                  background:
                    "linear-gradient(135deg, #F97316 0%, #DC2626 100%)",

                  boxShadow: "0 12px 25px rgba(234,88,12,0.25)",
                }}
              >
                <PersonAddAlt1RoundedIcon sx={{ fontSize: 28 }} />
              </Box>

              <Typography
                component="h1"
                sx={{
                  color: "#0F172A",
                  fontWeight: 900,

                  fontSize: {
                    xs: "1.75rem",
                    sm: "2.15rem",
                  },

                  lineHeight: 1.15,
                  letterSpacing: "-0.035em",
                }}
              >
                Create your account
              </Typography>
            </Box>

            {/* Responsive input grid */}
            <Box
              sx={{
                width: "100%",
                display: "grid",

                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  md: "repeat(2, minmax(0, 1fr))",
                },

                columnGap: {
                  md: 2.5,
                  lg: 3,
                },

                rowGap: 2,
              }}
            >
              <TextField
                fullWidth
                required
                disabled={loading}
                name="first_name"
                label="First Name"
                placeholder="Enter first name"
                value={formData.first_name}
                onChange={handleChange}
                autoComplete="given-name"
                error={Boolean(errors.first_name)}
                helperText={errors.first_name || " "}
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
                fullWidth
                required
                disabled={loading}
                name="last_name"
                label="Last Name"
                placeholder="Enter last name"
                value={formData.last_name}
                onChange={handleChange}
                autoComplete="family-name"
                error={Boolean(errors.last_name)}
                helperText={errors.last_name || " "}
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
                fullWidth
                required
                disabled={loading}
                name="email"
                type="email"
                label="Email Address"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                error={Boolean(errors.email)}
                helperText={errors.email || " "}
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
                fullWidth
                required
                disabled={loading}
                name="mobile"
                label="Mobile Number"
                placeholder="+92 300 1234567"
                value={formData.mobile}
                onChange={handleChange}
                autoComplete="tel"
                error={Boolean(errors.mobile)}
                helperText={errors.mobile || " "}
                inputProps={{
                  inputMode: "tel",
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={commonTextFieldStyles}
              />

              <TextField
                fullWidth
                required
                disabled={loading}
                name="password"
                type={showPassword ? "text" : "password"}
                label="Password"
                placeholder="Minimum 8 characters"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
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

              <TextField
                fullWidth
                required
                disabled={loading}
                name="repeat_password"
                type={showRepeatPassword ? "text" : "password"}
                label="Confirm Password"
                placeholder="Enter password again"
                value={formData.repeat_password}
                onChange={handleChange}
                autoComplete="new-password"
                error={Boolean(errors.repeat_password)}
                helperText={errors.repeat_password || " "}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOpenRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),

                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        type="button"
                        edge="end"
                        disabled={loading}
                        aria-label={
                          showRepeatPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                        onClick={() =>
                          setShowRepeatPassword((previous) => !previous)
                        }
                      >
                        {showRepeatPassword ? (
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
                  color: "rgba(255,255,255,0.8)",

                  background:
                    "linear-gradient(135deg, #FDBA74 0%, #FCA5A5 100%)",
                },
              }}
            >
              {loading ? (
                <Stack direction="row" alignItems="center" spacing={1.2}>
                  <CircularProgress size={20} thickness={5} color="inherit" />
                  <span>Creating account...</span>
                </Stack>
              ) : (
                "Create Account"
              )}
            </Button>

            <Typography
              align="center"
              sx={{
                color: "#64748B",
                fontSize: "0.9rem",
              }}
            >
              Already have an account?{" "}
              <Box
                component="button"
                type="button"
                onClick={() => navigate("/login")}
                sx={{
                  p: 0,
                  border: 0,
                  cursor: "pointer",
                  backgroundColor: "transparent",
                  color: "#EA580C",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  fontWeight: 800,

                  "&:hover": {
                    textDecoration: "underline",
                  },
                }}
              >
                Sign in
              </Box>
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

export default Register;