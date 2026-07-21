import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  Category as CategoryIcon,
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
  Image as ImageIcon,
  RestaurantMenu as RestaurantMenuIcon,
  Straighten as StraightenIcon,
} from "@mui/icons-material";

const API_BASE_URL = "http://127.0.0.1:8000";
const CATEGORY_API_URL = `${API_BASE_URL}/api/v1/food-categories/`;
const FOOD_ITEM_API_URL = `${API_BASE_URL}/api/v1/food-items/`;

const INITIAL_FORM_DATA = {
  name: "",
  description: "",
  category: "",
  price: "",
  size: "medium",
  is_available: true,
};

const SIZE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

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

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;

  return [];
};

const extractApiErrorMessage = (
  data,
  fallbackMessage = "Failed to create food item."
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

const AddItem = () => {
  const categoryAbortRef = useRef(null);
  const submitAbortRef = useRef(null);
  const fileInputRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(false);

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const clearMessages = () => {
    setSuccess("");
    setError("");
  };

  const fetchCategories = useCallback(async () => {
    if (categoryAbortRef.current) {
      categoryAbortRef.current.abort();
    }

    const controller = new AbortController();
    categoryAbortRef.current = controller;

    setCategoryLoading(true);

    try {
      const response = await fetch(CATEGORY_API_URL, {
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          extractApiErrorMessage(data, "Failed to load categories.")
        );
      }

      const activeCategories = normalizeList(data).filter(
        (category) => category.is_active
      );

      setCategories(activeCategories);
    } catch (requestError) {
      if (requestError.name !== "AbortError") {
        setError(requestError.message || "Failed to load categories.");
        setCategories([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setCategoryLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchCategories();

    return () => {
      if (categoryAbortRef.current) {
        categoryAbortRef.current.abort();
      }

      if (submitAbortRef.current) {
        submitAbortRef.current.abort();
      }
    };
  }, [fetchCategories]);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;

    setImageFile(file);
    setPreview(file ? URL.createObjectURL(file) : "");
    clearMessages();
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setImageFile(null);
    setPreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleReset = () => {
    resetForm();
    clearMessages();
  };

  const validateForm = () => {
    if (!getAdminToken()) {
      return "Admin token is missing. Please log in again.";
    }

    if (!formData.category.trim()) {
      return "Category is required.";
    }

    if (!formData.name.trim()) {
      return "Item name is required.";
    }

    if (!formData.description.trim()) {
      return "Description is required.";
    }

    if (!formData.price || Number(formData.price) <= 0) {
      return "A valid price greater than 0 is required.";
    }

    if (!imageFile) {
      return "Food item image is required.";
    }

    return null;
  };

  const buildPayload = () => {
    const payload = new FormData();

    payload.append("name", formData.name.trim());
    payload.append("description", formData.description.trim());
    payload.append("category", formData.category.trim());
    payload.append("price", formData.price);
    payload.append("size", formData.size);
    payload.append("is_available", String(formData.is_available));
    payload.append("image", imageFile);

    return payload;
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

    if (submitAbortRef.current) {
      submitAbortRef.current.abort();
    }

    const controller = new AbortController();
    submitAbortRef.current = controller;

    setLoading(true);

    try {
      const response = await fetch(FOOD_ITEM_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: buildPayload(),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);

      if (response.status === 401 || response.status === 403) {
        throw new Error("Session expired or access denied. Please log in again.");
      }

      if (!response.ok) {
        throw new Error(extractApiErrorMessage(data));
      }

      setSuccess("Food item created successfully.");
      resetForm();
    } catch (requestError) {
      if (requestError.name !== "AbortError") {
        setError(requestError.message || "Failed to create food item.");
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
          border: "1px solid rgba(255,255,255,0.28)",
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
            <RestaurantMenuIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />
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
              Add Food Item
            </Typography>

            <Typography
              sx={{
                mt: 1,
                color: "rgba(255,255,255,0.78)",
                maxWidth: 640,
                fontSize: { xs: "0.9rem", sm: "1rem" },
              }}
            >
              Create a food item with category, image, price, size, and
              availability status.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Card
        elevation={0}
        sx={{
          maxWidth: 920,
          mx: "auto",
          borderRadius: { xs: 3, md: 5 },
          border: "1px solid #e5e7eb",
          background: "rgba(255,255,255,0.94)",
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
              Food Item Details
            </Typography>

            <Typography
              sx={{
                color: "#64748b",
                fontSize: { xs: "0.9rem", sm: "0.95rem" },
              }}
            >
              Fill in the required information. The item will be created in your
              backend menu.
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
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "1fr 1fr",
                },
                gap: 2.5,
              }}
            >
              <FormControl fullWidth required disabled={categoryLoading || loading}>
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  value={formData.category}
                  label="Category"
                  onChange={handleChange}
                  startAdornment={
                    <InputAdornment position="start">
                      <CategoryIcon sx={{ color: "#64748b", ml: 0.5 }} />
                    </InputAdornment>
                  }
                  sx={{
                    borderRadius: 3,
                    background: "#f8fafc",
                    "&.Mui-focused": {
                      background: "#ffffff",
                      boxShadow: "0 0 0 4px rgba(37,99,235,0.08)",
                    },
                  }}
                >
                  {categoryLoading ? (
                    <MenuItem disabled>Loading categories...</MenuItem>
                  ) : categories.length > 0 ? (
                    categories.map((category) => (
                      <MenuItem key={category.id || category.name} value={category.name}>
                        {category.name}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>No active categories found</MenuItem>
                  )}
                </Select>
              </FormControl>

              <TextField
                label="Item Name"
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
                    "&:hover": { background: "#ffffff" },
                    "&.Mui-focused": {
                      background: "#ffffff",
                      boxShadow: "0 0 0 4px rgba(37,99,235,0.08)",
                    },
                  },
                }}
              />

              <TextField
                label="Price"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                fullWidth
                required
                disabled={loading}
                inputProps={{ min: 1, step: "0.01" }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography
                        sx={{
                          color: "#64748b",
                          fontWeight: 900,
                          fontSize: "0.95rem",
                        }}
                      >
                        Rs.
                      </Typography>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    background: "#f8fafc",
                    "&:hover": { background: "#ffffff" },
                    "&.Mui-focused": {
                      background: "#ffffff",
                      boxShadow: "0 0 0 4px rgba(37,99,235,0.08)",
                    },
                  },
                }}
              />

              <FormControl fullWidth required disabled={loading}>
                <InputLabel>Size</InputLabel>
                <Select
                  name="size"
                  value={formData.size}
                  label="Size"
                  onChange={handleChange}
                  startAdornment={
                    <InputAdornment position="start">
                      <StraightenIcon sx={{ color: "#64748b", ml: 0.5 }} />
                    </InputAdornment>
                  }
                  sx={{
                    borderRadius: 3,
                    background: "#f8fafc",
                    "&.Mui-focused": {
                      background: "#ffffff",
                      boxShadow: "0 0 0 4px rgba(37,99,235,0.08)",
                    },
                  }}
                >
                  {SIZE_OPTIONS.map((sizeOption) => (
                    <MenuItem key={sizeOption.value} value={sizeOption.value}>
                      {sizeOption.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                fullWidth
                required
                multiline
                rows={5}
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
                  gridColumn: { xs: "auto", md: "1 / -1" },
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    background: "#f8fafc",
                    "&:hover": { background: "#ffffff" },
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
                  gridColumn: { xs: "auto", md: "1 / -1" },
                  p: { xs: 1.6, sm: 2 },
                  borderRadius: 3,
                  background:
                    "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
                  borderColor: "#e5e7eb",
                }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  justifyContent="space-between"
                  alignItems={{ xs: "stretch", md: "center" }}
                >
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{ minWidth: 0 }}
                  >
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 3,
                        bgcolor: "rgba(37,99,235,0.10)",
                        color: "#2563eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <ImageIcon />
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          color: "#111827",
                          fontWeight: 900,
                          fontSize: "0.95rem",
                        }}
                      >
                        Food Image
                      </Typography>

                      <Typography
                        sx={{
                          color: "#64748b",
                          fontSize: "0.85rem",
                          wordBreak: "break-word",
                        }}
                      >
                        {imageFile ? imageFile.name : "No image selected"}
                      </Typography>
                    </Box>
                  </Stack>

                  <Button
                    variant="outlined"
                    component="label"
                    disabled={loading}
                    startIcon={<CloudUploadIcon />}
                    sx={{
                      py: 1.15,
                      px: 2.4,
                      borderRadius: 3,
                      textTransform: "none",
                      fontWeight: 900,
                      width: { xs: "100%", md: "auto" },
                      borderColor: "#cbd5e1",
                      color: "#334155",
                      "&:hover": {
                        borderColor: "#94a3b8",
                        background: "#f8fafc",
                      },
                    }}
                  >
                    Upload Image
                    <input
                      ref={fileInputRef}
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </Button>
                </Stack>

                {preview && (
                  <Box
                    component="img"
                    src={preview}
                    alt="Food preview"
                    sx={{
                      mt: 2,
                      width: "100%",
                      maxWidth: 240,
                      height: 150,
                      objectFit: "cover",
                      borderRadius: 3,
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 12px 28px rgba(15, 23, 42, 0.10)",
                    }}
                  />
                )}
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  gridColumn: { xs: "auto", md: "1 / -1" },
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
                      Availability
                    </Typography>

                    <Typography
                      sx={{
                        color: "#64748b",
                        fontSize: "0.85rem",
                        mt: 0.25,
                      }}
                    >
                      {formData.is_available
                        ? "This item will be visible."
                        : "This item will be hidden."}
                    </Typography>
                  </Box>

                  <FormControlLabel
                    control={
                      <Switch
                        name="is_available"
                        checked={formData.is_available}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    }
                    label={formData.is_available ? "Available" : "Unavailable"}
                    sx={{
                      m: 0,
                      "& .MuiTypography-root": {
                        fontWeight: 900,
                        color: formData.is_available ? "#16a34a" : "#64748b",
                      },
                    }}
                  />
                </Stack>
              </Paper>
            </Box>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="flex-end"
              spacing={1.5}
              sx={{ pt: 3 }}
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
                  loading ? <CircularProgress size={16} color="inherit" /> : null
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
                {loading ? "Creating..." : "Create Food Item"}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AddItem;