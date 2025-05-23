import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useSnackbar } from 'notistack';

import useConnectionStore from '../../store/connectionStore';

export default function ConnectionDialog({ open, onClose, connection: existingConnection }) {
  const { addConnection, updateConnection, testConnection: apiTestConnection, loading: storeLoading } = useConnectionStore();
  const { enqueueSnackbar } = useSnackbar();

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    username: '',
    password: '', // Password will only be sent, not stored back in list view
  });
  const [errors, setErrors] = useState({});
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }

  useEffect(() => {
    if (existingConnection) {
      setFormData({
        name: existingConnection.name || '',
        url: existingConnection.url || '',
        username: existingConnection.fusion_username || '', // field name from backend
        password: '', // Always clear password field for existing connections
      });
      setTestResult(null); // Clear previous test results
    } else {
      setFormData({ name: '', url: '', username: '', password: '' });
      setTestResult(null);
    }
    setErrors({}); // Clear errors when dialog opens or connection changes
  }, [existingConnection, open]);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
    // Clear test result if form data changes
    if (testResult) setTestResult(null); 
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Connection name is required';
    if (!formData.url) {
        newErrors.url = 'Instance URL is required';
    } else {
        try {
            // Basic URL validation
            new URL(formData.url);
        } catch (_) {
            newErrors.url = 'Invalid URL format (e.g., http://example.com)';
        }
    }
    if (!formData.username) newErrors.username = 'Fusion username is required';
    // Password is required for new connections or if user wants to test/save an existing one with a new password
    if (!existingConnection && !formData.password) newErrors.password = 'Password is required for new connections';
    // For existing connections, password is only required if they intend to change it or test it.
    // The save operation can proceed without password if they don't provide one (meaning don't update password).

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    if (!formData.url || !formData.username || !formData.password) {
        enqueueSnackbar('URL, Username, and Password are required to test connection.', { variant: 'warning'});
        setErrors(prev => ({
            ...prev,
            url: !formData.url ? "URL required for test" : prev.url,
            username: !formData.username ? "Username required for test" : prev.username,
            password: !formData.password ? "Password required for test" : prev.password,
        }));
        return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await apiTestConnection({ 
        url: formData.url, 
        username: formData.username, 
        password: formData.password 
      });
      setTestResult(result);
      if (result.success) {
        enqueueSnackbar(result.message || 'Connection test successful!', { variant: 'success' });
      } else {
        enqueueSnackbar(result.message || result.error || 'Connection test failed.', { variant: 'error' });
      }
    } catch (error) {
      const message = error.message || 'Connection test failed due to an error.';
      setTestResult({ success: false, message });
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) {
      enqueueSnackbar('Please correct the form errors.', { variant: 'warning' });
      return;
    }

    const connectionPayload = {
      name: formData.name,
      url: formData.url,
      fusionUsername: formData.username, // Ensure backend field name match
    };

    // Only include password if it's provided.
    // For updates, if password is empty, backend should not update it.
    if (formData.password) {
      connectionPayload.password = formData.password;
    }

    try {
      if (existingConnection) {
        await updateConnection(existingConnection.id, connectionPayload);
        enqueueSnackbar('Connection updated successfully!', { variant: 'success' });
      } else {
        await addConnection(connectionPayload);
        enqueueSnackbar('Connection added successfully!', { variant: 'success' });
      }
      onClose(true); // Pass true to indicate refresh might be needed
    } catch (error) {
      enqueueSnackbar(error.message || 'Failed to save connection.', { variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>{existingConnection ? 'Edit Connection' : 'Add New Connection'}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{mb: 2}}>
          {existingConnection 
            ? 'Update the details for your Oracle Fusion connection.' 
            : 'Enter the details for your new Oracle Fusion connection.'}
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          id="name"
          name="name"
          label="Connection Name"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.name}
          onChange={handleChange}
          error={!!errors.name}
          helperText={errors.name}
          sx={{mb:2}}
        />
        <TextField
          margin="dense"
          id="url"
          name="url"
          label="Instance URL (e.g., https://your-fusion-instance.oraclecloud.com)"
          type="url"
          fullWidth
          variant="outlined"
          value={formData.url}
          onChange={handleChange}
          error={!!errors.url}
          helperText={errors.url}
          sx={{mb:2}}
        />
        <TextField
          margin="dense"
          id="username"
          name="username"
          label="Fusion Username"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.username}
          onChange={handleChange}
          error={!!errors.username}
          helperText={errors.username}
          sx={{mb:2}}
        />
        <TextField
          margin="dense"
          id="password"
          name="password"
          label={existingConnection ? "New Password (leave blank to keep unchanged)" : "Fusion Password"}
          type="password"
          fullWidth
          variant="outlined"
          value={formData.password}
          onChange={handleChange}
          error={!!errors.password}
          helperText={errors.password}
          sx={{mb:2}}
        />
        {testResult && (
            <Typography 
                variant="body2" 
                color={testResult.success ? 'success.main' : 'error.main'}
                sx={{mt:1, mb:1}}
            >
                Test Result: {testResult.message || (testResult.success ? "Success" : "Failed")}
            </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{p: '16px 24px'}}>
        <Box sx={{display: 'flex', alignItems: 'center', mr: 'auto' }}>
            <Button 
                onClick={handleTestConnection} 
                disabled={isTesting || storeLoading || !formData.password} // Require password to be entered for test
                color="secondary"
            >
                {isTesting ? <CircularProgress size={20} sx={{mr:1}}/> : null}
                Test Connection
            </Button>
        </Box>
        <Button onClick={() => onClose(false)} color="inherit">Cancel</Button>
        <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={storeLoading || isTesting || (existingConnection && !formData.password && !testResult?.success && !Object.keys(errors).some(key => !!formData[key] && key !== 'password'))} // More nuanced disable logic can be added
        >
          {storeLoading ? <CircularProgress size={24} color="inherit"/> : (existingConnection ? 'Save Changes' : 'Add Connection')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
