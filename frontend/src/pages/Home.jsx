import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  IconButton,
  Rating,
  TextField,
  Typography,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import SearchIcon from "@mui/icons-material/Search";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { useNavigate } from "react-router-dom";

import { getWishlistItems, toggleWishlistItem } from "../utils/wishlist";

const API_BASE_URL = "http://127.0.0.1:8000";
const API_URL = `${API_BASE_URL}/api/v1/food-items/`;
const PLACEHOLDER_IMAGE = "https://via.placeholder.com/400x250?text=Food+Item";
const MAX_PAGINATION_REQUESTS = 20;
const FEATURED_ITEMS_LIMIT = 9;

const getImageUrl = (image) => {
  if (!image) return PLACEHOLDER_IMAGE;
  return image.startsWith("http") ? image : `${API_BASE_URL}${image}`;
};

const formatPrice = (value) => {
  return Number(value || 0).toLocaleString();
};

const isSameId = (firstId, secondId) => {
  return String(firstId) === String(secondId);
};

const shuffleArray = (array) => {
  const shuffledItems = [...array];

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffledItems[index], shuffledItems[randomIndex]] = [
      shuffledItems[randomIndex],
      shuffledItems[index],
    ];
  }

  return shuffledItems;
};

const Home = () => {
  const navigate = useNavigate();

  const [searchText, setSearchText] = useState("");
  const [submittedSearchText, setSubmittedSearchText] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [wishlistIds, setWishlistIds] = useState([]);

  const wishlistIdSet = useMemo(() => {
    return new Set(wishlistIds.map((id) => String(id)));
  }, [wishlistIds]);

  const syncWishlist = useCallback(() => {
    const wishlist = getWishlistItems();
    setWishlistIds(wishlist.map((item) => item.id));
  }, []);

  const fetchAllItems = useCallback(async (customUrl = API_URL, signal) => {
    const allItems = [];
    let nextUrl = customUrl;
    let requestCount = 0;

    while (nextUrl && requestCount < MAX_PAGINATION_REQUESTS) {
      const response = await fetch(nextUrl, { signal });

      if (!response.ok) {
        throw new Error("Unable to load food items. Please try again.");
      }

      const data = await response.json();

      allItems.push(...(data.results || []));
      nextUrl = data.next;
      requestCount += 1;
    }

    return allItems;
  }, []);

  const fetchRandomItems = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setError("");
        setIsSearchMode(false);
        setSubmittedSearchText("");

        const allItems = await fetchAllItems(API_URL, signal);
        const availableItems = allItems.filter((item) => item.is_available);
        const sourceItems =
          availableItems.length >= FEATURED_ITEMS_LIMIT ? availableItems : allItems;

        setItems(shuffleArray(sourceItems).slice(0, FEATURED_ITEMS_LIMIT));
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setError(fetchError.message || "Something went wrong while loading items.");
        }
      } finally {
        setLoading(false);
      }
    },
    [fetchAllItems]
  );

  const handleSearch = async () => {
    const trimmedSearchText = searchText.trim();

    if (!trimmedSearchText) {
      fetchRandomItems();
      return;
    }

    try {
      setLoading(true);
      setError("");
      setIsSearchMode(true);
      setSubmittedSearchText(trimmedSearchText);

      const searchUrl = `${API_URL}?search=${encodeURIComponent(trimmedSearchText)}`;
      const searchedItems = await fetchAllItems(searchUrl);

      setItems(searchedItems.slice(0, FEATURED_ITEMS_LIMIT));
    } catch (searchError) {
      setError(searchError.message || "Unable to load search results.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchText("");
    setSubmittedSearchText("");
    fetchRandomItems();
  };

  const handleToggleWishlist = (item) => {
    toggleWishlistItem(item);
    syncWishlist();
  };

  useEffect(() => {
    const controller = new AbortController();

    fetchRandomItems(controller.signal);
    syncWishlist();

    window.addEventListener("wishlistUpdated", syncWishlist);
    window.addEventListener("storage", syncWishlist);

    return () => {
      controller.abort();
      window.removeEventListener("wishlistUpdated", syncWishlist);
      window.removeEventListener("storage", syncWishlist);
    };
  }, [fetchRandomItems, syncWishlist]);

  return (
    <>
      <Box
        sx={{
          width: "100%",
          minHeight: { xs: 520, sm: 560, md: 650 },
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.55)), url(/Foods.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          px: 2,
          py: { xs: 4, md: 6 },
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 920,
            textAlign: "center",
            color: "white",
          }}
        >
          <Chip
            icon={<StarRoundedIcon sx={{ color: "#fff !important" }} />}
            label="Fresh & Tasty Everyday"
            sx={{
              mb: 2.5,
              px: 1,
              color: "#fff",
              fontWeight: "bold",
              backgroundColor: "rgba(255,255,255,0.16)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          />

          <Typography
            component="h1"
            sx={{
              fontWeight: 800,
              lineHeight: 1.15,
              mb: 2,
              fontSize: {
                xs: "2rem",
                sm: "2.7rem",
                md: "3.5rem",
                lg: "4rem",
              },
            }}
          >
            Quick & Hot Food,
            <br />
            Delivered to You
          </Typography>

          <Typography
            sx={{
              maxWidth: 700,
              mx: "auto",
              mb: 4,
              color: "rgba(255,255,255,0.9)",
              fontSize: {
                xs: "1rem",
                sm: "1.08rem",
                md: "1.2rem",
              },
            }}
          >
            Discover delicious meals, fast delivery, and your favorite dishes
            all in one place.
          </Typography>

          <Box
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              handleSearch();
            }}
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 1.5,
              justifyContent: "center",
              alignItems: "center",
              maxWidth: 760,
              mx: "auto",
              p: { xs: 1.5, sm: 1.8 },
              borderRadius: "22px",
              backgroundColor: "rgba(255,255,255,0.14)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            <TextField
              placeholder="Search your favorite food..."
              variant="outlined"
              fullWidth
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              sx={{
                backgroundColor: "#fff",
                borderRadius: "16px",
                "& .MuiOutlinedInput-root": {
                  borderRadius: "16px",
                },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              endIcon={<SearchIcon />}
              disabled={loading}
              sx={{
                minWidth: { xs: "100%", sm: 170 },
                height: 56,
                borderRadius: "16px",
                backgroundColor: "#ff9800",
                fontWeight: "bold",
                textTransform: "none",
                fontSize: "1rem",
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: "#f57c00",
                  boxShadow: "none",
                },
              }}
            >
              Search Food
            </Button>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          width: "100%",
          textAlign: "center",
          py: { xs: 4, md: 6 },
          px: 2,
          backgroundColor: "#fff",
        }}
      >
        <Typography
          variant="h2"
          sx={{
            color: "black",
            fontWeight: "bold",
            fontSize: { xs: "1.8rem", sm: "2.4rem", md: "3rem" },
            mb: 2,
          }}
        >
          {isSearchMode ? "Search Results" : "Most Loved Dishes This Month"}
        </Typography>

        <Typography
          component="span"
          sx={{
            display: "inline-block",
            backgroundColor: "red",
            color: "white",
            fontWeight: "bold",
            fontSize: { xs: "1rem", sm: "1.2rem" },
            px: 3,
            py: 1,
            borderRadius: 2,
          }}
        >
          {isSearchMode ? `Results for "${submittedSearchText}"` : "Top Picks"}
        </Typography>
      </Box>

      <Box
        sx={{
          background: "linear-gradient(180deg, #ffffff 0%, #f6f9fc 100%)",
          px: { xs: 2, sm: 3, md: 4 },
          pb: { xs: 4, sm: 5, md: 7 },
        }}
      >
        {isSearchMode && (
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Button
              variant="outlined"
              onClick={handleClearSearch}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                fontWeight: "bold",
              }}
            >
              Clear Search
            </Button>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ maxWidth: 900, mx: "auto", mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box
            sx={{
              minHeight: 250,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <>
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
              {items.length > 0 ? (
                items.map((item) => {
                  const isWishlisted = wishlistIdSet.has(String(item.id));

                  return (
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
                        transition: "all 0.3s ease",
                        backgroundColor: "#fff",
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
                          alt={item.name}
                          onError={(event) => {
                            event.currentTarget.src = PLACEHOLDER_IMAGE;
                          }}
                          sx={{ objectFit: "cover" }}
                        />

                        <IconButton
                          aria-label={
                            isWishlisted
                              ? `Remove ${item.name} from wishlist`
                              : `Add ${item.name} to wishlist`
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleWishlist(item);
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
                          {isWishlisted ? (
                            <FavoriteIcon sx={{ color: "red" }} />
                          ) : (
                            <FavoriteBorderIcon sx={{ color: "#333" }} />
                          )}
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
                          {item.name}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{
                            color: "text.secondary",
                            mb: 1.5,
                            minHeight: 44,
                          }}
                        >
                          {item.description?.length > 65
                            ? `${item.description.slice(0, 65)}...`
                            : item.description || "No description available."}
                        </Typography>

                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 2,
                            flexWrap: "wrap",
                          }}
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
                        </Box>

                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 1,
                            mb: 1.5,
                          }}
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
                        </Box>

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
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/product/${item.id}`);
                          }}
                          endIcon={item.is_available ? <ArrowForwardIcon /> : null}
                          sx={{
                            mt: "auto",
                            py: 1.1,
                            borderRadius: 2.5,
                            fontWeight: "bold",
                            textTransform: "none",
                            backgroundColor: item.is_available
                              ? "#ff9800"
                              : "#9e9e9e",
                            "&:hover": {
                              backgroundColor: item.is_available
                                ? "#f57c00"
                                : "#9e9e9e",
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
                  );
                })
              ) : (
                <Box
                  sx={{
                    gridColumn: "1 / -1",
                    textAlign: "center",
                    py: 6,
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    No items found.
                  </Typography>

                  <Button
                    variant="outlined"
                    onClick={handleClearSearch}
                    sx={{ textTransform: "none" }}
                  >
                    Show Top Picks Again
                  </Button>
                </Box>
              )}
            </Box>

            <Box sx={{ textAlign: "center", mt: 5 }}>
              <Button
                variant="contained"
                onClick={() => navigate("/menu")}
                endIcon={<ArrowForwardIcon />}
                sx={{
                  backgroundColor: "#1976d2",
                  px: 4,
                  py: 1.2,
                  borderRadius: 3,
                  fontWeight: "bold",
                  textTransform: "none",
                  boxShadow: "none",
                  "&:hover": {
                    backgroundColor: "#1565c0",
                    boxShadow: "none",
                  },
                }}
              >
                View Full Menu
              </Button>
            </Box>
          </>
        )}
      </Box>
    </>
  );
};

export default Home;