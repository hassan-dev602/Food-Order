import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
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
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Person as PersonIcon,
  RateReview as RateReviewIcon,
  Refresh as RefreshIcon,
  RestaurantMenu as RestaurantMenuIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
} from "@mui/icons-material";

const API_BASE_URL = "http://127.0.0.1:8000";

/**
 * Removes an accidental "Bearer" prefix from localStorage.
 * This prevents sending "Bearer Bearer token" in the Authorization header.
 */
const getAdminToken = () => {
  const rawToken = localStorage.getItem("admin_access_token");
  return rawToken ? rawToken.replace(/^Bearer\s+/i, "").trim() : "";
};

/**
 * Safely parses JSON responses.
 * Some DELETE APIs return an empty response body, so response.json() can fail.
 */
const parseJsonSafely = async (response, fallbackValue = {}) => {
  try {
    return await response.json();
  } catch {
    return fallbackValue;
  }
};

/**
 * Supports both normal array responses and paginated Django REST Framework responses.
 */
const normalizeReviewsList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
};

const getRatingColor = (rating) => {
  const value = Number(rating || 0);

  if (value >= 4) return "success";
  if (value >= 3) return "warning";
  return "error";
};

const StatCard = memo(({ icon, label, value, helper }) => (
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
          bgcolor: "#eff6ff",
          color: "#2563eb",
        }}
      >
        {icon}
      </Avatar>

      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 800 }}>
          {label}
        </Typography>

        <Typography
          variant="h5"
          sx={{
            color: "#0f172a",
            fontWeight: 950,
            lineHeight: 1.1,
          }}
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
));

const ReviewCard = memo(({ review, onDeleteReview }) => (
  <Card
    elevation={0}
    sx={{
      borderRadius: 4,
      border: "1px solid rgba(15, 23, 42, 0.08)",
      boxShadow: "0 16px 45px rgba(15, 23, 42, 0.06)",
      overflow: "hidden",
    }}
  >
    <CardContent sx={{ p: 2.25 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 900 }}>
            FOOD ITEM
          </Typography>

          <Typography variant="h6" sx={{ color: "#0f172a", fontWeight: 950 }} noWrap>
            {review.food_item?.name || "N/A"}
          </Typography>
        </Box>

        <Chip
          icon={<StarIcon />}
          label={`${review.rating || 0}/5`}
          color={getRatingColor(review.rating)}
          size="small"
          sx={{
            borderRadius: 2,
            fontWeight: 950,
            "& .MuiChip-icon": { fontSize: 17 },
          }}
        />
      </Stack>

      <Box sx={{ my: 1.75, borderTop: "1px solid #e2e8f0" }} />

      <Stack spacing={1.25}>
        <Stack direction="row" spacing={1} alignItems="center">
          <PersonIcon sx={{ color: "#64748b", fontSize: 20 }} />

          <Typography sx={{ color: "#334155", fontWeight: 850 }} noWrap>
            {review.reviewer_name || "N/A"}
          </Typography>
        </Stack>

        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: "#f8fafc" }}>
          <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 900 }}>
            Comment
          </Typography>

          <Typography sx={{ color: "#475569", mt: 0.4, wordBreak: "break-word" }}>
            {review.comment || "N/A"}
          </Typography>
        </Paper>

        <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 700 }}>
          Created: {formatDate(review.created_at)}
        </Typography>
      </Stack>

      <Button
        fullWidth
        variant="contained"
        color="error"
        startIcon={<DeleteIcon />}
        onClick={() => onDeleteReview(review)}
        sx={{
          mt: 2,
          minHeight: 46,
          borderRadius: 3,
          textTransform: "none",
          fontWeight: 950,
        }}
      >
        Delete Review
      </Button>
    </CardContent>
  </Card>
));

