import {create} from 'zustand';
import apiClient from '../api'; // Using the configured Axios instance

// Helper to transform API response to a consistent format
const formatResults = (apiResponseData) => {
  // Based on the example transformation in the previous task's usage example
  // Adjust this based on the actual structure of `apiResponseData.data` from your backend
  if (apiResponseData && apiResponseData.data) { // Assuming the actual results are in a 'data' property
    const rawData = apiResponseData.data;
    let columns = [];
    let rows = [];
    let executionTime = apiResponseData.executionTime || rawData.executionTime || null; // Or however it's provided

    // Example: BI Publisher output often has a structure like DATA_DS > G_1
    // This needs to be adapted to the actual structure returned by your Node.js backend's /query/execute
    const dataRoot = rawData.DATA_DS || rawData; // Adjust based on actual response

    if (dataRoot) {
        // Assuming G_1 is the common group name for rows, or it might be the root itself if flattened
        const rowArray = dataRoot.G_1 || (Array.isArray(dataRoot) ? dataRoot : (typeof dataRoot === 'object' && dataRoot !== null ? [dataRoot] : []));

        if (Array.isArray(rowArray) && rowArray.length > 0) {
            columns = Object.keys(rowArray[0]);
            rows = rowArray;
        } else if (typeof rowArray === 'object' && rowArray !== null && Object.keys(rowArray).length > 0 && !Array.isArray(rowArray)) { // Single row returned as object
            columns = Object.keys(rowArray);
            rows = [rowArray];
        } else if (Array.isArray(rowArray) && rowArray.length === 0) {
            // No rows, but columns might be available elsewhere or can be inferred if the API guarantees it
            // For now, if no rows, columns will be empty unless the API provides them separately
            columns = apiResponseData.columns || rawData.columns || []; // Check if API provides columns separately
        }
    }
    
    return { columns, rows, executionTime, raw: rawData };
  }
  return { columns: [], rows: [], executionTime: null, raw: apiResponseData }; // Default empty structure
};


const useQueryExecutionStore = create((set, get) => ({
  // Store results, logs, errors, and loading status per tabId
  results: {}, // { [tabId]: { columns: [], rows: [], executionTime: '0.5s', raw: {} } }
  logs: {},    // { [tabId]: [{ type: 'info', message: 'Query submitted'}] }
  error: {},   // { [tabId]: 'Error message' }
  isLoading: false, // Global loading state for any query, or make it per tab: { [tabId]: boolean }

  executeQuery: async (tabId, connectionId, sqlQuery) => {
    set(state => ({
      isLoading: true,
      error: { ...state.error, [tabId]: null }, // Clear previous error for this tab
      logs: { ...state.logs, [tabId]: [{ type: 'info', message: `Executing query on connection ${connectionId}...` }] },
      results: { ...state.results, [tabId]: null } // Clear previous results for this tab
    }));

    try {
      const response = await apiClient.post('/query/execute', {
        connection_id: connectionId,
        sql: sqlQuery,
      });

      // Assuming response.data contains { status: 'success', data: { actual results }, logs: [], executionTime: '...' }
      // or { status: 'error', message: '...', logs: [] }
      
      if (response.data.status === 'success' || response.status === 200) { // Check for overall success
        const formattedData = formatResults(response.data); // Process the 'data' part of the response
        
        set(state => ({
          isLoading: false,
          results: { ...state.results, [tabId]: formattedData },
          logs: { 
            ...state.logs, 
            [tabId]: [
              ...(state.logs[tabId] || []), 
              { type: 'info', message: 'Query executed successfully.' },
              ...(response.data.logs?.map(log => ({ type: 'backend', message: log })) || []) // Add backend logs
            ]
          },
        }));
        return formattedData;
      } else {
        // Handle structured errors from backend if status is not 'success' but request was 2xx
        const errorMessage = response.data.message || 'Query execution failed with non-success status.';
        set(state => ({
          isLoading: false,
          error: { ...state.error, [tabId]: errorMessage },
          logs: { 
            ...state.logs, 
            [tabId]: [
              ...(state.logs[tabId] || []), 
              { type: 'error', message: `Execution failed: ${errorMessage}` },
              ...(response.data.logs?.map(log => ({ type: 'backend', message: log })) || [])
            ]
          },
        }));
        throw new Error(errorMessage);
      }
    } catch (err) {
      // Handles network errors or errors thrown from interceptor (e.g. 4xx, 5xx responses)
      const errorMessage = err.message || 'An unexpected error occurred during query execution.';
      set(state => ({
        isLoading: false,
        error: { ...state.error, [tabId]: errorMessage },
        logs: { 
          ...state.logs, 
          [tabId]: [
            ...(state.logs[tabId] || []),
            { type: 'error', message: `Execution error: ${errorMessage}` }
          ]
        },
      }));
      throw err; // Re-throw for the component to catch if needed
    }
  },

  clearResultsAndLogs: (tabId) => {
    set(state => ({
      results: { ...state.results, [tabId]: null },
      logs: { ...state.logs, [tabId]: [] },
      error: { ...state.error, [tabId]: null },
    }));
  },
  
  // Method to add a log entry manually from the frontend if needed
  addFrontendLog: (tabId, logEntry) => { // logEntry = { type: 'info'/'warn'/'error', message: '...' }
    set(state => ({
        logs: {
            ...state.logs,
            [tabId]: [...(state.logs[tabId] || []), logEntry]
        }
    }));
  }
}));

export default useQueryExecutionStore;
