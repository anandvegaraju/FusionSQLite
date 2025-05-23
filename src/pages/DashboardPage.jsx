import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button'; // For logout

import ConnectionPanel from '../components/Layout/ConnectionPanel';
import QueryEditorPanel from '../components/Layout/QueryEditorPanel';
import ResultsPanel from '../components/Layout/ResultsPanel';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';


const drawerWidth = 280; // Width of the left connection panel

export default function DashboardPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();


  const handleDrawerToggle = () => {
    if (!isClosing) {
      setMobileOpen(!mobileOpen);
    }
  };
  
  const handleDrawerClose = () => {
    setIsClosing(true);
    setMobileOpen(false);
  };

  const handleDrawerTransitionEnd = () => {
    setIsClosing(false);
  };

  const handleLogout = () => {
    logout();
    enqueueSnackbar('You have been logged out.', { variant: 'info' });
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1, // Keep app bar above drawer
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }} // Show only on small screens
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Fusion SQL PWA
          </Typography>
          <Typography variant="subtitle1" sx={{ mr: 2 }}>
            Welcome, {user?.username || 'User'}!
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      
      <Box sx={{ display: 'flex', flexGrow: 1, mt: '64px' /* AppBar height */ }}>
        {/* Left Panel (Navigation/Connection Management) */}
        <Drawer
          variant="temporary" // Temporary for mobile
          open={mobileOpen}
          onTransitionEnd={handleDrawerTransitionEnd}
          onClose={handleDrawerClose}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, top: '64px', height: 'calc(100% - 64px)' },
          }}
        >
          <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: [1] }}>
            <IconButton onClick={handleDrawerClose}>
              <ChevronLeftIcon />
            </IconButton>
          </Toolbar>
          <Divider />
          <ConnectionPanel />
        </Drawer>
        <Drawer // Permanent for desktop
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, position: 'relative', height: '100%' },
          }}
          open // Permanent drawer is always open on desktop
        >
          <ConnectionPanel />
        </Drawer>

        {/* Right Area (Query Editor and Results) */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 1, // Reduced padding
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 64px)', // Full height minus AppBar
            overflow: 'hidden', // Prevent main box from scrolling
          }}
        >
          {/* Top-Right Panel (Query Editor) */}
          <Box sx={{ 
            height: '50%', // Adjust as needed, e.g., '60%' or fixed height
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto', // Scroll if content overflows
            mb: 1, // Margin between editor and results
          }}>
            <QueryEditorPanel />
          </Box>

          {/* Bottom-Right Panel (Results/Output) */}
          <Box sx={{ 
            height: '50%', // Adjust as needed
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto', // Scroll if content overflows
          }}>
            <ResultsPanel />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
