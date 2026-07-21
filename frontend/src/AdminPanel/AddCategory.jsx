import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  Category as CategoryIcon,
  Description as DescriptionIcon,
  RestaurantMenu as RestaurantMenuIcon,
} from "@mui/icons-material";

const API_BASE_URL = "http://127.0.0.1:8000";
const CATEGORY_API_URL = `${API_BASE_URL}/api/v1/food-categories/`;

const INITIAL_FORM_DATA = {
  name: "",
  description: "",
  is_active: true,
};

const normalizeToken = (rawToken) => {
  if (!rawToken) return "";

  let token = String(rawToken).trim();

  try {
    const parsedToken = JSON.parse(token);

    if (typeof parsedToken === "string") {
      token = parsedToken.trim();
    }
  } catch (error) {
    // Token is already a plain string, so JSON parsing is not required.
  }

  return token.replace(/^Bearer\s+/i, "").trim();
};

const getAdminToken = () => {
  return normalizeToken(localStorage.getItem("admin_access_token"));
};

const extractApiErrorMessage = (
  data,
  fallbackMessage = "Failed to create category."
) => {
  if (!data) return fallbackMessage;

  if (typeof data === "string") return data;
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.message === "string") return data.message;

  if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
    return data.non_field_errors[0];
  }

  const firstKey = Object.keys(data)[0];

  if (!firstKey) return fallbackMessage;

  const firstValue = data[firstKey];

  if (Array.isArray(firstValue) && firstValue.length > 0) {
    return String(firstValue[0]);
  }

  if (typeof firstValue === "string") {
    return firstValue;
  }

  return fallbackMessage;
};

