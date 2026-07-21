import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Image as ImageIcon,
  Inventory2 as InventoryIcon,
  Refresh as RefreshIcon,
  RestaurantMenu as RestaurantMenuIcon,
  Search as SearchIcon,
  Star as StarIcon,
} from "@mui/icons-material";

const API_BASE_URL = "http://127.0.0.1:8000";

const INITIAL_FILTERS = {
  search: "",
  category: "",
  size: "",
  is_available: "",
};

const INITIAL_EDIT_FORM = {
  name: "",
  description: "",
  category: "",
  price: "",
  size: "medium",
  is_available: true,
};

const getAdminToken = () => {
  const rawToken = localStorage.getItem("admin_access_token");
  return rawToken ? rawToken.replace(/^Bearer\s+/i, "").trim() : "";
};

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const buildQueryParams = (filters) => {
  const params = new URLSearchParams();

  if (filters.search.trim()) params.append("search", filters.search.trim());
  if (filters.category) params.append("category", filters.category);
  if (filters.size) params.append("size", filters.size);
  if (filters.is_available !== "") {
    params.append("is_available", filters.is_available);
  }

  return params.toString();
};

const getApiErrorMessage = (data, fallbackMessage) => {
  return (
    data?.detail ||
    data?.name?.[0] ||
    data?.description?.[0] ||
    data?.category?.[0] ||
    data?.price?.[0] ||
    data?.size?.[0] ||
    data?.image?.[0] ||
    fallbackMessage
  );
};

const revokeObjectUrl = (url) => {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
};

