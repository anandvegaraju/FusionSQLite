import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StorageIcon from '@mui/icons-material/Storage'; // For connections
import CircularProgress from '@mui/material/CircularProgress';
import { useSnackbar } from 'notistack';

import useConnectionStore from '../../store/connectionStore';
import ConnectionDialog from '../Connections/ConnectionDialog'; // To be created

export default function ConnectionPanel() {
  const { 
    connections, 
    fetchConnections, 
    deleteConnection,
    setActiveConnection, // Method to set the globally active connection
    activeConnection,   // The currently active connection object
    loading, 
    error 
  } = useConnectionStore();
  
  const { enqueueSnackbar } = useSnackbar();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState(null); // Connection object to edit

  useEffect(() => {
    fetchConnections().catch(err => {
      enqueueSnackbar(`Failed to fetch connections: ${err.message}`, { variant: 'error' });
    });
  }, [fetchConnections, enqueueSnackbar]);

  const handleAddConnection = () => {
    setEditingConnection(null);
    setIsDialogOpen(true);
  };

  const handleEditConnection = (conn) => {
    setEditingConnection(conn);
    setIsDialogOpen(true);
  };

  const handleDeleteConnection = async (id) => {
    if (window.confirm('Are you sure you want to delete this connection?')) {
      try {
        await deleteConnection(id);
        enqueueSnackbar('Connection deleted successfully.', { variant: 'success' });
      } catch (err) {
        enqueueSnackbar(`Failed to delete connection: ${err.message}`, { variant: 'error' });
      }
    }
  };
  
  const handleSelectConnection = (conn) => {
    setActiveConnection(conn);
    enqueueSnackbar(`Connection "${conn.name}" selected.`, { variant: 'info' });
  };

  const handleDialogClose = (refresh) => {
    setIsDialogOpen(false);
    setEditingConnection(null);
    if (refresh) {
      fetchConnections().catch(err => {
        enqueueSnackbar(`Failed to refresh connections: ${err.message}`, { variant: 'error' });
      });
    }
  };

  if (loading && !connections.length) { // Show loader only on initial load
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Typography color="error" sx={{ p: 2 }}>Error: {error}</Typography>;
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="div">
          Connections
        </Typography>
        <IconButton color="primary" onClick={handleAddConnection} aria-label="add connection">
          <AddCircleOutlineIcon />
        </IconButton>
      </Box>
      <Divider />
      <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {connections.length === 0 && !loading && (
          <ListItem>
            <ListItemText primary="No connections found. Add one to get started." sx={{textAlign: 'center', color: 'text.secondary'}} />
          </ListItem>
        )}
        {connections.map((conn) => (
          <ListItem 
            key={conn.id} 
            disablePadding
            secondaryAction={
              <>
                <IconButton edge="end" aria-label="edit" onClick={() => handleEditConnection(conn)} size="small" sx={{mr: 0.5}}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteConnection(conn.id)} size="small">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </>
            }
            sx={{ 
              backgroundColor: activeConnection?.id === conn.id ? 'action.selected' : 'transparent',
              '&:hover': {
                backgroundColor: activeConnection?.id === conn.id ? 'action.selected' : 'action.hover',
              }
            }}
          >
            <ListItemButton onClick={() => handleSelectConnection(conn)}>
              <ListItemIcon sx={{minWidth: 'auto', mr: 1.5}}>
                <StorageIcon fontSize="small" color={activeConnection?.id === conn.id ? "primary" : "action"}/>
              </ListItemIcon>
              <ListItemText 
                primary={conn.name} 
                secondary={`${conn.fusion_username}@${new URL(conn.url).hostname}`}
                primaryTypographyProps={{ noWrap: true, variant: 'body2', fontWeight: activeConnection?.id === conn.id ? 'bold' : 'normal' }}
                secondaryTypographyProps={{ noWrap: true, variant: 'caption' }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      {/* Placeholder for Saved Queries/History tabs if needed later */}
      {/* <Divider />
      <Box sx={{p:1}}>
        <Button fullWidth variant="outlined" size="small">Saved Queries</Button>
      </Box> */}
      <ConnectionDialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        connection={editingConnection}
      />
    </Box>
  );
}
