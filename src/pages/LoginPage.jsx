import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { useSnackbar } from 'notistack';

import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
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

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error: authError } = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [formError, setFormError] = useState('');


  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!formData.email || !formData.password) {
      setFormError('Email and password are required.');
      enqueueSnackbar('Email and password are required.', { variant: 'error' });
      return;
    }
    try {
      await login(formData.email, formData.password);
      enqueueSnackbar('Login successful!', { variant: 'success' });
      navigate('/');
    } catch (error) {
      // Error is already set in authStore, but we can also display it via snackbar
      enqueueSnackbar(error.message || 'Login failed. Please check your credentials.', { variant: 'error' });
      setFormError(error.message || 'Login failed.');
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
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={formData.email}
            onChange={handleChange}
            error={!!formError || !!authError}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            error={!!formError || !!authError}
          />
          { (formError || authError) && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {formError || authError}
            </Typography>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>
          <Grid container>
            <Grid item>
              <Link component={RouterLink} to="/register" variant="body2">
                {"Don't have an account? Sign Up"}
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
      <Copyright sx={{ mt: 8, mb: 4 }} />
    </Container>
  );
}
