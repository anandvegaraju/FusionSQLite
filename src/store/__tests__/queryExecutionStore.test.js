import useQueryExecutionStore from '../queryExecutionStore';
import apiClient from '../../api'; // Will use the mock from src/api/__mocks__
import { act } from '@testing-library/react';

// Mock the apiClient
jest.mock('../../api');

// Helper to reset store state
const resetQueryExecutionStore = () => {
  act(() => {
    useQueryExecutionStore.setState(useQueryExecutionStore.getInitialState ? useQueryExecutionStore.getInitialState() : {
      results: {},
      logs: {},
      error: {},
      isLoading: false,
    });
  });
};

describe('Query Execution Store', () => {
  const tabId = 'tab1';
  const connectionId = 'conn1';
  const sqlQuery = 'SELECT * FROM DUAL';

  beforeEach(() => {
    apiClient.post.mockClear();
    resetQueryExecutionStore();
  });

  it('should have initial state', () => {
    const { results, logs, error, isLoading } = useQueryExecutionStore.getState();
    expect(results).toEqual({});
    expect(logs).toEqual({});
    expect(error).toEqual({});
    expect(isLoading).toBe(false);
  });

  describe('executeQuery Action', () => {
    const mockApiResponse = {
      status: 'success',
      data: { // This is the 'data' property within the response.data from API
        DATA_DS: {
          G_1: [{ COLUMN_NAME: 'DUMMY_VALUE', OTHER_COLUMN: 123 }],
        },
        executionTime: "0.123s"
      },
      logs: ['Backend log 1', 'Backend log 2'],
    };
    
    const mockApiErrorResponse = {
      status: 'error',
      message: 'ORA-00942: table or view does not exist',
      logs: ['Error log entry'],
    };


    it('should set loading state, call API, and update results/logs on successful execution', async () => {
      apiClient.post.mockResolvedValueOnce({ data: mockApiResponse }); // axios response has a 'data' property

      await act(async () => {
        await useQueryExecutionStore.getState().executeQuery(tabId, connectionId, sqlQuery);
      });

      const state = useQueryExecutionStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error[tabId]).toBeNull();
      
      // Check results formatting
      expect(state.results[tabId]).toBeDefined();
      expect(state.results[tabId].columns).toEqual(['COLUMN_NAME', 'OTHER_COLUMN']);
      expect(state.results[tabId].rows).toEqual([{ COLUMN_NAME: 'DUMMY_VALUE', OTHER_COLUMN: 123 }]);
      expect(state.results[tabId].executionTime).toBe("0.123s");
      
      // Check logs
      expect(state.logs[tabId].length).toBe(1 + mockApiResponse.logs.length); // Initial log + backend logs
      expect(state.logs[tabId][0].message).toContain(`Executing query on connection ${connectionId}`);
      expect(state.logs[tabId][1].message).toBe('Query executed successfully.');
      expect(state.logs[tabId][2].message).toBe('Backend log 1');


      expect(apiClient.post).toHaveBeenCalledWith('/query/execute', {
        connection_id: connectionId,
        sql: sqlQuery,
      });
    });
    
    it('should handle single object result correctly', async () => {
        const singleObjectResponse = {
            status: 'success',
            data: {
                DATA_DS: { G_1: { COLUMN_NAME: 'SINGLE_ROW_VAL' } } // Single object, not array
            }
        };
        apiClient.post.mockResolvedValueOnce({ data: singleObjectResponse });
        await act(async () => {
            await useQueryExecutionStore.getState().executeQuery(tabId, connectionId, sqlQuery);
        });
        const state = useQueryExecutionStore.getState();
        expect(state.results[tabId].rows).toEqual([{ COLUMN_NAME: 'SINGLE_ROW_VAL' }]);
        expect(state.results[tabId].columns).toEqual(['COLUMN_NAME']);
    });
    
    it('should handle empty result set correctly', async () => {
        const emptyResultResponse = {
            status: 'success',
            data: {
                DATA_DS: { G_1: [] } // Empty array for rows
            },
            columns: ['ID', 'NAME'] // API might provide columns even if no rows
        };
        apiClient.post.mockResolvedValueOnce({ data: emptyResultResponse });
        await act(async () => {
            await useQueryExecutionStore.getState().executeQuery(tabId, connectionId, sqlQuery);
        });
        const state = useQueryExecutionStore.getState();
        expect(state.results[tabId].rows).toEqual([]);
        expect(state.results[tabId].columns).toEqual(['ID', 'NAME']);
    });


    it('should set error and logs on failed execution (API error response)', async () => {
      // Simulate API returning a 2xx status but with an error payload
      apiClient.post.mockResolvedValueOnce({ data: mockApiErrorResponse });

      try {
        await act(async () => {
          await useQueryExecutionStore.getState().executeQuery(tabId, connectionId, sqlQuery);
        });
      } catch (e) {
        expect(e.message).toBe(mockApiErrorResponse.message);
      }

      const state = useQueryExecutionStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error[tabId]).toBe(mockApiErrorResponse.message);
      expect(state.results[tabId]).toBeNull(); // Results should be cleared or null
      
      expect(state.logs[tabId].length).toBe(1 + mockApiErrorResponse.logs.length + 1); // Initial + error log + backend logs
      expect(state.logs[tabId][1].message).toContain(`Execution failed: ${mockApiErrorResponse.message}`);
      expect(state.logs[tabId][2].message).toBe('Error log entry');
    });

    it('should set error and logs on network/request failure', async () => {
      const networkErrorMessage = 'Network Error';
      apiClient.post.mockRejectedValueOnce(new Error(networkErrorMessage)); // Simulate axios throwing an error

      try {
        await act(async () => {
          await useQueryExecutionStore.getState().executeQuery(tabId, connectionId, sqlQuery);
        });
      } catch (e) {
        expect(e.message).toBe(networkErrorMessage);
      }

      const state = useQueryExecutionStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error[tabId]).toBe(networkErrorMessage);
      expect(state.results[tabId]).toBeNull();
      expect(state.logs[tabId].some(log => log.type === 'error' && log.message.includes(networkErrorMessage))).toBe(true);
    });
  });

  describe('clearResultsAndLogs Action', () => {
    it('should clear results, logs, and error for a given tabId', async () => {
      // Populate some state first
      await act(async () => {
        useQueryExecutionStore.setState({
          results: { [tabId]: { columns: ['col1'], rows: [{col1:1}], raw: {} } },
          logs: { [tabId]: [{type:'info', message:'A log'}] },
          error: { [tabId]: 'An error' },
        });
      });

      act(() => {
        useQueryExecutionStore.getState().clearResultsAndLogs(tabId);
      });

      const state = useQueryExecutionStore.getState();
      expect(state.results[tabId]).toBeNull();
      expect(state.logs[tabId]).toEqual([]);
      expect(state.error[tabId]).toBeNull();
    });
  });
  
  describe('addFrontendLog Action', () => {
    it('should add a custom log entry to the specified tab', () => {
        const logMessage = "This is a custom frontend log.";
        const logType = "warn";

        act(() => {
            useQueryExecutionStore.getState().addFrontendLog(tabId, { type: logType, message: logMessage });
        });
        
        const state = useQueryExecutionStore.getState();
        expect(state.logs[tabId]).toBeDefined();
        expect(state.logs[tabId].length).toBe(1);
        expect(state.logs[tabId][0]).toEqual({ type: logType, message: logMessage });

        // Add another one
        act(() => {
            useQueryExecutionStore.getState().addFrontendLog(tabId, { type: 'info', message: 'Another log' });
        });
        expect(state.logs[tabId].length).toBe(2);
    });
  });
});