const ManageItem = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState("");
  const [success, setSuccess] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editData, setEditData] = useState(INITIAL_EDIT_FORM);
  const [editImageFile, setEditImageFile] = useState(null);
  const [editPreview, setEditPreview] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/food-categories/`);
      const data = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "Failed to load categories."));
      }

      setCategories(normalizeList(data));
    } catch {
      // Category loading should not block the whole page.
      setCategories([]);
    }
  }, []);

  const fetchItems = useCallback(async (activeFilters = INITIAL_FILTERS) => {
    setLoading(true);
    setTableError("");

    try {
      const query = buildQueryParams(activeFilters);
      const url = query
        ? `${API_BASE_URL}/api/v1/food-items/?${query}`
        : `${API_BASE_URL}/api/v1/food-items/`;

      const response = await fetch(url);
      const data = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "Failed to load food items."));
      }

      setItems(normalizeList(data));
    } catch (error) {
      setTableError(error.message || "Failed to load food items.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchItems(INITIAL_FILTERS);
  }, [fetchCategories, fetchItems]);

  useEffect(() => {
    /*
      Category, size, and availability filters update the list immediately.
      Search is handled manually on form submit to avoid fetching on every keystroke.
    */
    fetchItems(filters);
  }, [filters.category, filters.size, filters.is_available, fetchItems]);

  useEffect(() => {
    return () => {
      revokeObjectUrl(editPreview);
    };
  }, [editPreview]);

  const stats = useMemo(() => {
    const available = items.filter((item) => item.is_available).length;
    const unavailable = items.length - available;
    const reviews = items.reduce(
      (sum, item) => sum + Number(item.review_count || 0),
      0
    );

    return {
      total: items.length,
      available,
      unavailable,
      reviews,
    };
  }, [items]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((previous) => ({ ...previous, [name]: value }));
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    fetchItems(filters);
  };

  const resetFilters = () => {
    const hadAutoFilters =
      filters.category || filters.size || filters.is_available !== "";

    setFilters(INITIAL_FILTERS);

    /*
      If only the search field was changed, the auto-filter effect will not run.
      In that case, fetch manually using clean filters.
    */
    if (!hadAutoFilters) {
      fetchItems(INITIAL_FILTERS);
    }
  };

  const clearMessages = () => {
    setSuccess("");
    setTableError("");
  };

  const closeEditDialog = () => {
    if (editLoading) return;

    setEditOpen(false);
    setSelectedItem(null);
    setEditData(INITIAL_EDIT_FORM);
    setEditImageFile(null);
    setEditPreview("");
  };

  const openEditDialog = (item) => {
    setSelectedItem(item);
    setEditData({
      name: item?.name || "",
      description: item?.description || "",
      category: item?.category || "",
      price: item?.price || "",
      size: item?.size || "medium",
      is_available: Boolean(item?.is_available),
    });
    setEditImageFile(null);
    setEditPreview(item?.image || "");
    setEditOpen(true);
    clearMessages();
  };

  const handleEditChange = (event) => {
    const { name, value, checked, type } = event.target;

    setEditData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEditImageChange = (event) => {
    const file = event.target.files?.[0] || null;

    revokeObjectUrl(editPreview);
    setEditImageFile(file);
    setEditPreview(file ? URL.createObjectURL(file) : selectedItem?.image || "");
  };

  const validateEditForm = () => {
    if (!selectedItem?.id) return "No food item selected.";
    if (!editData.name.trim()) return "Item name is required.";
    if (!editData.description.trim()) return "Description is required.";
    if (!String(editData.category).trim()) return "Category is required.";
    if (!editData.price || Number(editData.price) <= 0) {
      return "Valid price is required.";
    }

    return "";
  };

  const handleEditSubmit = async () => {
    const token = getAdminToken();

    if (!token) {
      setTableError("Admin token missing. Please login again.");
      return;
    }

    const validationError = validateEditForm();

    if (validationError) {
      setTableError(validationError);
      return;
    }

    const payload = new FormData();
    payload.append("name", editData.name.trim());
    payload.append("description", editData.description.trim());
    payload.append("category", editData.category);
    payload.append("price", editData.price);
    payload.append("size", editData.size);
    payload.append("is_available", String(editData.is_available));

    if (editImageFile) {
      payload.append("image", editImageFile);
    }

    setEditLoading(true);
    clearMessages();

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/food-items/${selectedItem.id}/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: payload,
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        throw new Error("Session expired or access denied. Please login again.");
      }

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "Failed to update food item."));
      }

      setItems((previous) =>
        previous.map((item) => (item.id === selectedItem.id ? data : item))
      );

      setSuccess("Food item updated successfully.");
      closeEditDialog();
    } catch (error) {
      setTableError(error.message || "Failed to update food item.");
    } finally {
      setEditLoading(false);
    }
  };

  const closeDeleteDialog = () => {
    if (deleteLoading) return;

    setDeleteOpen(false);
    setDeleteItem(null);
  };

  const openDeleteDialog = (item) => {
    setDeleteItem(item);
    setDeleteOpen(true);
    clearMessages();
  };

  const handleDelete = async () => {
    const token = getAdminToken();

    if (!token) {
      setTableError("Admin token missing. Please login again.");
      return;
    }

    if (!deleteItem?.id) {
      setTableError("No food item selected for deletion.");
      return;
    }

    setDeleteLoading(true);
    clearMessages();

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/food-items/${deleteItem.id}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        throw new Error("Session expired or access denied. Please login again.");
      }

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "Failed to delete food item."));
      }

      setItems((previous) =>
        previous.filter((item) => item.id !== deleteItem.id)
      );

      setSuccess("Food item deleted successfully.");
      closeDeleteDialog();
    } catch (error) {
      setTableError(error.message || "Failed to delete food item.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const fieldStyle = {
    "& .MuiOutlinedInput-root": {
      minHeight: 58,
      borderRadius: 3,
      backgroundColor: "#ffffff",
      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
      transition: "0.2s ease",
      "&:hover": {
        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
      },
      "&.Mui-focused": {
        boxShadow: "0 0 0 4px rgba(79, 70, 229, 0.10)",
      },
    },
    "& .MuiInputLabel-root": {
      fontWeight: 800,
      color: "#64748b",
    },
    "& .MuiSelect-select, & .MuiInputBase-input": {
      fontWeight: 700,
      color: "#0f172a",
    },
  };

  const StatCard = ({ icon, label, value, helper }) => (
    <Paper
      elevation={0}
      sx={{
        p: 2.25,
        height: "100%",
        borderRadius: 4,
        border: "1px solid rgba(15, 23, 42, 0.08)",
        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        boxShadow: "0 18px 50px rgba(15, 23, 42, 0.06)",
      }}
    >
      <Stack direction="row" spacing={1.75} alignItems="center">
        <Avatar
          sx={{
            width: 46,
            height: 46,
            bgcolor: "#eef2ff",
            color: "#4f46e5",
          }}
        >
          {icon}
        </Avatar>

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 700 }}>
            {label}
          </Typography>

          <Typography
            variant="h5"
            sx={{ color: "#0f172a", fontWeight: 900, lineHeight: 1.1 }}
          >
            {value}
          </Typography>

          {helper && (
            <Typography variant="caption" sx={{ color: "#94a3b8" }}>
              {helper}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );

  const MobileItemCard = ({ item }) => (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: "1px solid rgba(15, 23, 42, 0.08)",
        boxShadow: "0 16px 45px rgba(15, 23, 42, 0.06)",
        overflow: "hidden",
      }}
    >
      <Box sx={{ position: "relative" }}>
        {item.image ? (
          <Box
            component="img"
            src={item.image}
            alt={item.name || "Food item"}
            sx={{
              width: "100%",
              height: 180,
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <Box
            sx={{
              height: 180,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, #f1f5f9, #e2e8f0)",
              color: "#94a3b8",
            }}
          >
            <ImageIcon sx={{ fontSize: 48 }} />
          </Box>
        )}

        <Chip
          label={item.is_available ? "Available" : "Unavailable"}
          color={item.is_available ? "success" : "default"}
          size="small"
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            fontWeight: 800,
            borderRadius: 2,
            backdropFilter: "blur(8px)",
          }}
        />
      </Box>

      <CardContent sx={{ p: 2.25 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={2}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#0f172a" }} noWrap>
              {item.name || "N/A"}
            </Typography>

            <Typography variant="body2" sx={{ color: "#64748b", mt: 0.25 }}>
              {item.category || "N/A"} • {item.size || "N/A"}
            </Typography>
          </Box>

          <Typography
            variant="h6"
            sx={{ fontWeight: 900, color: "#16a34a", whiteSpace: "nowrap" }}
          >
            Rs. {item.price || "0.00"}
          </Typography>
        </Stack>

        <Divider sx={{ my: 1.75 }} />

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <StarIcon sx={{ color: "#f59e0b", fontSize: 19 }} />
            <Typography variant="body2" sx={{ color: "#475569", fontWeight: 700 }}>
              {item.average_rating ?? 0} rating
            </Typography>
          </Stack>

          <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 700 }}>
            {item.review_count ?? 0} reviews
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1.25} sx={{ mt: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => openEditDialog(item)}
            sx={{ textTransform: "none", borderRadius: 3, fontWeight: 800 }}
          >
            Edit
          </Button>

          <Button
            fullWidth
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => openDeleteDialog(item)}
            sx={{ textTransform: "none", borderRadius: 3, fontWeight: 800 }}
          >
            Delete
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        p: { xs: 1.5, sm: 2.5, md: 3.5 },
        background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 42%, #f8fafc 100%)",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.25, md: 3 },
          mb: 3,
          borderRadius: 5,
          color: "#ffffff",
          overflow: "hidden",
          position: "relative",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 48%, #4f46e5 100%)",
          boxShadow: "0 24px 70px rgba(15, 23, 42, 0.24)",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: 240,
            height: 240,
            borderRadius: "50%",
            right: -70,
            top: -90,
            background: "rgba(255,255,255,0.12)",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            width: 130,
            height: 130,
            borderRadius: "50%",
            right: 120,
            bottom: -70,
            background: "rgba(255,255,255,0.08)",
          }}
        />

        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
          sx={{ position: "relative", zIndex: 1 }}
        >
          <Box>
            <Typography
              variant={isMobile ? "h4" : "h3"}
              sx={{ fontWeight: 950, letterSpacing: "-0.04em", lineHeight: 1.05 }}
            >
              Manage Food Items
            </Typography>

            <Typography sx={{ mt: 1, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
              View, filter, edit, and remove menu items from the admin dashboard.
            </Typography>
          </Box>

          <Button
            startIcon={<RefreshIcon />}
            variant="contained"
            onClick={() => fetchItems(filters)}
            disabled={loading}
            sx={{
              width: { xs: "100%", sm: "auto" },
              textTransform: "none",
              borderRadius: 3,
              fontWeight: 900,
              px: 2.5,
              py: 1.15,
              bgcolor: "#ffffff",
              color: "#0f172a",
              boxShadow: "none",
              "&:hover": { bgcolor: "#f8fafc", boxShadow: "none" },
            }}
          >
            Refresh Items
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={<InventoryIcon />}
            label="Total Items"
            value={stats.total}
            helper="Loaded items"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <StatCard
            icon={<RestaurantMenuIcon />}
            label="Available"
            value={stats.available}
            helper="Ready to sell"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <StatCard
            icon={<ImageIcon />}
            label="Unavailable"
            value={stats.unavailable}
            helper="Currently hidden"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <StatCard
            icon={<StarIcon />}
            label="Reviews"
            value={stats.reviews}
            helper="Total reviews"
          />
        </Grid>
      </Grid>

      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 3, fontWeight: 700 }}>
          {success}
        </Alert>
      )}

      {tableError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 3, fontWeight: 700 }}>
          {tableError}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.5 },
          mb: 3,
          borderRadius: 5,
          border: "1px solid rgba(15, 23, 42, 0.08)",
          boxShadow: "0 18px 55px rgba(15, 23, 42, 0.07)",
        }}
      >
        <Box component="form" onSubmit={handleSearchSubmit}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(220px, 1fr))",
                lg: "1.35fr 1.15fr 1.15fr 1.25fr",
              },
              gap: 2,
              alignItems: "center",
            }}
          >
            <TextField
              name="search"
              label="Search by name"
              value={filters.search}
              onChange={handleFilterChange}
              fullWidth
              sx={fieldStyle}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94a3b8" }} />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl fullWidth sx={fieldStyle}>
              <InputLabel>Category</InputLabel>
              <Select
                name="category"
                value={filters.category}
                label="Category"
                onChange={handleFilterChange}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.name}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={fieldStyle}>
              <InputLabel>Size</InputLabel>
              <Select
                name="size"
                value={filters.size}
                label="Size"
                onChange={handleFilterChange}
              >
                <MenuItem value="">All Sizes</MenuItem>
                <MenuItem value="small">Small</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="large">Large</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={fieldStyle}>
              <InputLabel>Availability</InputLabel>
              <Select
                name="is_available"
                value={filters.is_available}
                label="Availability"
                onChange={handleFilterChange}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="true">Available</MenuItem>
                <MenuItem value="false">Unavailable</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="flex-end"
            spacing={1.25}
            sx={{ mt: 2 }}
          >
            <Button
              type="submit"
              variant="contained"
              startIcon={<SearchIcon />}
              disabled={loading}
              sx={{
                minHeight: 56,
                minWidth: { xs: "100%", sm: 155 },
                px: 3,
                textTransform: "none",
                borderRadius: 3,
                fontWeight: 950,
                letterSpacing: "0.01em",
                bgcolor: "#4f46e5",
                boxShadow: "0 14px 30px rgba(79, 70, 229, 0.28)",
                "&:hover": {
                  bgcolor: "#4338ca",
                  boxShadow: "0 16px 34px rgba(79, 70, 229, 0.34)",
                },
              }}
            >
              Search
            </Button>

            <Button
              variant="outlined"
              onClick={resetFilters}
              disabled={loading}
              sx={{
                minHeight: 56,
                minWidth: { xs: "100%", sm: 145 },
                px: 3,
                textTransform: "none",
                borderRadius: 3,
                fontWeight: 950,
                borderColor: "#cbd5e1",
                color: "#334155",
                bgcolor: "#ffffff",
                "&:hover": {
                  borderColor: "#94a3b8",
                  bgcolor: "#f8fafc",
                },
              }}
            >
              Reset
            </Button>
          </Stack>
        </Box>
      </Paper>

      {loading ? (
        <Paper
          elevation={0}
          sx={{
            py: 8,
            borderRadius: 5,
            display: "grid",
            placeItems: "center",
            border: "1px solid rgba(15, 23, 42, 0.08)",
          }}
        >
          <CircularProgress />
          <Typography sx={{ mt: 2, color: "#64748b", fontWeight: 700 }}>
            Loading food items...
          </Typography>
        </Paper>
      ) : items.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 3, fontWeight: 700 }}>
          No food items found.
        </Alert>
      ) : isMobile ? (
        <Stack spacing={2}>
          {items.map((item) => (
            <MobileItemCard key={item.id} item={item} />
          ))}
        </Stack>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 5,
            border: "1px solid rgba(15, 23, 42, 0.08)",
            overflowX: "auto",
            boxShadow: "0 18px 55px rgba(15, 23, 42, 0.07)",
          }}
        >
          <Table sx={{ minWidth: 980 }}>
            <TableHead>
              <TableRow
                sx={{
                  background: "#f8fafc",
                  "& th": {
                    color: "#475569",
                    fontWeight: 900,
                    borderBottom: "1px solid #e2e8f0",
                    whiteSpace: "nowrap",
                  },
                }}
              >
                <TableCell>Image</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Availability</TableCell>
                <TableCell>Avg Rating</TableCell>
                <TableCell>Reviews</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.id}
                  hover
                  sx={{
                    "& td": { borderBottom: "1px solid #f1f5f9" },
                    "&:last-child td": { borderBottom: 0 },
                  }}
                >
                  <TableCell>
                    {item.image ? (
                      <Box
                        component="img"
                        src={item.image}
                        alt={item.name || "Food item"}
                        sx={{
                          width: 74,
                          height: 58,
                          borderRadius: 3,
                          objectFit: "cover",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 8px 18px rgba(15, 23, 42, 0.08)",
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 74,
                          height: 58,
                          borderRadius: 3,
                          display: "grid",
                          placeItems: "center",
                          bgcolor: "#f1f5f9",
                          color: "#94a3b8",
                          border: "1px dashed #cbd5e1",
                        }}
                      >
                        <ImageIcon />
                      </Box>
                    )}
                  </TableCell>

                  <TableCell>
                    <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>
                      {item.name || "N/A"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                      ID: {item.id}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ color: "#475569", fontWeight: 700 }}>
                    {item.category || "N/A"}
                  </TableCell>

                  <TableCell>
                    <Typography sx={{ fontWeight: 900, color: "#16a34a" }}>
                      Rs. {item.price || "0.00"}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={item.size || "N/A"}
                      size="small"
                      sx={{
                        borderRadius: 2,
                        fontWeight: 800,
                        textTransform: "capitalize",
                      }}
                    />
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={item.is_available ? "Available" : "Unavailable"}
                      color={item.is_available ? "success" : "default"}
                      size="small"
                      sx={{ borderRadius: 2, fontWeight: 900 }}
                    />
                  </TableCell>

                  <TableCell>
                    <Stack direction="row" spacing={0.6} alignItems="center">
                      <StarIcon sx={{ color: "#f59e0b", fontSize: 19 }} />
                      <Typography sx={{ fontWeight: 800 }}>
                        {item.average_rating ?? 0}
                      </Typography>
                    </Stack>
                  </TableCell>

                  <TableCell sx={{ fontWeight: 800, color: "#475569" }}>
                    {item.review_count ?? 0}
                  </TableCell>

                  <TableCell align="right">
                    <Tooltip title="Edit item">
                      <IconButton
                        onClick={() => openEditDialog(item)}
                        sx={{
                          color: "#4f46e5",
                          bgcolor: "#eef2ff",
                          mr: 1,
                          "&:hover": { bgcolor: "#e0e7ff" },
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Delete item">
                      <IconButton
                        onClick={() => openDeleteDialog(item)}
                        sx={{
                          color: "#dc2626",
                          bgcolor: "#fef2f2",
                          "&:hover": { bgcolor: "#fee2e2" },
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={editOpen}
        onClose={closeEditDialog}
        fullWidth
        fullScreen={isMobile}
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: { xs: 0, md: 5 } } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 950, color: "#0f172a" }}>
            Edit Food Item
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.4 }}>
            Update item details, availability, price, and image.
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: "16px !important" }}>
          <Grid container spacing={2.25}>
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.25,
                  borderRadius: 4,
                  border: "1px solid #e2e8f0",
                  bgcolor: "#f8fafc",
                }}
              >
                {editPreview ? (
                  <Box
                    component="img"
                    src={editPreview}
                    alt="Preview"
                    sx={{
                      width: "100%",
                      height: { xs: 200, md: 220 },
                      objectFit: "cover",
                      borderRadius: 3,
                      display: "block",
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: { xs: 200, md: 220 },
                      borderRadius: 3,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "#e2e8f0",
                      color: "#94a3b8",
                    }}
                  >
                    <ImageIcon sx={{ fontSize: 54 }} />
                  </Box>
                )}

                <Button
                  fullWidth
                  variant="outlined"
                  component="label"
                  disabled={editLoading}
                  sx={{ mt: 1.5, textTransform: "none", borderRadius: 3, fontWeight: 900 }}
                >
                  Change Image
                  <input hidden type="file" accept="image/*" onChange={handleEditImageChange} />
                </Button>

                {editImageFile && (
                  <Typography variant="caption" sx={{ color: "#64748b", mt: 1, display: "block" }}>
                    Selected: {editImageFile.name}
                  </Typography>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required sx={fieldStyle}>
                    <InputLabel>Category</InputLabel>
                    <Select
                      name="category"
                      value={editData.category}
                      label="Category"
                      onChange={handleEditChange}
                      disabled={editLoading}
                    >
                      {categories.map((category) => (
                        <MenuItem key={category.id} value={category.name}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required sx={fieldStyle}>
                    <InputLabel>Size</InputLabel>
                    <Select
                      name="size"
                      value={editData.size}
                      label="Size"
                      onChange={handleEditChange}
                      disabled={editLoading}
                    >
                      <MenuItem value="small">Small</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="large">Large</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Item Name"
                    name="name"
                    value={editData.name}
                    onChange={handleEditChange}
                    fullWidth
                    required
                    disabled={editLoading}
                    sx={fieldStyle}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Description"
                    name="description"
                    value={editData.description}
                    onChange={handleEditChange}
                    fullWidth
                    required
                    multiline
                    rows={4}
                    disabled={editLoading}
                    sx={fieldStyle}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Price"
                    name="price"
                    type="number"
                    value={editData.price}
                    onChange={handleEditChange}
                    fullWidth
                    required
                    disabled={editLoading}
                    inputProps={{ min: 1, step: "0.01" }}
                    sx={fieldStyle}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      height: "100%",
                      minHeight: 56,
                      px: 2,
                      display: "flex",
                      alignItems: "center",
                      borderRadius: 3,
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Switch
                          name="is_available"
                          checked={editData.is_available}
                          onChange={handleEditChange}
                          disabled={editLoading}
                        />
                      }
                      label={editData.is_available ? "Available" : "Unavailable"}
                      sx={{
                        "& .MuiFormControlLabel-label": {
                          fontWeight: 800,
                          color: "#334155",
                        },
                      }}
                    />
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            pt: 1,
            flexDirection: { xs: "column-reverse", sm: "row" },
            gap: { xs: 1, sm: 0 },
          }}
        >
          <Button
            onClick={closeEditDialog}
            disabled={editLoading}
            sx={{
              width: { xs: "100%", sm: "auto" },
              textTransform: "none",
              borderRadius: 3,
              fontWeight: 900,
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleEditSubmit}
            disabled={editLoading}
            sx={{
              width: { xs: "100%", sm: "auto" },
              textTransform: "none",
              borderRadius: 3,
              fontWeight: 900,
              px: 2.5,
            }}
          >
            {editLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onClose={closeDeleteDialog}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 5 } }}
      >
        <DialogTitle sx={{ fontWeight: 950, color: "#0f172a" }}>
          Delete Food Item
        </DialogTitle>

        <DialogContent>
          <Typography sx={{ color: "#475569" }}>
            Are you sure you want to delete{" "}
            <strong>{deleteItem?.name || "this food item"}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            flexDirection: { xs: "column-reverse", sm: "row" },
            gap: { xs: 1, sm: 0 },
          }}
        >
          <Button
            onClick={closeDeleteDialog}
            disabled={deleteLoading}
            sx={{
              width: { xs: "100%", sm: "auto" },
              textTransform: "none",
              borderRadius: 3,
              fontWeight: 900,
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleteLoading}
            sx={{
              width: { xs: "100%", sm: "auto" },
              textTransform: "none",
              borderRadius: 3,
              fontWeight: 900,
            }}
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageItem;