import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Paper,
  Rating,
  Stack,
  Typography,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import FavoriteIcon from "@mui/icons-material/Favorite";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import { useNavigate } from "react-router-dom";

import { getWishlistItems, toggleWishlistItem } from "../utils/wishlist";

const API_BASE_URL = "http://127.0.0.1:8000";
const PLACEHOLDER_IMAGE = "https://via.placeholder.com/400x250?text=Food+Item";
const WISHLIST_UPDATED_EVENT = "wishlistUpdated";

const getImageUrl = (image) => {
  if (!image) return PLACEHOLDER_IMAGE;

  return image.startsWith("http") ? image : `${API_BASE_URL}${image}`;
};

const formatPrice = (value) => {
  return Number(value || 0).toLocaleString();
};

const truncateText = (text = "", maxLength = 65) => {
  if (!text) return "No description available.";

  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const Wishlist = () => {
  const navigate = useNavigate();

  const [wishlistItems, setWishlistItems] = useState([]);

  const syncWishlist = useCallback(() => {
    setWishlistItems(getWishlistItems());
  }, []);

  const handleRemove = useCallback(
    (item) => {
      toggleWishlistItem(item);
      syncWishlist();
    },
    [syncWishlist]
  );

  useEffect(() => {
    syncWishlist();

    // Keep this page updated when another component changes the wishlist.
    window.addEventListener(WISHLIST_UPDATED_EVENT, syncWishlist);
    window.addEventListener("storage", syncWishlist);

    return () => {
      window.removeEventListener(WISHLIST_UPDATED_EVENT, syncWishlist);
      window.removeEventListener("storage", syncWishlist);
    };
  }, [syncWishlist]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fa",
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 3, sm: 4, md: 5 },
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          sx={{ mb: 4 }}
        >
          <Box>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 900,
                fontSize: { xs: "1.8rem", sm: "2.4rem", md: "2.8rem" },
              }}
            >
              My Wishlist
            </Typography>

            <Typography
              sx={{
                color: "text.secondary",
                mt: 0.75,
                fontSize: { xs: "0.95rem", sm: "1rem" },
              }}
            >
              Save your favorite meals and quickly return to order them later.
            </Typography>
          </Box>

          {wishlistItems.length > 0 && (
            <Chip
              label={`${wishlistItems.length} item${
                wishlistItems.length > 1 ? "s" : ""
              }`}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          )}
        </Stack>

        {wishlistItems.length > 0 ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(270px, 320px))",
                md: "repeat(3, minmax(270px, 320px))",
              },
              justifyContent: "center",
              gap: 3,
            }}
          >
            {wishlistItems.map((item) => (
              <Card
                key={item.id}
                onClick={() => navigate(`/product/${item.id}`)}
                sx={{
                  cursor: "pointer",
                  borderRadius: 4,
                  overflow: "hidden",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                  width: "100%",
                  maxWidth: { xs: "100%", md: 320 },
                  minHeight: 430,
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: "#fff",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-6px)",
                    boxShadow: "0 16px 35px rgba(0,0,0,0.14)",
                  },
                }}
              >
                <Box sx={{ position: "relative" }}>
                  <CardMedia
                    component="img"
                    height="210"
                    image={getImageUrl(item.image)}
                    alt={item.name || "Food item"}
                    onError={(event) => {
                      event.currentTarget.src = PLACEHOLDER_IMAGE;
                    }}
                    sx={{ objectFit: "cover" }}
                  />

                  <IconButton
                    aria-label={`Remove ${item.name || "item"} from wishlist`}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRemove(item);
                    }}
                    sx={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      backgroundColor: "rgba(255,255,255,0.9)",
                      "&:hover": {
                        backgroundColor: "#fff",
                      },
                    }}
                  >
                    <FavoriteIcon sx={{ color: "red" }} />
                  </IconButton>
                </Box>

                <CardContent
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    p: 2.2,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      mb: 1,
                      fontSize: { xs: "1.05rem", sm: "1.15rem" },
                      lineHeight: 1.3,
                    }}
                  >
                    {item.name || "Food Item"}
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      mb: 1.5,
                      minHeight: 44,
                    }}
                  >
                    {truncateText(item.description)}
                  </Typography>

                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    useFlexGap
                    flexWrap="wrap"
                    sx={{ mb: 2 }}
                  >
                    <Rating
                      value={Number(item.average_rating || 0)}
                      precision={0.1}
                      readOnly
                      size="small"
                    />

                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "text.secondary" }}
                    >
                      {Number(item.average_rating || 0).toFixed(1)} (
                      {item.review_count || 0} reviews)
                    </Typography>
                  </Stack>

                  <Stack
                    direction="row"
                    spacing={1}
                    justifyContent="space-between"
                    alignItems="center"
                    useFlexGap
                    flexWrap="wrap"
                    sx={{ mb: 1.5 }}
                  >
                    <Typography
                      sx={{
                        fontWeight: "bold",
                        color: "#1976d2",
                        fontSize: "1rem",
                      }}
                    >
                      PKR {formatPrice(item.price)}
                    </Typography>

                    <Chip
                      label={item.category || "Food"}
                      size="small"
                      sx={{
                        backgroundColor: "#fff3cd",
                        color: "#8a6d3b",
                        fontWeight: 600,
                      }}
                    />
                  </Stack>

                  <Chip
                    label={item.is_available ? "Available" : "Not Available"}
                    size="small"
                    color={item.is_available ? "success" : "error"}
                    sx={{ width: "fit-content", mb: 2 }}
                  />

                  <Button
                    variant="contained"
                    fullWidth
                    disabled={!item.is_available}
                    endIcon={item.is_available ? <ArrowForwardIcon /> : null}
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/product/${item.id}`);
                    }}
                    sx={{
                      mt: "auto",
                      py: 1.1,
                      borderRadius: 2.5,
                      fontWeight: "bold",
                      textTransform: "none",
                      backgroundColor: item.is_available ? "#ff9800" : "#9e9e9e",
                      "&:hover": {
                        backgroundColor: item.is_available ? "#f57c00" : "#9e9e9e",
                      },
                      "&.Mui-disabled": {
                        backgroundColor: "#bdbdbd",
                        color: "#fff",
                      },
                    }}
                  >
                    {item.is_available ? "Order Now" : "Not Available"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Paper
            elevation={0}
            sx={{
              maxWidth: 620,
              mx: "auto",
              p: { xs: 3, sm: 4 },
              borderRadius: 4,
              textAlign: "center",
              border: "1px solid #e5e7eb",
              backgroundColor: "#fff",
            }}
          >
            <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
              Your wishlist is currently empty.
            </Alert>

            <RestaurantMenuIcon
              sx={{
                fontSize: 58,
                color: "primary.main",
                mb: 1.5,
              }}
            />

            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
              No saved food items yet
            </Typography>

            <Typography sx={{ color: "text.secondary", mb: 3 }}>
              Browse the menu and tap the heart icon on any food item you want
              to save for later.
            </Typography>

            <Button
              variant="contained"
              onClick={() => navigate("/menu")}
              sx={{
                borderRadius: 3,
                px: 4,
                py: 1.2,
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              Explore Menu
            </Button>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default Wishlist;