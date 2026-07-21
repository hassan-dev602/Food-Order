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
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Paper,
  Rating,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FolderIcon from "@mui/icons-material/Folder";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";

import { getWishlistItems, toggleWishlistItem } from "../utils/wishlist";

const API_BASE_URL = "http://127.0.0.1:8000";
const API_URL = `${API_BASE_URL}/api/v1/food-items/`;
const PAGE_SIZE = 6;
const MAX_PRICE = 5000;
const MAX_CATEGORY_REQUESTS = 20;
const PLACEHOLDER_IMAGE = "https://via.placeholder.com/400x250?text=Food+Item";

const formatPrice = (value) => {
  if (value === null || value === undefined || value === "") return "0";

  return Number(value).toLocaleString();
};

const formatSize = (size) => {
  if (!size) return "Standard";

  return size.charAt(0).toUpperCase() + size.slice(1);
};

const getImageUrl = (image) => {
  if (!image) return PLACEHOLDER_IMAGE;

  return image.startsWith("http") ? image : `${API_BASE_URL}${image}`;
};

const isSameId = (firstId, secondId) => {
  return String(firstId) === String(secondId);
};

const Menu = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState(MAX_PRICE);
  const [page, setPage] = useState(1);

  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [wishlistIds, setWishlistIds] = useState([]);

  const totalPages = Math.ceil(count / PAGE_SIZE);

  const wishlistIdSet = useMemo(() => {
    return new Set(wishlistIds.map((id) => String(id)));
  }, [wishlistIds]);

  const syncWishlist = useCallback(() => {
    const wishlist = getWishlistItems();
    setWishlistIds(wishlist.map((item) => item.id));
  }, []);

  const fetchProducts = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();
        params.append("page", page);
        params.append("page_size", PAGE_SIZE);

        if (search.trim()) {
          params.append("search", search.trim());
        }

        if (category) {
          params.append("category", category);
        }

        if (price < MAX_PRICE) {
          params.append("max_price", price);
        }

        const response = await fetch(`${API_URL}?${params.toString()}`, {
          signal,
        });

        if (!response.ok) {
          throw new Error("Unable to load menu items. Please try again.");
        }

        const data = await response.json();

        setProducts(data.results || []);
        setCount(data.count || 0);
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setError(fetchError.message || "Something went wrong while loading menu items.");
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [page, search, category, price]
  );

  const fetchCategories = useCallback(async (signal) => {
    try {
      setCategoryLoading(true);

      let nextUrl = API_URL;
      const categorySet = new Set();
      let requestCount = 0;

      // Categories are currently collected from food items because FoodItem
      // stores category as text. If the backend later exposes category choices,
      // this can be replaced with a dedicated category endpoint.
      while (nextUrl && requestCount < MAX_CATEGORY_REQUESTS) {
        const response = await fetch(nextUrl, { signal });

        if (!response.ok) {
          break;
        }

        const data = await response.json();

        (data.results || []).forEach((item) => {
          if (item.category) {
            categorySet.add(item.category);
          }
        });

        nextUrl = data.next;
        requestCount += 1;
      }

      setCategories([...categorySet].sort());
    } catch (fetchError) {
      if (fetchError.name !== "AbortError") {
        setCategories([]);
      }
    } finally {
      if (!signal?.aborted) {
        setCategoryLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchCategories(controller.signal);
    syncWishlist();

    window.addEventListener("wishlistUpdated", syncWishlist);
    window.addEventListener("storage", syncWishlist);

    return () => {
      controller.abort();
      window.removeEventListener("wishlistUpdated", syncWishlist);
      window.removeEventListener("storage", syncWishlist);
    };
  }, [fetchCategories, syncWishlist]);

  useEffect(() => {
    const controller = new AbortController();

    fetchProducts(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchProducts]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleCategoryChange = (event) => {
    setCategory(event.target.value);
    setPage(1);
  };

  const handlePriceChange = (event, newValue) => {
    setPrice(newValue);
    setPage(1);
  };

  const handlePageChange = (event, value) => {
    setPage(value);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSearch("");
    setCategory("");
    setPrice(MAX_PRICE);
    setPage(1);
  };

  const handleToggleWishlist = (item) => {
    toggleWishlistItem(item);
    syncWishlist();
  };

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "#f3f6f9",
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 3, sm: 4, md: 5 },
      }}
    >
      <Box sx={{ maxWidth: 1400, mx: "auto" }}>
        <Typography
          variant="h2"
          component="h1"
          sx={{
            textAlign: "center",
            fontWeight: "bold",
            mb: 1,
            fontSize: {
              xs: "1.7rem",
              sm: "2.1rem",
              md: "2.4rem",
              lg: "2.7rem",
            },
          }}
        >
          Find Your Delicious Food Here
        </Typography>

        <Typography
          sx={{
            textAlign: "center",
            color: "text.secondary",
            mb: 4,
            fontSize: { xs: "0.95rem", sm: "1rem" },
          }}
        >
          Search, filter, and explore your favorite dishes from the menu.
        </Typography>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            mb: 4,
            borderRadius: 4,
            border: "1px solid #e7edf4",
            backgroundColor: "#fff",
          }}
        >
          <Box
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              handleSearch();
            }}
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
              gap: 2,
              mb: 3,
            }}
          >
            <Box sx={{ display: "flex", width: "100%" }}>
              <TextField
                fullWidth
                placeholder="Search your favorite food"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                disabled={loading}
                sx={{
                  backgroundColor: "#fff",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px 0 0 12px",
                  },
                }}
              />

              <Button
                type="submit"
                disabled={loading}
                aria-label="Search food items"
                sx={{
                  minWidth: 65,
                  borderRadius: "0 12px 12px 0",
                  backgroundColor: "#1976d2",
                  color: "#fff",
                  "&:hover": {
                    backgroundColor: "#1565c0",
                  },
                }}
              >
                <SearchIcon />
              </Button>
            </Box>

            <FormControl fullWidth>
              <Select
                value={category}
                displayEmpty
                onChange={handleCategoryChange}
                disabled={categoryLoading}
                startAdornment={
                  <InputAdornment position="start">
                    <FolderIcon sx={{ color: "#f4b400" }} />
                  </InputAdornment>
                }
                sx={{
                  backgroundColor: "#fff",
                  borderRadius: 3,
                }}
              >
                <MenuItem value="">All Categories</MenuItem>

                {categoryLoading ? (
                  <MenuItem disabled>Loading categories...</MenuItem>
                ) : (
                  categories.map((categoryName) => (
                    <MenuItem key={categoryName} value={categoryName}>
                      {categoryName}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "center" }}
            sx={{ mb: 1 }}
          >
            <Typography
              sx={{
                fontWeight: "bold",
                fontSize: { xs: "1rem", sm: "1.1rem" },
              }}
            >
              Filter by Price: PKR 0 - PKR {formatPrice(price)}
            </Typography>

            <Button
              variant="outlined"
              onClick={handleResetFilters}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                fontWeight: "bold",
              }}
            >
              Reset Filters
            </Button>
          </Stack>

          <Slider
            value={price}
            onChange={handlePriceChange}
            min={0}
            max={MAX_PRICE}
            step={50}
            valueLabelDisplay="auto"
            sx={{ color: "#8fd3ff" }}
          />
        </Paper>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          sx={{ mb: 3 }}
        >
          <Typography
            sx={{
              color: "text.secondary",
              fontWeight: 500,
              fontSize: { xs: "0.95rem", sm: "1rem" },
            }}
          >
            Showing {products.length} of {count} items
          </Typography>

          {(search || category || price < MAX_PRICE) && (
            <Chip
              label="Filters active"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          )}
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
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
                  lg: "repeat(4, minmax(270px, 320px))",
                },
                justifyContent: "center",
                gap: 3,
              }}
            >
              {products.length > 0 ? (
                products.map((item) => {
                  const isWishlisted = wishlistIdSet.has(String(item.id));

                  return (
                    <Card
                      key={item.id}
                      onClick={() => navigate(`/product/${item.id}`)}
                      sx={{
                        cursor: "pointer",
                        borderRadius: 3,
                        overflow: "hidden",
                        boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                        width: "100%",
                        maxWidth: { xs: "100%", sm: 320 },
                        minHeight: 420,
                        display: "flex",
                        flexDirection: "column",
                        transition: "0.3s",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
                        },
                      }}
                    >
                      <Box sx={{ position: "relative" }}>
                        <CardMedia
                          component="img"
                          height="200"
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
                          p: 2,
                        }}
                      >
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 700,
                            mb: 1,
                            fontSize: { xs: "1.08rem", sm: "1.18rem" },
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
                            fontSize: "0.92rem",
                          }}
                        >
                          {item.description?.length > 60
                            ? `${item.description.slice(0, 60)}...`
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
                              fontSize: "0.75rem",
                            }}
                          />
                        </Box>

                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 1,
                            mb: 2,
                          }}
                        >
                          <Chip
                            label={formatSize(item.size)}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontSize: "0.75rem" }}
                          />

                          <Chip
                            label={item.is_available ? "Available" : "Not Available"}
                            size="small"
                            color={item.is_available ? "success" : "error"}
                            sx={{ fontSize: "0.75rem" }}
                          />
                        </Box>

                        <Button
                          fullWidth
                          variant="contained"
                          disabled={!item.is_available}
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/product/${item.id}`);
                          }}
                          sx={{
                            mt: "auto",
                            py: 1,
                            borderRadius: 2,
                            fontWeight: "bold",
                            fontSize: "0.92rem",
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
                    No food items found.
                  </Typography>

                  <Button
                    variant="outlined"
                    onClick={handleResetFilters}
                    sx={{ textTransform: "none", borderRadius: 2 }}
                  >
                    Reset Filters
                  </Button>
                </Box>
              )}
            </Box>

            {totalPages > 1 && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  mt: 5,
                }}
              >
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  shape="rounded"
                  size="large"
                />
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default Menu;