import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Button from '@mui/material/Button';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import CircularProgress from '@mui/material/CircularProgress';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { useSnackbar } from 'notistack';

import Editor from '@monaco-editor/react'; // SQL Editor

import useQueryTabStore from '../../store/queryTabStore';
import useConnectionStore from '../../store/connectionStore';
import useQueryExecutionStore from '../../store/queryExecutionStore'; // To store results/logs


function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`query-tabpanel-${index}`}
      aria-labelledby={`query-tab-${index}`}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}> {/* No padding, editor handles it */}
          {children}
        </Box>
      )}
    </div>
  );
}

export default function QueryEditorPanel() {
  const {
    tabs,
    activeTabId,
    addTab,
    removeTab,
    setActiveTab,
    updateTabContent,
    updateTabConnection,
  } = useQueryTabStore();

  const { connections, activeConnection: globalActiveConnection, fetchConnections } = useConnectionStore();
  const { executeQuery, isLoading: isQueryLoading, clearResultsAndLogs } = useQueryExecutionStore();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (connections.length === 0) {
      fetchConnections().catch(err => {
        enqueueSnackbar(`Failed to fetch connections for editor: ${err.message}`, { variant: 'error' });
      });
    }
  }, [connections, fetchConnections, enqueueSnackbar]);
  
  // Ensure there's always at least one tab
  useEffect(() => {
    if (tabs.length === 0) {
      addTab();
    }
  }, [tabs.length, addTab]);

  const handleTabChange = (event, newValue) => {
    const newTabId = tabs[newValue]?.id;
    if (newTabId) {
      setActiveTab(newTabId);
    }
  };

  const handleEditorChange = (value, event) => {
    if (activeTabId) {
      updateTabContent(activeTabId, value || '');
    }
  };

  const handleRunQuery = async () => {
    const currentTab = tabs.find(tab => tab.id === activeTabId);
    if (!currentTab) {
      enqueueSnackbar('No active tab found.', { variant: 'error' });
      return;
    }
    if (!currentTab.sql.trim()) {
      enqueueSnackbar('Query is empty.', { variant: 'warning' });
      return;
    }
    
    const connectionToUse = currentTab.connectionId ? connections.find(c => c.id === currentTab.connectionId) : globalActiveConnection;

    if (!connectionToUse) {
      enqueueSnackbar('No connection selected for this query or globally.', { variant: 'error' });
      return;
    }
    
    clearResultsAndLogs(currentTab.id); // Clear previous results for this tab
    enqueueSnackbar(`Executing query on "${connectionToUse.name}"...`, { variant: 'info' });

    try {
      await executeQuery(currentTab.id, connectionToUse.id, currentTab.sql);
      enqueueSnackbar('Query executed successfully!', { variant: 'success' });
      // Results are in queryExecutionStore, ResultsPanel will pick them up
    } catch (error) {
      enqueueSnackbar(`Query execution failed: ${error.message}`, { variant: 'error' });
      // Error details are in queryExecutionStore
    }
  };
  
  const handleSaveQuery = () => {
    // For now, this is a placeholder. Future implementation would save to local storage or backend.
    const currentTab = tabs.find(tab => tab.id === activeTabId);
    if(currentTab) {
        localStorage.setItem(`query-${currentTab.id}`, currentTab.sql);
        enqueueSnackbar(`Query for Tab ${currentTab.name} saved locally (demo).`, { variant: 'info' });
    }
  };

  const handleConnectionChange = (event) => {
    if (activeTabId) {
      updateTabConnection(activeTabId, event.target.value);
    }
  };

  const activeTabIndex = tabs.findIndex(tab => tab.id === activeTabId);
  const currentActiveTab = tabs[activeTabIndex];

  if (tabs.length === 0 || !currentActiveTab) {
    return (
      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', alignItems:'center', justifyContent:'center' }}>
        <Typography variant="body1" sx={{mb:1}}>No query tabs open.</Typography>
        <Button variant="outlined" onClick={() => addTab()} startIcon={<AddIcon />}>New Query</Button>
      </Paper>
    );
  }

  return (
    <Paper sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Tabs value={activeTabIndex} onChange={handleTabChange} variant="scrollable" scrollButtons="auto" sx={{flexGrow: 1}}>
          {tabs.map((tab, index) => (
            <Tab
              key={tab.id}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" component="span" sx={{textTransform: 'none'}}>{tab.name}</Typography>
                  {tabs.length > 1 && ( // Show close button only if more than one tab
                    <IconButton
                      size="small"
                      component="span" // Important to stop event propagation to tab
                      onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
                      sx={{ ml: 1.5 }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              }
              id={`query-tab-${index}`}
              aria-controls={`query-tabpanel-${index}`}
            />
          ))}
        </Tabs>
        <IconButton onClick={() => addTab()} color="primary" sx={{mr:1}}>
          <AddIcon />
        </IconButton>
      </Box>

      <Box sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, borderBottom: 1, borderColor: 'divider' }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PlayArrowIcon />}
          onClick={handleRunQuery}
          disabled={isQueryLoading || !currentActiveTab?.sql.trim() || (!currentActiveTab?.connectionId && !globalActiveConnection)}
        >
          {isQueryLoading ? <CircularProgress size={20} color="inherit" /> : 'Run'}
        </Button>
        <Button variant="outlined" startIcon={<SaveIcon />} onClick={handleSaveQuery} disabled={isQueryLoading}>
          Save
        </Button>
        <FormControl size="small" sx={{ minWidth: 150, ml: 'auto' }}>
          <InputLabel id={`connection-select-label-${currentActiveTab.id}`}>Connection</InputLabel>
          <Select
            labelId={`connection-select-label-${currentActiveTab.id}`}
            id={`connection-select-${currentActiveTab.id}`}
            value={currentActiveTab.connectionId || globalActiveConnection?.id || ''}
            label="Connection"
            onChange={handleConnectionChange}
            disabled={isQueryLoading}
          >
            <MenuItem value="">
              <em>{globalActiveConnection ? `Global: ${globalActiveConnection.name}` : 'Select Connection'}</em>
            </MenuItem>
            {connections.map((conn) => (
              <MenuItem key={conn.id} value={conn.id}>
                {conn.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {tabs.map((tab, index) => (
        <TabPanel key={tab.id} value={activeTabIndex} index={index} >
          <Editor
            height="100%" // Fill available space in TabPanel
            language="sql"
            theme="vs-light" // or "vs-dark"
            value={tab.sql}
            onChange={(value) => handleEditorChange(value, tab.id)} // Pass tab.id if needed
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on',
              automaticLayout: true, // Important for responsive editor
            }}
          />
        </TabPanel>
      ))}
    </Paper>
  );
}
