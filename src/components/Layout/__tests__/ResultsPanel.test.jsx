import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnackbarProvider } from 'notistack'; // ResultsPanel uses useSnackbar via export CSV

import ResultsPanel from '../ResultsPanel';
import useQueryTabStore from '../../../store/queryTabStore';
import useQueryExecutionStore from '../../../store/queryExecutionStore';

// Mock stores
jest.mock('../../../store/queryTabStore');
jest.mock('../../../store/queryExecutionStore');

// Mock papaparse for CSV export
const mockUnparse = jest.fn();
jest.mock('papaparse', () => ({
  ...jest.requireActual('papaparse'), // Import and retain default exports
  unparse: (data) => mockUnparse(data), // Mock specific function
}));

describe('ResultsPanel Component', () => {
  let mockQueryTabStoreState;
  let mockQueryExecutionStoreState;

  const activeTabId = 'tab123';

  beforeEach(() => {
    mockQueryTabStoreState = {
      activeTabId: activeTabId,
    };
    useQueryTabStore.mockReturnValue(mockQueryTabStoreState);

    mockQueryExecutionStoreState = {
      results: {}, // { [tabId]: { columns: [], rows: [], executionTime: '', raw: {} } }
      logs: {},    // { [tabId]: [{ type: 'info', message: ''}] }
      error: {},   // { [tabId]: 'Error message' }
      isLoading: false,
    };
    useQueryExecutionStore.mockReturnValue(mockQueryExecutionStoreState);
    
    mockUnparse.mockClear();
    // Mock URL.createObjectURL and a.click for CSV download testing
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn(); // Not strictly needed for test but good practice
    // Mock link click
    HTMLAnchorElement.prototype.click = jest.fn(); 
  });

  const renderResultsPanel = () => {
    return render(
      <SnackbarProvider>
        <ResultsPanel />
      </SnackbarProvider>
    );
  };

  it('should render "Results" and "Messages/Logs" tabs', () => {
    renderResultsPanel();
    expect(screen.getByRole('tab', { name: /Results/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Messages\/Logs/i })).toBeInTheDocument();
  });

  it('should display "Execute a query to see results." by default on Results tab', () => {
    renderResultsPanel();
    // Results tab is active by default
    expect(screen.getByText(/Execute a query to see results./i)).toBeInTheDocument();
  });

  it('should display loading indicator when isLoading is true and no current results', () => {
    useQueryExecutionStore.mockReturnValue({ ...mockQueryExecutionStoreState, isLoading: true });
    renderResultsPanel();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display error message if there is an error for the active tab', () => {
    const errorMessage = 'ORA-00942: Table or view does not exist';
    useQueryExecutionStore.mockReturnValue({
      ...mockQueryExecutionStoreState,
      error: { [activeTabId]: errorMessage },
    });
    renderResultsPanel();
    expect(screen.getByText(new RegExp(`Error executing query: ${errorMessage}`, 'i'))).toBeInTheDocument();
  });

  describe('Results Tab Content', () => {
    const mockResultData = {
      columns: ['ID', 'NAME', 'VALUE'],
      rows: [
        { ID: 1, NAME: 'First Item', VALUE: 100 },
        { ID: 2, NAME: 'Second Item', VALUE: 200 },
      ],
      executionTime: '0.05s',
      raw: {},
    };

    it('should display results table with data for the active tab', async () => {
      useQueryExecutionStore.mockReturnValue({
        ...mockQueryExecutionStoreState,
        results: { [activeTabId]: mockResultData },
      });
      renderResultsPanel();

      // Check for headers
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('NAME')).toBeInTheDocument();
      expect(screen.getByText('VALUE')).toBeInTheDocument();

      // Check for row data
      expect(screen.getByText('First Item')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument(); // Value from second row
      
      // Check for row count and execution time
      expect(screen.getByText(/Rows: 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Time: 0.05s/i)).toBeInTheDocument();
      
      expect(screen.getByRole('button', {name: /Export CSV/i})).not.toBeDisabled();
    });

    it('should display "no rows were returned" if query was successful but returned no data', () => {
      useQueryExecutionStore.mockReturnValue({
        ...mockQueryExecutionStoreState,
        results: { [activeTabId]: { columns: ['ID', 'NAME'], rows: [], executionTime: '0.01s', raw: {} } },
      });
      renderResultsPanel();
      expect(screen.getByText(/Query executed successfully, but no rows were returned./i)).toBeInTheDocument();
      expect(screen.getByRole('button', {name: /Export CSV/i})).toBeDisabled();
    });

    it('should handle pagination for results', async () => {
      const user = userEvent.setup();
      const manyRows = Array.from({ length: 25 }, (_, i) => ({ ID: i + 1, NAME: `Item ${i + 1}` }));
      useQueryExecutionStore.mockReturnValue({
        ...mockQueryExecutionStoreState,
        results: { [activeTabId]: { columns: ['ID', 'NAME'], rows: manyRows, raw: {} } },
      });
      renderResultsPanel();

      // Default rowsPerPage is 10
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.queryByText('Item 11')).not.toBeInTheDocument();
      
      // MUI TablePagination uses a button with a specific title or accessible name for "Next page"
      const nextPageButton = screen.getByRole('button', { name: /Go to next page/i });
      await user.click(nextPageButton);
      
      expect(await screen.findByText('Item 11')).toBeInTheDocument();
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    });
    
    it('should export data to CSV when "Export CSV" button is clicked', async () => {
        const user = userEvent.setup();
        mockUnparse.mockReturnValue("ID,NAME\n1,TestName"); // Mock CSV output
        useQueryExecutionStore.mockReturnValue({
            ...mockQueryExecutionStoreState,
            results: { [activeTabId]: { columns: ['ID', 'NAME'], rows: [{ID: 1, NAME: 'TestName'}], raw: {}} },
        });
        renderResultsPanel();

        const exportButton = screen.getByRole('button', { name: /Export CSV/i });
        await user.click(exportButton);

        expect(mockUnparse).toHaveBeenCalledWith([{ID: 1, NAME: 'TestName'}]);
        expect(global.URL.createObjectURL).toHaveBeenCalled();
        expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    });
  });

  describe('Messages/Logs Tab Content', () => {
    const mockLogData = [
      { type: 'info', message: 'Query submitted...' },
      { type: 'backend', message: 'Executing on BI Publisher...' },
      { type: 'success', message: 'Query completed.' },
    ];

    it('should display logs for the active tab', async () => {
      const user = userEvent.setup();
      useQueryExecutionStore.mockReturnValue({
        ...mockQueryExecutionStoreState,
        logs: { [activeTabId]: mockLogData },
      });
      renderResultsPanel();

      // Switch to Logs tab
      const logsTabButton = screen.getByRole('tab', { name: /Messages\/Logs/i });
      await user.click(logsTabButton);

      expect(await screen.findByText(mockLogData[0].message)).toBeInTheDocument();
      expect(screen.getByText(mockLogData[1].message)).toBeInTheDocument();
      expect(screen.getByText(mockLogData[2].message)).toBeInTheDocument();
    });
    
    it('should display "No messages or logs" if logs are empty for active tab', async () => {
        const user = userEvent.setup();
        useQueryExecutionStore.mockReturnValue({
            ...mockQueryExecutionStoreState,
            logs: { [activeTabId]: [] }, // Empty logs
        });
        renderResultsPanel();
        const logsTabButton = screen.getByRole('tab', { name: /Messages\/Logs/i });
        await user.click(logsTabButton);
        expect(await screen.findByText(/No messages or logs for the current query./i)).toBeInTheDocument();
    });

    it('should display error in logs tab if present', async () => {
        const user = userEvent.setup();
        const errorMessage = "A query execution error occurred.";
        useQueryExecutionStore.mockReturnValue({
            ...mockQueryExecutionStoreState,
            error: { [activeTabId]: errorMessage },
            logs: { [activeTabId]: [{type: 'error', message: `Query Error: ${errorMessage}`}] } // Simulate error log
        });
        renderResultsPanel();
        const logsTabButton = screen.getByRole('tab', { name: /Messages\/Logs/i });
        await user.click(logsTabButton);
        expect(await screen.findByText(new RegExp(errorMessage, 'i'))).toBeInTheDocument();
    });
  });
});