const ManageReviews = () => {
  const theme = useTheme();
  const showCardsLayout = useMediaQuery(theme.breakpoints.down("md"));

  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchReviews = useCallback(async () => {
    const token = getAdminToken();

    if (!token) {
      setError("Admin token missing. Please login again.");
      setReviews([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/reviews/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await parseJsonSafely(response, []);

      if (response.status === 401 || response.status === 403) {
        setError("Session expired or access denied. Please login again.");
        setReviews([]);
        return;
      }

      if (!response.ok) {
        throw new Error(data?.detail || "Failed to load reviews.");
      }

      setReviews(normalizeReviewsList(data));
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load reviews.");
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const openDeleteDialog = useCallback((review) => {
    setSelectedReview(review);
    setIsDeleteDialogOpen(true);
    setError("");
    setSuccess("");
  }, []);

  const closeDeleteDialog = useCallback(() => {
    if (isDeleting) return;

    setIsDeleteDialogOpen(false);
    setSelectedReview(null);
  }, [isDeleting]);

  const handleDeleteReview = useCallback(async () => {
    const token = getAdminToken();

    if (!token) {
      setError("Admin token missing. Please login again.");
      return;
    }

    if (!selectedReview?.id) {
      setError("No review selected for deletion.");
      return;
    }

    setIsDeleting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/reviews/${selectedReview.id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await parseJsonSafely(response);

      if (response.status === 401 || response.status === 403) {
        setError("Session expired or access denied. Please login again.");
        return;
      }

      if (!response.ok) {
        throw new Error(data?.detail || "Failed to delete review.");
      }

      // Update the UI immediately after successful deletion without refetching the whole list.
      setReviews((previousReviews) =>
        previousReviews.filter((review) => review.id !== selectedReview.id)
      );

      setSuccess("Review deleted successfully.");
      setIsDeleteDialogOpen(false);
      setSelectedReview(null);
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete review.");
    } finally {
      setIsDeleting(false);
    }
  }, [selectedReview]);

  const reviewStats = useMemo(() => {
    const total = reviews.length;

    const ratingSum = reviews.reduce((sum, review) => {
      return sum + Number(review.rating || 0);
    }, 0);

    const average = total ? (ratingSum / total).toFixed(1) : "0.0";

    const positive = reviews.filter((review) => Number(review.rating || 0) >= 4).length;

    const low = reviews.filter((review) => {
      const rating = Number(review.rating || 0);
      return rating > 0 && rating <= 2;
    }).length;

    return {
      total,
      average,
      positive,
      low,
    };
  }, [reviews]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        p: { xs: 1.5, sm: 2.5, md: 3.5 },
        background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 42%, #eef2ff 100%)",
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
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 45%, #2563eb 100%)",
          boxShadow: "0 24px 70px rgba(15, 23, 42, 0.22)",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: 250,
            height: 250,
            borderRadius: "50%",
            right: -80,
            top: -90,
            background: "rgba(255,255,255,0.12)",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            width: 140,
            height: 140,
            borderRadius: "50%",
            right: 130,
            bottom: -80,
            background: "rgba(255,255,255,0.08)",
          }}
        />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{ position: "relative", zIndex: 1 }}
        >
          <Box>
            <Typography
              variant={showCardsLayout ? "h4" : "h3"}
              sx={{
                fontWeight: 950,
                letterSpacing: "-0.04em",
                lineHeight: 1.05,
                color: "#ffffff",
              }}
            >
              Manage Reviews
            </Typography>

            <Typography sx={{ mt: 1, color: "rgba(255,255,255,0.78)", fontWeight: 600 }}>
              Review and manage customer feedback for food items.
            </Typography>
          </Box>

          <Button
            startIcon={<RefreshIcon />}
            variant="contained"
            onClick={fetchReviews}
            disabled={isLoading}
            sx={{
              textTransform: "none",
              borderRadius: 3,
              fontWeight: 950,
              px: 2.6,
              py: 1.15,
              bgcolor: "#ffffff",
              color: "#0f172a",
              boxShadow: "none",
              "&:hover": { bgcolor: "#f8fafc", boxShadow: "none" },
            }}
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <StatCard
            icon={<RateReviewIcon />}
            label="Reviews"
            value={reviewStats.total}
            helper="Total reviews"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <StatCard
            icon={<StarIcon />}
            label="Avg Rating"
            value={`${reviewStats.average}/5`}
            helper="Overall average"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <StatCard
            icon={<TrendingUpIcon />}
            label="Positive"
            value={reviewStats.positive}
            helper="4 stars or above"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <StatCard
            icon={<RestaurantMenuIcon />}
            label="Low Rating"
            value={reviewStats.low}
            helper="2 stars or below"
          />
        </Grid>
      </Grid>

      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 3, fontWeight: 800 }}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 3, fontWeight: 800 }}>
          {error}
        </Alert>
      )}

      {isLoading ? (
        <Paper
          elevation={0}
          sx={{
            py: 8,
            borderRadius: 5,
            display: "grid",
            placeItems: "center",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            bgcolor: "#ffffff",
          }}
        >
          <CircularProgress sx={{ color: "#2563eb" }} />

          <Typography sx={{ mt: 2, color: "#64748b", fontWeight: 800 }}>
            Loading reviews...
          </Typography>
        </Paper>
      ) : reviews.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 5,
            textAlign: "center",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            bgcolor: "#ffffff",
            boxShadow: "0 18px 55px rgba(15, 23, 42, 0.06)",
          }}
        >
          <Avatar
            sx={{
              width: 64,
              height: 64,
              mx: "auto",
              mb: 1.5,
              bgcolor: "#eff6ff",
              color: "#2563eb",
            }}
          >
            <RateReviewIcon />
          </Avatar>

          <Typography variant="h6" sx={{ fontWeight: 950, color: "#0f172a" }}>
            No reviews found
          </Typography>

          <Typography sx={{ color: "#64748b", mt: 0.5 }}>
            There are no food item reviews available right now.
          </Typography>
        </Paper>
      ) : showCardsLayout ? (
        <Stack spacing={2}>
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} onDeleteReview={openDeleteDialog} />
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
                    fontWeight: 950,
                    borderBottom: "1px solid #e2e8f0",
                    whiteSpace: "nowrap",
                  },
                }}
              >
                <TableCell>Food Item</TableCell>
                <TableCell>Reviewer</TableCell>
                <TableCell>Rating</TableCell>
                <TableCell>Comment</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {reviews.map((review) => (
                <TableRow
                  key={review.id}
                  hover
                  sx={{
                    "& td": { borderBottom: "1px solid #f1f5f9" },
                    "&:last-child td": { borderBottom: 0 },
                  }}
                >
                  <TableCell>
                    <Typography sx={{ fontWeight: 950, color: "#0f172a" }}>
                      {review.food_item?.name || "N/A"}
                    </Typography>

                    <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                      Review ID: {review.id}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ fontWeight: 800, color: "#334155" }}>
                    {review.reviewer_name || "N/A"}
                  </TableCell>

                  <TableCell>
                    <Chip
                      icon={<StarIcon />}
                      label={`${review.rating || 0}/5`}
                      size="small"
                      color={getRatingColor(review.rating)}
                      sx={{
                        borderRadius: 2,
                        fontWeight: 950,
                        "& .MuiChip-icon": { fontSize: 17 },
                      }}
                    />
                  </TableCell>

                  <TableCell sx={{ color: "#475569", maxWidth: 380 }}>
                    <Tooltip title={review.comment || "N/A"} placement="top-start">
                      <Typography noWrap>{review.comment || "N/A"}</Typography>
                    </Tooltip>
                  </TableCell>

                  <TableCell sx={{ color: "#64748b", whiteSpace: "nowrap" }}>
                    {formatDate(review.created_at)}
                  </TableCell>

                  <TableCell align="right">
                    <Tooltip title="Delete review">
                      <IconButton
                        aria-label={`Delete review by ${review.reviewer_name || "reviewer"}`}
                        onClick={() => openDeleteDialog(review)}
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
        open={isDeleteDialogOpen}
        onClose={closeDeleteDialog}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 5 } }}
      >
        <DialogTitle sx={{ fontWeight: 950, color: "#0f172a" }}>Delete Review</DialogTitle>

        <DialogContent>
          <Typography sx={{ color: "#475569" }}>
            Are you sure you want to delete this review by{" "}
            <strong>{selectedReview?.reviewer_name || "this reviewer"}</strong>?
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={closeDeleteDialog}
            disabled={isDeleting}
            sx={{
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
            disabled={isDeleting || !selectedReview}
            onClick={handleDeleteReview}
            sx={{
              textTransform: "none",
              borderRadius: 3,
              fontWeight: 900,
            }}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageReviews;