import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  Divider,
  TextField,
  Rating,
  Stack,
  Avatar,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SendIcon from '@mui/icons-material/Send';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import ReviewsRoundedIcon from '@mui/icons-material/ReviewsRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import StraightenRoundedIcon from '@mui/icons-material/StraightenRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const API_BASE_URL = 'http://127.0.0.1:8000';
const API_URL = `${API_BASE_URL}/api/v1/food-items/`;

const normalizeToken = (rawToken) => {
  if (!rawToken) return '';
  let token = String(rawToken).trim();
  token = token.replace(/^Bearer\s+/i, '').trim();

  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }

  return token;
};

const isJWT = (token) => !!token && token.split('.').length === 3;

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: '',
  });

  const getAuthToken = useCallback(() => {
    const rawToken =
      user?.access_token ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('access') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token') ||
      '';

    const token = normalizeToken(rawToken);

    if (!isJWT(token)) {
      return '';
    }

    return token;
  }, [user]);

  const getAuthHeaders = useCallback(() => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getAuthToken]);

  const getImageUrl = (image) => {
    if (!image) return 'https://via.placeholder.com/700x500?text=Food+Item';
    if (image.startsWith('http')) return image;
    return `${API_BASE_URL}${image}`;
  };

  const formatPrice = (value) => {
    if (value === null || value === undefined || value === '') return '0';
    return Number(value).toLocaleString();
  };

  const formatSize = (size) => {
    if (!size) return 'Standard';
    return size.charAt(0).toUpperCase() + size.slice(1);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  };

  const fetchProductDetails = useCallback(async () => {
    try {
      setLoading(true);
      setPageError('');

      const response = await fetch(`${API_URL}${id}/`, {
        headers: {
          ...getAuthHeaders(),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Product details fetch nahi ho sake.');
      }

      setProduct(data);

      if (data.current_user_review) {
        setReviewData({
          rating: data.current_user_review.rating || 5,
          comment: data.current_user_review.comment || '',
        });
      } else {
        setReviewData({
          rating: 5,
          comment: '',
        });
      }
    } catch (error) {
      setPageError(error.message || 'Kuch ghalat ho gaya.');
    } finally {
      setLoading(false);
    }
  }, [id, getAuthHeaders]);

  useEffect(() => {
    fetchProductDetails();
  }, [fetchProductDetails]);

  const handleAddToCart = () => {
    if (!product || !product.is_available) return;

    const newItem = {
      id: product.id,
      name: product.name,
      image: product.image,
      price: Number(product.price) || 0,
      category: product.category || '',
      size: product.size || 'standard',
      is_available: product.is_available,
      quantity: 1,
    };

    const existingCart = JSON.parse(localStorage.getItem('cartItems')) || [];

    const existingItemIndex = existingCart.findIndex(
      (item) => String(item.id) === String(product.id)
    );

    if (existingItemIndex !== -1) {
      existingCart[existingItemIndex].quantity += 1;
    } else {
      existingCart.push(newItem);
    }

    localStorage.setItem('cartItems', JSON.stringify(existingCart));

    setReviewSuccess('Product cart mein add ho gaya.');
    setTimeout(() => {
      setReviewSuccess('');
    }, 2000);

    navigate('/cart');
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();

    const token = getAuthToken();

    if (!token) {
      setReviewError('Aap ka login session invalid hai. Dobara login karein.');
      setReviewSuccess('');
      return;
    }

    if (!reviewData.comment.trim()) {
      setReviewError('Comment likhna zaroori hai.');
      setReviewSuccess('');
      return;
    }

    try {
      setSubmitting(true);
      setReviewError('');
      setReviewSuccess('');

      const response = await fetch(`${API_URL}${id}/add-review/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: reviewData.rating,
          comment: reviewData.comment.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            'Review submit nahi ho saka. Dobara login karein.'
        );
      }

      setReviewSuccess('Review successfully submit ho gaya.');
      await fetchProductDetails();
    } catch (error) {
      const message = String(error.message || '');

      if (
        message.toLowerCase().includes('token') ||
        message.toLowerCase().includes('not valid') ||
        message.toLowerCase().includes('invalid')
      ) {
        setReviewError('Aap ka login session expire ya invalid hai. Please dobara login karein.');
      } else {
        setReviewError(message || 'Review submit nahi ho saka.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%)',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (pageError) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{pageError}</Alert>
      </Box>
    );
  }

  if (!product) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">Product nahi mila.</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%)',
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Box sx={{ maxWidth: '1240px', mx: 'auto', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIosNewRoundedIcon />}
          onClick={() => navigate(-1)}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 3,
            px: 2,
            color: '#1f2937',
          }}
        >
          Back
        </Button>
      </Box>

      <Paper
        elevation={0}
        sx={{
          maxWidth: '1240px',
          mx: 'auto',
          p: { xs: 2, md: 4 },
          borderRadius: 5,
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 12px 40px rgba(15, 23, 42, 0.08)',
          border: '1px solid rgba(226,232,240,0.9)',
        }}
      >
        <Grid container spacing={4}>
          <Grid item xs={12} lg={6}>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 5,
                background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)',
                border: '1px solid #fde7cf',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box
                component="img"
                src={getImageUrl(product.image)}
                alt={product.name}
                sx={{
                  width: '100%',
                  height: { xs: 290, sm: 420, md: 520 },
                  objectFit: 'cover',
                  borderRadius: 4,
                  display: 'block',
                }}
              />

              <Stack
                direction="row"
                spacing={1}
                sx={{
                  position: 'absolute',
                  top: 24,
                  left: 24,
                  flexWrap: 'wrap',
                  maxWidth: '80%',
                }}
              >
                <Chip
                  label={product.is_available ? 'Available' : 'Not Available'}
                  color={product.is_available ? 'success' : 'error'}
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  icon={<StarRoundedIcon />}
                  label={`${Number(product.average_rating || 0).toFixed(1)} Rating`}
                  sx={{
                    fontWeight: 700,
                    backgroundColor: 'rgba(255,255,255,0.94)',
                  }}
                />
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={6}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Chip
                icon={<LocalOfferRoundedIcon />}
                label="Popular Choice"
                sx={{
                  width: 'fit-content',
                  mb: 2,
                  fontWeight: 700,
                  backgroundColor: '#fff4e5',
                  color: '#b45309',
                }}
              />

              <Typography
                variant="h3"
                sx={{
                  fontWeight: 900,
                  mb: 1.5,
                  fontSize: { xs: '2rem', md: '2.8rem' },
                  lineHeight: 1.15,
                  color: '#0f172a',
                }}
              >
                {product.name}
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: '#475569',
                  mb: 3,
                  lineHeight: 1.9,
                  fontSize: '1rem',
                }}
              >
                {product.description}
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.2,
                  mb: 2.5,
                  flexWrap: 'wrap',
                }}
              >
                <Rating
                  value={Number(product.average_rating || 0)}
                  precision={0.1}
                  readOnly
                />
                <Typography sx={{ fontWeight: 800, color: '#0f172a' }}>
                  {Number(product.average_rating || 0).toFixed(1)} / 5
                </Typography>
                <Typography sx={{ color: '#64748b' }}>
                  ({product.review_count} reviews)
                </Typography>
              </Box>

              <Typography
                sx={{
                  fontSize: { xs: '2rem', md: '2.3rem' },
                  fontWeight: 900,
                  color: '#1976d2',
                  mb: 3,
                }}
              >
                PKR {formatPrice(product.price)}
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      border: '1px solid #e5edf5',
                      height: '100%',
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <CategoryRoundedIcon sx={{ color: '#f59e0b' }} />
                      <Box>
                        <Typography sx={{ fontSize: '0.85rem', color: '#64748b' }}>
                          Category
                        </Typography>
                        <Typography sx={{ fontWeight: 800 }}>
                          {product.category}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      border: '1px solid #e5edf5',
                      height: '100%',
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <StraightenRoundedIcon sx={{ color: '#2563eb' }} />
                      <Box>
                        <Typography sx={{ fontSize: '0.85rem', color: '#64748b' }}>
                          Size
                        </Typography>
                        <Typography sx={{ fontWeight: 800 }}>
                          {formatSize(product.size)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      border: '1px solid #e5edf5',
                      height: '100%',
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Inventory2RoundedIcon
                        sx={{ color: product.is_available ? '#16a34a' : '#dc2626' }}
                      />
                      <Box>
                        <Typography sx={{ fontSize: '0.85rem', color: '#64748b' }}>
                          Stock Status
                        </Typography>
                        <Typography sx={{ fontWeight: 800 }}>
                          {product.is_available ? 'Available' : 'Not Available'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      border: '1px solid #e5edf5',
                      height: '100%',
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <ReviewsRoundedIcon sx={{ color: '#7c3aed' }} />
                      <Box>
                        <Typography sx={{ fontSize: '0.85rem', color: '#64748b' }}>
                          Total Reviews
                        </Typography>
                        <Typography sx={{ fontWeight: 800 }}>
                          {product.review_count}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 'auto' }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<ShoppingCartIcon />}
                  disabled={!product.is_available}
                  onClick={handleAddToCart}
                  sx={{
                    py: 1.4,
                    px: 4,
                    borderRadius: 3,
                    fontWeight: 'bold',
                    textTransform: 'none',
                    backgroundColor: product.is_available ? '#ff9800' : '#9e9e9e',
                    boxShadow: 'none',
                    '&:hover': {
                      backgroundColor: product.is_available ? '#f57c00' : '#9e9e9e',
                      boxShadow: 'none',
                    },
                  }}
                >
                  {product.is_available ? 'Add to Cart' : 'Not Available'}
                </Button>

                <Chip
                  label={`${product.review_count} Customer Reviews`}
                  sx={{
                    height: 50,
                    borderRadius: 3,
                    px: 2,
                    fontWeight: 700,
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                />
              </Stack>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 5 }} />

        {reviewSuccess && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 3 }}>
            {reviewSuccess}
          </Alert>
        )}

        {reviewError && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
            {reviewError}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mb: 5 }}>
          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 4,
                border: '1px solid #e5edf5',
                height: '100%',
                background: 'linear-gradient(135deg, #fffdf7 0%, #ffffff 100%)',
              }}
            >
              <Typography sx={{ color: '#64748b', mb: 1 }}>Average Rating</Typography>
              <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', mb: 1 }}>
                {Number(product.average_rating || 0).toFixed(1)}
              </Typography>
              <Rating value={Number(product.average_rating || 0)} precision={0.1} readOnly />
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 4,
                border: '1px solid #e5edf5',
                height: '100%',
              }}
            >
              <Typography sx={{ color: '#64748b', mb: 1 }}>Total Reviews</Typography>
              <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a' }}>
                {product.review_count}
              </Typography>
              <Typography sx={{ color: '#64748b', mt: 1 }}>
                Real feedback from customers
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 4,
                border: '1px solid #e5edf5',
                height: '100%',
              }}
            >
              <Typography sx={{ color: '#64748b', mb: 1 }}>Your Review Status</Typography>
              <Typography sx={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>
                {product.current_user_review ? 'Already Reviewed' : 'Not Reviewed Yet'}
              </Typography>
              <Typography sx={{ color: '#64748b', mt: 1 }}>
                {product.current_user_review
                  ? 'Aap apna review update kar sakte hain.'
                  : 'Neeche form se apna feedback dein.'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ mb: 5 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              mb: 3,
              fontSize: { xs: '1.6rem', md: '2rem' },
              color: '#0f172a',
            }}
          >
            All Reviews
          </Typography>

          {product.reviews && product.reviews.length > 0 ? (
            <Stack spacing={2.2}>
              {product.reviews.map((review) => (
                <Paper
                  key={review.id}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 4,
                    border: '1px solid #e7edf4',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    justifyContent="space-between"
                    sx={{ mb: 1.5 }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: '#ffedd5', color: '#c2410c', fontWeight: 800 }}>
                        {getInitials(review.reviewer_name)}
                      </Avatar>

                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <PersonRoundedIcon sx={{ fontSize: 18, color: '#64748b' }} />
                          <Typography sx={{ fontWeight: 800, color: '#0f172a' }}>
                            {review.reviewer_name}
                          </Typography>
                        </Stack>
                        <Rating value={review.rating} readOnly size="small" />
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <AccessTimeRoundedIcon sx={{ fontSize: 18, color: '#64748b' }} />
                      <Typography sx={{ color: '#64748b', fontSize: '0.92rem' }}>
                        {new Date(review.created_at).toLocaleString()}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Typography
                    sx={{
                      color: '#475569',
                      lineHeight: 1.8,
                      pl: { sm: 7 },
                    }}
                  >
                    {review.comment}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Alert severity="info" sx={{ borderRadius: 3 }}>
              Abhi tak koi review nahi aaya.
            </Alert>
          )}
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 4,
            background: 'linear-gradient(135deg, #fafcff 0%, #f8fbff 100%)',
            border: '1px solid #e5edf5',
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: 900,
              mb: 2,
              fontSize: { xs: '1.3rem', md: '1.7rem' },
              color: '#0f172a',
            }}
          >
            {product.current_user_review ? 'Update Your Review' : 'Add Your Review'}
          </Typography>

          {product.current_user_name ? (
            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 2.5 }}>
              <Avatar sx={{ bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 800 }}>
                {getInitials(product.current_user_name)}
              </Avatar>
              <Typography sx={{ color: '#475569' }}>
                Reviewing as: <strong>{product.current_user_name}</strong>
              </Typography>
            </Stack>
          ) : (
            <Typography sx={{ mb: 2, color: '#64748b' }}>
              Review add karne ke liye valid login zaroori hai.
            </Typography>
          )}

          <Box component="form" onSubmit={handleReviewSubmit}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 3,
                borderRadius: 3,
                backgroundColor: '#ffffff',
                border: '1px solid #e7edf4',
              }}
            >
              <Typography sx={{ mb: 1, fontWeight: 700, color: '#0f172a' }}>
                Your Rating
              </Typography>
              <Rating
                value={reviewData.rating}
                onChange={(event, newValue) => {
                  setReviewData((prev) => ({
                    ...prev,
                    rating: newValue || 1,
                  }));
                }}
              />
            </Paper>

            <TextField
              fullWidth
              multiline
              minRows={5}
              label="Write your comment"
              placeholder="Apna honest feedback likhein..."
              value={reviewData.comment}
              onChange={(e) =>
                setReviewData((prev) => ({
                  ...prev,
                  comment: e.target.value,
                }))
              }
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  backgroundColor: '#fff',
                },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              endIcon={<SendIcon />}
              disabled={submitting}
              sx={{
                borderRadius: 3,
                px: 4,
                py: 1.25,
                fontWeight: 'bold',
                textTransform: 'none',
                backgroundColor: '#1976d2',
                boxShadow: 'none',
                '&:hover': {
                  backgroundColor: '#1565c0',
                  boxShadow: 'none',
                },
              }}
            >
              {submitting
                ? 'Submitting...'
                : product.current_user_review
                ? 'Update Review'
                : 'Submit Review'}
            </Button>
          </Box>
        </Paper>
      </Paper>
    </Box>
  );
};

export default ProductDetailPage;