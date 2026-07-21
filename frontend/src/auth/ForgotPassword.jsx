import React, { useState, useContext } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/v1/',
  headers: { 'Content-Type': 'application/json' }
});

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { setResetEmail, setOtpVerified } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const getErrorMessage = (err, fallback) => {
    const data = err.response?.data;
    if (!data) return fallback;

    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.email)) return data.email[0];
    if (typeof data.email === 'string') return data.email;
    if (Array.isArray(data.non_field_errors)) return data.non_field_errors[0];
    if (typeof data.non_field_errors === 'string') return data.non_field_errors;

    return fallback;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter your registered email!',
        severity: 'error'
      });
      return;
    }

    setLoading(true);

    try {
      await api.post('password-reset-request/', { email });

      setResetEmail(email);
      setOtpVerified(false);

      setSnackbar({
        open: true,
        message: 'OTP sent successfully. Redirecting...',
        severity: 'success'
      });

      setTimeout(() => {
        navigate('/otp-verification', { replace: true });
      }, 1000);
    } catch (err) {
      setSnackbar({
        open: true,
        message: getErrorMessage(err, 'Failed to send OTP!'),
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundImage: 'url(/Foods.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: 3
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: '100%',
          maxWidth: 600,
          backgroundColor: 'white',
          padding: 4,
          borderRadius: 6,
          boxShadow: 12,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: '#1976d2',
            textAlign: 'center',
            marginBottom: 4
          }}
        >
          Enter Your Registered Email
        </Typography>

        <TextField
          type="email"
          placeholder="Enter Your Registered Email"
          fullWidth
          variant="outlined"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{
            marginBottom: 3,
            '& .MuiOutlinedInput-root': { borderRadius: 30 },
            '& .MuiOutlinedInput-notchedOutline': { border: '1px solid #1976d2' },
            '& .MuiInputBase-input': { color: 'black' }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon sx={{ color: '#1976d2' }} />
              </InputAdornment>
            )
          }}
        />

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading}
          sx={{
            padding: 1.5,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: 30,
            '&:hover': { backgroundColor: '#1565c0', boxShadow: 6 }
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            <>
              <SendIcon sx={{ marginRight: 1 }} />
              Send OTP
            </>
          )}
        </Button>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ForgotPassword;