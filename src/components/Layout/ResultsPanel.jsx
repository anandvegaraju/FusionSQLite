import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Button from '@mui/material/Button';
import DownloadIcon from '@mui/icons-material/Download';
import CircularProgress from '@mui/material/CircularProgress';
import { useSnackbar } from 'notistack';
import Papa from 'papaparse'; // For CSV export

import useQueryTabStore from '../../store/queryTabStore';
import useQueryExecutionStore from '../../store/queryExecutionStore';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`results-tabpanel-${index}`}
      aria-labelledby={`results-tab-${index}`}
      style={{ height: '100%', overflow: 'auto' }} // Ensure content within tab panel scrolls
      {...other}
    >
      {value === index && <Box sx={{ p: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>{children}</Box>}
    </div>
  );
}

export default function ResultsPanel() {
  const [currentResultsTab, setCurrentResultsTab] = useState(0); // 0 for Results, 1 for Logs
  const { activeTabId } = useQueryTabStore();
  const { results, logs, isLoading, error } = useQueryExecutionStore();
  const { enqueueSnackbar } = useSnackbar();

  // Pagination for results
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const currentTabExecution = activeTabId ? results[activeTabId] : null;
  const currentTabLogs = activeTabId ? logs[activeTabId] : null;
  const currentTabError = activeTabId ? error[activeTabId] : null;


  const handleResultsTabChange = (event, newValue) => {
    setCurrentResultsTab(newValue);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleExportToCSV = () => {
    if (!currentTabExecution || !currentTabExecution.rows || currentTabExecution.rows.length === 0) {
      enqueueSnackbar('No data to export.', { variant: 'warning' });
      return;
    }
    try {
      const csv = Papa.unparse(currentTabExecution.rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `query_results_${activeTabId || 'export'}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      enqueueSnackbar('Data exported to CSV successfully.', { variant: 'success' });
    } catch (err) {
      console.error("Error exporting to CSV:", err);
      enqueueSnackbar(`Failed to export to CSV: ${err.message}`, { variant: 'error' });
    }
  };
  
  const displayableRows = currentTabExecution?.rows?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage) || [];

  return (
    <Paper sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Tabs value={currentResultsTab} onChange={handleResultsTabChange} aria-label="results and logs tabs">
          <Tab label="Results" id="results-tab-0" aria-controls="results-tabpanel-0" />
          <Tab label="Messages/Logs" id="results-tab-1" aria-controls="results-tabpanel-1" />
        </Tabs>
      </Box>

      <TabPanel value={currentResultsTab} index={0}> {/* Results Tab */}
        {isLoading && !currentTabExecution && <Box sx={{display: 'flex', justifyContent:'center', alignItems:'center', height:'100%'}}><CircularProgress /></Box>}
        {!isLoading && !currentTabExecution && !currentTabError && (
             <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                Execute a query to see results.
             </Typography>
        )}
        {currentTabError && !isLoading && (
            <Typography color="error" sx={{ p: 2, whiteSpace: 'pre-wrap' }}>
                Error executing query: {typeof currentTabError === 'object' ? JSON.stringify(currentTabError, null, 2) : currentTabError}
            </Typography>
        )}
        {currentTabExecution && (
          <>
            <Box sx={{mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <Typography variant="caption">
                Rows: {currentTabExecution.rows?.length || 0}. 
                {currentTabExecution.executionTime && ` Time: ${currentTabExecution.executionTime}`}
              </Typography>
              <Button 
                startIcon={<DownloadIcon />} 
                onClick={handleExportToCSV}
                size="small"
                disabled={!currentTabExecution.rows || currentTabExecution.rows.length === 0}
              >
                Export CSV
              </Button>
            </Box>
            {currentTabExecution.rows && currentTabExecution.rows.length > 0 ? (
              <>
                <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}> {/* Ensure TableContainer itself can scroll */}
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        {currentTabExecution.columns && currentTabExecution.columns.map((colName) => (
                          <TableCell key={colName} sx={{fontWeight: 'bold', backgroundColor: 'grey.200'}}>{colName}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {displayableRows.map((row, rowIndex) => (
                        <TableRow key={rowIndex} hover>
                          {currentTabExecution.columns && currentTabExecution.columns.map((colName) => (
                            <TableCell key={`${rowIndex}-${colName}`}>
                              {typeof row[colName] === 'object' ? JSON.stringify(row[colName]) : String(row[colName])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  component="div"
                  count={currentTabExecution.rows?.length || 0}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  sx={{flexShrink: 0}}
                />
              </>
            ) : (
              <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                Query executed successfully, but no rows were returned.
              </Typography>
            )}
          </>
        )}
      </TabPanel>

      <TabPanel value={currentResultsTab} index={1}> {/* Messages/Logs Tab */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.875rem', p:1, backgroundColor: 'grey.100', borderRadius: 1 }}>
          {isLoading && <Typography>Loading logs...</Typography>}
          {!isLoading && (!currentTabLogs || currentTabLogs.length === 0) && !currentTabError && (
            <Typography sx={{color: 'text.secondary'}}>No messages or logs for the current query.</Typography>
          )}
          {currentTabError && (
            <Typography color="error">
                Query Error: {typeof currentTabError === 'object' ? JSON.stringify(currentTabError, null, 2) : currentTabError}
            </Typography>
          )}
          {currentTabLogs && currentTabLogs.map((log, index) => (
            <Typography key={index} component="div" sx={{color: log.type === 'error' ? 'error.main' : 'text.primary'}}>
              {typeof log.message === 'object' ? JSON.stringify(log.message) : log.message}
            </Typography>
          ))}
        </Box>
      </TabPanel>
    </Paper>
  );
}