const AddCategory = () => {
  const abortControllerRef = useRef(null);

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const clearMessages = () => {
    setSuccess("");
    setError("");
  };

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateForm = () => {
    if (!getAdminToken()) {
      return "Admin token is missing. Please log in again.";
    }

    if (!formData.name.trim()) {
      return "Category name is required.";
    }

    return null;
  };

  const buildPayload = () => {
    return {
      name: formData.name.trim(),
      description: formData.description.trim(),
      is_active: formData.is_active,
    };
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM_DATA);
    clearMessages();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    clearMessages();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const token = getAdminToken();

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);

    try {
      const response = await fetch(CATEGORY_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload()),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);

      if (response.status === 401 || response.status === 403) {
        throw new Error("Session expired or access denied. Please log in again.");
      }

      if (!response.ok) {
        throw new Error(extractApiErrorMessage(data));
      }

      setSuccess("Category created successfully.");
      setFormData(INITIAL_FORM_DATA);
    } catch (requestError) {
      if (requestError.name !== "AbortError") {
        setError(requestError.message || "Failed to create category.");
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(37,99,235,0.10), transparent 32%), linear-gradient(180deg, #f8fafc 0%, #ffffff 52%, #f8fafc 100%)",
        p: { xs: 1.5, sm: 2.5, md: 3 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: { xs: 3, md: 5 },
          p: { xs: 2, sm: 3, md: 4 },
          mb: 3,
          border: "1px solid rgba(255,255,255,0.25)",
          background:
            "linear-gradient(135deg, #020617 0%, #1e3a8a 58%, #2563eb 100%)",
          color: "#ffffff",
          boxShadow: "0 24px 70px rgba(15, 23, 42, 0.20)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.10)",
            right: -90,
            top: -110,
          }}
        />

        <Box
          sx={{
            position: "absolute",
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: "rgba(56,189,248,0.18)",
            left: -50,
            bottom: -70,
          }}
        />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{ position: "relative", zIndex: 1 }}
        >
          <Box
            sx={{
              width: { xs: 52, sm: 58 },
              height: { xs: 52, sm: 58 },
              borderRadius: 4,
              bgcolor: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
            }}
          >
            <CategoryIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />
          </Box>

          <Box>
            <Typography
              component="h1"
              sx={{
                fontWeight: 900,
                letterSpacing: "-0.04em",
                fontSize: { xs: "2rem", sm: "2.45rem", md: "3rem" },
                lineHeight: 1.05,
              }}
            >
              Add Category
            </Typography>

            <Typography
              sx={{
                mt: 1,
                color: "rgba(255,255,255,0.78)",
                maxWidth: 620,
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              Create a menu category that can be used to organize food items in
              the admin panel and customer menu.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Card
        elevation={0}
        sx={{
          maxWidth: 780,
          mx: "auto",
          borderRadius: { xs: 3, md: 5 },
          border: "1px solid #e5e7eb",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 22px 60px rgba(15, 23, 42, 0.10)",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            height: 7,
            background: "linear-gradient(90deg, #2563eb, #38bdf8, #22c55e)",
          }}
        />

        <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Stack spacing={0.8} sx={{ mb: 3 }}>
            <Typography
              sx={{
                fontWeight: 900,
                color: "#0f172a",
                fontSize: { xs: "1.35rem", sm: "1.55rem" },
              }}
            >
              Category Details
            </Typography>

            <Typography
              sx={{
                color: "#64748b",
                fontSize: { xs: "0.9rem", sm: "0.95rem" },
              }}
            >
              Add a category name, optional description, and visibility status.
            </Typography>
          </Stack>

          {success && (
            <Alert
              severity="success"
              sx={{
                mb: 2.5,
                borderRadius: 3,
                border: "1px solid #bbf7d0",
              }}
            >
              {success}
            </Alert>
          )}

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 2.5,
                borderRadius: 3,
                border: "1px solid #fecaca",
              }}
            >
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="Category Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                fullWidth
                required
                disabled={loading}
                autoComplete="off"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <RestaurantMenuIcon sx={{ color: "#64748b" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    background: "#f8fafc",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      background: "#ffffff",
                    },
                    "&.Mui-focused": {
                      background: "#ffffff",
                      boxShadow: "0 0 0 4px rgba(37,99,235,0.08)",
                    },
                  },
                }}
              />

              <TextField
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                fullWidth
                multiline
                rows={4}
                disabled={loading}
                autoComplete="off"
                InputProps={{
                  startAdornment: (
                    <InputAdornment
                      position="start"
                      sx={{
                        alignSelf: "flex-start",
                        mt: 1.5,
                      }}
                    >
                      <DescriptionIcon sx={{ color: "#64748b" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    background: "#f8fafc",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      background: "#ffffff",
                    },
                    "&.Mui-focused": {
                      background: "#ffffff",
                      boxShadow: "0 0 0 4px rgba(37,99,235,0.08)",
                    },
                  },
                }}
              />

              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 1.6, sm: 2 },
                  borderRadius: 3,
                  background:
                    "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
                  borderColor: "#e5e7eb",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  spacing={1.5}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        color: "#111827",
                        fontSize: "0.95rem",
                      }}
                    >
                      Category Status
                    </Typography>

                    <Typography
                      sx={{
                        color: "#64748b",
                        fontSize: "0.85rem",
                        mt: 0.25,
                      }}
                    >
                      {formData.is_active
                        ? "Visible in your menu."
                        : "Hidden from your menu."}
                    </Typography>
                  </Box>

                  <FormControlLabel
                    control={
                      <Switch
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    }
                    label={formData.is_active ? "Active" : "Inactive"}
                    sx={{
                      m: 0,
                      "& .MuiTypography-root": {
                        fontWeight: 900,
                        color: formData.is_active ? "#16a34a" : "#64748b",
                      },
                    }}
                  />
                </Stack>
              </Paper>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="flex-end"
                spacing={1.5}
                sx={{ pt: 1 }}
              >
                <Button
                  type="button"
                  variant="outlined"
                  disabled={loading}
                  onClick={handleReset}
                  sx={{
                    borderRadius: 3,
                    py: 1.15,
                    px: 2.5,
                    textTransform: "none",
                    fontWeight: 900,
                    width: { xs: "100%", sm: "auto" },
                    borderColor: "#cbd5e1",
                    color: "#334155",
                    "&:hover": {
                      borderColor: "#94a3b8",
                      background: "#f8fafc",
                    },
                  }}
                >
                  Reset
                </Button>

                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  startIcon={
                    loading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : null
                  }
                  sx={{
                    borderRadius: 3,
                    py: 1.15,
                    px: 3,
                    textTransform: "none",
                    fontWeight: 900,
                    bgcolor: "#2563eb",
                    boxShadow: "0 14px 28px rgba(37, 99, 235, 0.30)",
                    width: { xs: "100%", sm: "auto" },
                    "&:hover": {
                      bgcolor: "#1d4ed8",
                      boxShadow: "0 18px 34px rgba(37, 99, 235, 0.36)",
                    },
                  }}
                >
                  {loading ? "Creating..." : "Create Category"}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AddCategory;