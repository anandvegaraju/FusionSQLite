import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Basic global styles
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';

// Basic theme configuration (can be expanded)
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Example primary color
    },
    secondary: {
      main: '#dc004e', // Example secondary color
    },
    // Add dark mode configuration later if needed
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline /> {/* Normalize CSS and apply background color */}
        <SnackbarProvider 
          maxSnack={3} 
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <App />
        </SnackbarProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
