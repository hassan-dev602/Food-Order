import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
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
  FormControlLabel,
  IconButton,
  Paper,
  Skeleton,
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
  Category as CategoryIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";

const API_BASE_URL = "http://127.0.0.1:8000";

const EMPTY_EDIT_FORM = {
  name: "",
  description: "",
  is_active: true,
};

// DRF APIs may return either an array or paginated data inside "results".
const normalizeCategoryList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const getAdminToken = () => {
  const rawToken = localStorage.getItem("admin_access_token");
  return rawToken ? rawToken.replace(/^Bearer\s+/i, "").trim() : "";
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getApiErrorMessage = (data, fallbackMessage) => {
  return data?.name?.[0] || data?.detail || fallbackMessage;
};

const CategoryMobileCard = ({ category, onEdit, onDelete }) => {
  const isActive = Boolean(category?.is_active);

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: "1px solid #e5e7eb",
        background: "rgba(255,255,255,0.96)",
        boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          height: 4,
          background: isActive
            ? "linear-gradient(90deg, #16a34a, #22c55e)"
            : "linear-gradient(90deg, #64748b, #94a3b8)",
        }}
      />

      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 900,
                color: "#0f172a",
                wordBreak: "break-word",
              }}
            >
              {category?.name || "N/A"}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: "#64748b",
                mt: 0.6,
                lineHeight: 1.6,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {category?.description || "No description available"}
            </Typography>
          </Box>

          <Chip
            label={isActive ? "Active" : "Inactive"}
            color={isActive ? "success" : "default"}
            size="small"
            sx={{ fontWeight: 800, flexShrink: 0 }}
          />
        </Stack>

        <Divider sx={{ my: 1.8 }} />

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography sx={{ color: "#94a3b8", fontSize: "0.75rem" }}>
              Created
            </Typography>

            <Typography
              sx={{
                color: "#334155",
                fontWeight: 800,
                fontSize: "0.86rem",
              }}
            >
              {formatDate(category?.created_at)}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Tooltip title="Edit category">
              <IconButton
                aria-label={`Edit ${category?.name || "category"}`}
                onClick={() => onEdit(category)}
                sx={{
                  bgcolor: "rgba(37, 99, 235, 0.10)",
                  color: "#2563eb",
                  "&:hover": {
                    bgcolor: "rgba(37, 99, 235, 0.16)",
                  },
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Delete category">
              <IconButton
                aria-label={`Delete ${category?.name || "category"}`}
                onClick={() => onDelete(category)}
                sx={{
                  bgcolor: "rgba(220, 38, 38, 0.10)",
                  color: "#dc2626",
                  "&:hover": {
                    bgcolor: "rgba(220, 38, 38, 0.16)",
                  },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

const ManageCategory = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState("");
  const [success, setSuccess] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editData, setEditData] = useState(EMPTY_EDIT_FORM);
  const [editLoading, setEditLoading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteCategory, setDeleteCategory] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const trimmedCategoryName = editData.name.trim();
  const isCategoryNameEmpty = trimmedCategoryName.length === 0;

  const clearMessages = () => {
    setSuccess("");
    setTableError("");
  };

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setTableError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/food-categories/`);
      const data = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "Failed to load categories."));
      }

      setCategories(normalizeCategoryList(data));
    } catch (error) {
      setTableError(error.message || "Failed to load categories.");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openEditDialog = (category) => {
    setSelectedCategory(category);

    setEditData({
      name: category?.name || "",
      description: category?.description || "",
      is_active: Boolean(category?.is_active),
    });

    clearMessages();
    setEditOpen(true);
  };

  const closeEditDialog = () => {
    if (editLoading) return;

    setEditOpen(false);
    setSelectedCategory(null);
    setEditData(EMPTY_EDIT_FORM);
  };

  const handleEditChange = (event) => {
    const { name, value, checked, type } = event.target;

    setEditData((previousData) => ({
      ...previousData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEditSubmit = async () => {
    const token = getAdminToken();

    if (!token) {
      setTableError("Admin token missing. Please login again.");
      return;
    }

    if (!selectedCategory?.id) {
      setTableError("No category selected for update.");
      return;
    }

    if (isCategoryNameEmpty) {
      setTableError("Category name is required.");
      return;
    }

    setEditLoading(true);
    clearMessages();

    const payload = {
      name: trimmedCategoryName,
      description: editData.description.trim(),
      is_active: editData.is_active,
    };

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/food-categories/${selectedCategory.id}/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        setTableError("Session expired or access denied. Please login again.");
        return;
      }

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "Failed to update category."));
      }

      // Some DELETE/PATCH APIs return an empty body, so we safely fallback to local data.
      const updatedCategory =
        Object.keys(data).length > 0
          ? data
          : {
              ...selectedCategory,
              ...payload,
            };

      setCategories((previousCategories) =>
        previousCategories.map((category) =>
          category.id === selectedCategory.id ? updatedCategory : category
        )
      );

      setSuccess("Category updated successfully.");
      setEditOpen(false);
      setSelectedCategory(null);
      setEditData(EMPTY_EDIT_FORM);
    } catch (error) {
      setTableError(error.message || "Failed to update category.");
    } finally {
      setEditLoading(false);
    }
  };

  const openDeleteDialog = (category) => {
    setDeleteCategory(category);
    clearMessages();
    setDeleteOpen(true);
  };

  const closeDeleteDialog = () => {
    if (deleteLoading) return;

    setDeleteOpen(false);
    setDeleteCategory(null);
  };

  const handleDelete = async () => {
    const token = getAdminToken();

    if (!token) {
      setTableError("Admin token missing. Please login again.");
      return;
    }

    if (!deleteCategory?.id) {
      setTableError("No category selected for deletion.");
      return;
    }

    setDeleteLoading(true);
    clearMessages();

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/food-categories/${deleteCategory.id}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        setTableError("Session expired or access denied. Please login again.");
        return;
      }

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "Failed to delete category."));
      }

      setCategories((previousCategories) =>
        previousCategories.filter(
          (category) => category.id !== deleteCategory.id
        )
      );

      setSuccess("Category deleted successfully.");
      setDeleteOpen(false);
      setDeleteCategory(null);
    } catch (error) {
      setTableError(error.message || "Failed to delete category.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(37,99,235,0.10), transparent 32%), linear-gradient(180deg, #f8fafc 0%, #ffffff 52%, #f8fafc 100%)",
        p: { xs: 1.5, sm: 2.5, md: 3 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          mb: 3,
          borderRadius: { xs: 3, md: 5 },
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
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{ position: "relative", zIndex: 1 }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
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
                  fontSize: { xs: "1.9rem", sm: "2.35rem", md: "2.9rem" },
                  lineHeight: 1.05,
                }}
              >
                Manage Category
              </Typography>

              <Typography
                sx={{
                  mt: 0.8,
                  color: "rgba(255,255,255,0.78)",
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                }}
              >
                View, edit, and remove food categories from your admin panel.
              </Typography>
            </Box>
          </Stack>

          <Button
            startIcon={
              loading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <RefreshIcon />
              )
            }
            variant="contained"
            onClick={fetchCategories}
            disabled={loading}
            sx={{
              width: { xs: "100%", sm: "auto" },
              textTransform: "none",
              borderRadius: 3,
              px: 2.7,
              py: 1.15,
              fontWeight: 900,
              bgcolor: "#ffffff",
              color: "#1d4ed8",
              boxShadow: "none",
              "&:hover": {
                bgcolor: "#eff6ff",
                boxShadow: "none",
              },
            }}
          >
            Refresh
          </Button>
        </Stack>
      </Paper>

      {success && (
        <Alert
          severity="success"
          sx={{
            mb: 2,
            borderRadius: 3,
            border: "1px solid #bbf7d0",
          }}
        >
          {success}
        </Alert>
      )}

      {tableError && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            borderRadius: 3,
            border: "1px solid #fecaca",
          }}
        >
          {tableError}
        </Alert>
      )}

      {loading ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              variant="rounded"
              height={130}
              sx={{ borderRadius: 4 }}
            />
          ))}
        </Box>
      ) : categories.length === 0 ? (
        <Alert
          severity="info"
          sx={{
            borderRadius: 3,
            border: "1px solid #bfdbfe",
          }}
        >
          No categories found.
        </Alert>
      ) : (
        <>
          <Box sx={{ display: { xs: "grid", md: "none" }, gap: 2 }}>
            {categories.map((category) => (
              <CategoryMobileCard
                key={category.id}
                category={category}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
              />
            ))}
          </Box>

          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
              display: { xs: "none", md: "block" },
              borderRadius: 4,
              overflow: "hidden",
              borderColor: "#e5e7eb",
              boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
              background: "#ffffff",
            }}
          >
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    background:
                      "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
                    "& th": {
                      fontWeight: 900,
                      color: "#334155",
                      borderBottom: "1px solid #e5e7eb",
                      py: 2,
                      whiteSpace: "nowrap",
                    },
                  }}
                >
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {categories.map((category) => {
                  const isActive = Boolean(category?.is_active);

                  return (
                    <TableRow
                      key={category.id}
                      hover
                      sx={{
                        "& td": {
                          py: 2,
                          borderBottom: "1px solid #f1f5f9",
                        },
                        "&:hover": {
                          backgroundColor: "#f8fafc",
                        },
                      }}
                    >
                      <TableCell sx={{ fontWeight: 900, color: "#0f172a" }}>
                        {category?.name || "N/A"}
                      </TableCell>

                      <TableCell sx={{ color: "#64748b", maxWidth: 420 }}>
                        <Typography
                          sx={{
                            fontSize: "0.9rem",
                            lineHeight: 1.6,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {category?.description || "N/A"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={isActive ? "Active" : "Inactive"}
                          color={isActive ? "success" : "default"}
                          size="small"
                          sx={{ fontWeight: 900 }}
                        />
                      </TableCell>

                      <TableCell sx={{ color: "#475569", fontWeight: 700 }}>
                        {formatDate(category?.created_at)}
                      </TableCell>

                      <TableCell align="right">
                        <Tooltip title="Edit category">
                          <IconButton
                            aria-label={`Edit ${category?.name || "category"}`}
                            color="primary"
                            onClick={() => openEditDialog(category)}
                            sx={{
                              bgcolor: "rgba(37, 99, 235, 0.08)",
                              mr: 1,
                              "&:hover": {
                                bgcolor: "rgba(37, 99, 235, 0.14)",
                              },
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Delete category">
                          <IconButton
                            aria-label={`Delete ${
                              category?.name || "category"
                            }`}
                            color="error"
                            onClick={() => openDeleteDialog(category)}
                            sx={{
                              bgcolor: "rgba(220, 38, 38, 0.08)",
                              "&:hover": {
                                bgcolor: "rgba(220, 38, 38, 0.14)",
                              },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Dialog
        open={editOpen}
        onClose={closeEditDialog}
        fullWidth
        maxWidth="sm"
        fullScreen={isSmallScreen}
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 4 },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: "#111827", pb: 1 }}>
          Edit Category
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              label="Category Name"
              name="name"
              value={editData.name}
              onChange={handleEditChange}
              fullWidth
              required
              error={isCategoryNameEmpty && editData.name.length > 0}
              helperText={
                isCategoryNameEmpty && editData.name.length > 0
                  ? "Category name cannot be empty."
                  : " "
              }
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  background: "#f8fafc",
                },
              }}
            />

            <TextField
              label="Description"
              name="description"
              value={editData.description}
              onChange={handleEditChange}
              fullWidth
              multiline
              rows={4}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  background: "#f8fafc",
                },
              }}
            />

            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 3,
                background: "#f8fafc",
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    name="is_active"
                    checked={editData.is_active}
                    onChange={handleEditChange}
                  />
                }
                label={
                  editData.is_active ? "Active Category" : "Inactive Category"
                }
              />
            </Paper>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            gap: 1,
            flexDirection: { xs: "column-reverse", sm: "row" },
          }}
        >
          <Button
            onClick={closeEditDialog}
            disabled={editLoading}
            sx={{
              textTransform: "none",
              borderRadius: 2.5,
              width: { xs: "100%", sm: "auto" },
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleEditSubmit}
            disabled={editLoading}
            sx={{
              textTransform: "none",
              borderRadius: 2.5,
              fontWeight: 900,
              width: { xs: "100%", sm: "auto" },
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
        PaperProps={{
          sx: {
            borderRadius: { xs: 3, sm: 4 },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: "#111827", pb: 1 }}>
          Delete Category
        </DialogTitle>

        <DialogContent>
          <Typography sx={{ color: "#475569", lineHeight: 1.7 }}>
            Are you sure you want to delete{" "}
            <strong>{deleteCategory?.name || "this category"}</strong>? This
            action cannot be undone.
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            gap: 1,
            flexDirection: { xs: "column-reverse", sm: "row" },
          }}
        >
          <Button
            onClick={closeDeleteDialog}
            disabled={deleteLoading}
            sx={{
              textTransform: "none",
              borderRadius: 2.5,
              width: { xs: "100%", sm: "auto" },
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
              textTransform: "none",
              borderRadius: 2.5,
              fontWeight: 900,
              width: { xs: "100%", sm: "auto" },
            }}
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageCategory;