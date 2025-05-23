import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import useAuthStore from '../store/authStore'; // Assuming this is your Zustand store
import { useSnackbar } from 'notistack';

import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'; // Or PersonAddOutlinedIcon
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';

function Copyright(props) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright © '}
      <Link color="inherit" href="#">
        Fusion SQL PWA
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error: authError } = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!formData.username) errors.username = 'Username is required';
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email address is invalid';
    }
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) {
      enqueueSnackbar('Please correct the form errors.', { variant: 'warning' });
      return;
    }
    try {
      await register(formData.username, formData.email, formData.password);
      enqueueSnackbar('Registration successful! Please log in.', { variant: 'success' });
      navigate('/login');
    } catch (error) {
      enqueueSnackbar(error.message || 'Registration failed. Please try again.', { variant: 'error' });
      // Error is also available in authStore.error if needed
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <LockOutlinedIcon /> {/* Or PersonAddOutlinedIcon */}
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign up
        </Typography>
        <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                autoComplete="username"
                name="username"
                required
                fullWidth
                id="username"
                label="Username"
                autoFocus
                value={formData.username}
                onChange={handleChange}
                error={!!formErrors.username || (authError && authError.toLowerCase().includes('username'))}
                helperText={formErrors.username || (authError && authError.toLowerCase().includes('username') ? authError : '')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                error={!!formErrors.email || (authError && authError.toLowerCase().includes('email'))}
                helperText={formErrors.email || (authError && authError.toLowerCase().includes('email') ? authError : '')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                error={!!formErrors.password}
                helperText={formErrors.password}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                id="confirmPassword"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={!!formErrors.confirmPassword}
                helperText={formErrors.confirmPassword}
              />
            </Grid>
          </Grid>
          {authError && !formErrors.username && !formErrors.email && ( // Display general auth error if not field specific
             <Typography color="error" variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                {authError}
             </Typography>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Sign Up'}
          </Button>
          <Grid container justifyContent="flex-end">
            <Grid item>
              <Link component={RouterLink} to="/login" variant="body2">
                Already have an account? Sign in
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
      <Copyright sx={{ mt: 5 }} />
    </Container>
  );
}
