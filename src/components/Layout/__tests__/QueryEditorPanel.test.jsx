import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnackbarProvider } from 'notistack';

import QueryEditorPanel from '../QueryEditorPanel';
import useQueryTabStore from '../../../store/queryTabStore';
import useConnectionStore from '../../../store/connectionStore';
import useQueryExecutionStore from '../../../store/queryExecutionStore';

// Mock stores
jest.mock('../../../store/queryTabStore');
jest.mock('../../../store/connectionStore');
jest.mock('../../../store/queryExecutionStore');

// Monaco editor is already mocked in jest.setup.js

describe('QueryEditorPanel Component', () => {
  let mockAddTab, mockRemoveTab, mockSetActiveTab, mockUpdateTabContent, mockUpdateTabConnection;
  let mockFetchConnections, mockSetActiveConnectionGlobally; // from connectionStore
  let mockExecuteQuery, mockClearResultsAndLogs; // from queryExecutionStore

  const initialTabs = [
    { id: 'tab1', name: 'Query 1', sql: 'SELECT * FROM table1;', connectionId: null },
  ];
  const mockConnections = [
    { id: 'conn1', name: 'Prod Connection', url: 'http://prod.com', fusion_username: 'produser' },
    { id: 'conn2', name: 'Test Connection', url: 'http://test.com', fusion_username: 'testuser' },
  ];

  beforeEach(() => {
    // QueryTabStore mocks
    mockAddTab = jest.fn().mockImplementation(() => {
      const newId = `tab${useQueryTabStore.getState().tabs.length + 1}`;
      const newTab = {id: newId, name: `Query ${useQueryTabStore.getState().tabs.length + 1}`, sql: '', connectionId: null};
      useQueryTabStore.setState(prev => ({tabs: [...prev.tabs, newTab], activeTabId: newId}));
      return newTab;
    });
    mockRemoveTab = jest.fn().mockImplementation(tabId => {
       useQueryTabStore.setState(prev => {
           const newTabs = prev.tabs.filter(t => t.id !== tabId);
           let newActiveTabId = prev.activeTabId;
            if (prev.activeTabId === tabId) {
                newActiveTabId = newTabs.length > 0 ? newTabs[0].id : null;
            }
           return {tabs: newTabs, activeTabId: newActiveTabId };
       });
    });
    mockSetActiveTab = jest.fn(tabId => useQueryTabStore.setState({ activeTabId: tabId }));
    mockUpdateTabContent = jest.fn((tabId, sql) => useQueryTabStore.setState(prev => ({
      tabs: prev.tabs.map(t => t.id === tabId ? { ...t, sql } : t)
    })));
    mockUpdateTabConnection = jest.fn((tabId, connId) => useQueryTabStore.setState(prev => ({
      tabs: prev.tabs.map(t => t.id === tabId ? { ...t, connectionId: connId } : t)
    })));

    useQueryTabStore.mockReturnValue({
      tabs: initialTabs,
      activeTabId: initialTabs[0].id,
      addTab: mockAddTab,
      removeTab: mockRemoveTab,
      setActiveTab: mockSetActiveTab,
      updateTabContent: mockUpdateTabContent,
      updateTabConnection: mockUpdateTabConnection,
    });
    // Initialize state for each call if store is function-based
     useQueryTabStore.setState({
      tabs: [...initialTabs], // Use spread to avoid mutation issues if initialTabs is modified
      activeTabId: initialTabs[0].id,
    });


    // ConnectionStore mocks
    mockFetchConnections = jest.fn().mockResolvedValue(mockConnections);
    mockSetActiveConnectionGlobally = jest.fn();
    useConnectionStore.mockReturnValue({
      connections: mockConnections,
      activeConnection: null, // No global active connection by default for these tests
      fetchConnections: mockFetchConnections,
      setActiveConnection: mockSetActiveConnectionGlobally,
    });
     useConnectionStore.setState({
        connections: [...mockConnections],
        activeConnection: null,
    });


    // QueryExecutionStore mocks
    mockExecuteQuery = jest.fn().mockResolvedValue({});
    mockClearResultsAndLogs = jest.fn();
    useQueryExecutionStore.mockReturnValue({
      executeQuery: mockExecuteQuery,
      isLoading: false,
      clearResultsAndLogs: mockClearResultsAndLogs,
      results: {}, logs: {}, error: {} // Ensure these are part of mock state
    });
  });

  const renderEditorPanel = () => {
    return render(
      <SnackbarProvider>
        <QueryEditorPanel />
      </SnackbarProvider>
    );
  };

  it('should render initial tab and editor controls', () => {
    renderEditorPanel();
    expect(screen.getByText(initialTabs[0].name)).toBeInTheDocument(); // Tab label
    expect(screen.getByRole('button', { name: /Run/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Connection/i)).toBeInTheDocument(); // Connection dropdown
    expect(screen.getByTestId('mock-monaco-editor')).toBeInTheDocument(); // Mocked editor
    expect(screen.getByTestId('mock-monaco-editor')).toHaveValue(initialTabs[0].sql);
  });

  it('should add a new tab when Add Tab button is clicked', async () => {
    const user = userEvent.setup();
    renderEditorPanel();
    
    const addTabButton = screen.getByRole('button', { name: /Add/i }); // Assuming AddIcon has "Add" as accessible name or use testid
    await user.click(addTabButton);
    
    expect(mockAddTab).toHaveBeenCalledTimes(1);
    // The store mock itself updates the state, so QueryEditorPanel should re-render
    // We'd need to check if the new tab name appears (e.g., "Query 2")
  });

  it('should switch tabs when a tab is clicked', async () => {
    const user = userEvent.setup();
    // Add a second tab for testing switching
    const secondTab = { id: 'tab2', name: 'Query 2', sql: 'SELECT * FROM table2;', connectionId: null };
    useQueryTabStore.setState(prev => ({
        tabs: [...prev.tabs, secondTab],
        activeTabId: prev.activeTabId // Keep first tab active initially
    }));

    renderEditorPanel();
    
    const secondTabLabel = screen.getByText(secondTab.name); // MUI Tab role might be generic
    await user.click(secondTabLabel);

    expect(mockSetActiveTab).toHaveBeenCalledWith(secondTab.id);
  });

  it('should update tab content when editor value changes', async () => {
    renderEditorPanel();
    const editor = screen.getByTestId('mock-monaco-editor');
    const newSql = 'SELECT * FROM updated_table;';

    // Simulate change in the mocked editor
    fireEvent.change(editor, { target: { value: newSql } });

    expect(mockUpdateTabContent).toHaveBeenCalledWith(initialTabs[0].id, newSql);
  });

  it('should call executeQuery when Run button is clicked with a selected connection', async () => {
    const user = userEvent.setup();
    // Simulate a globally active connection or one selected in the tab
    useConnectionStore.setState(prev => ({...prev, activeConnection: mockConnections[0]}));
    
    renderEditorPanel();
    
    const runButton = screen.getByRole('button', { name: /Run/i });
    await user.click(runButton);

    expect(mockClearResultsAndLogs).toHaveBeenCalledWith(initialTabs[0].id);
    expect(mockExecuteQuery).toHaveBeenCalledWith(
      initialTabs[0].id,
      mockConnections[0].id, // Expecting the global connection ID
      initialTabs[0].sql
    );
  });

  it('should use tab-specific connection if selected', async () => {
    const user = userEvent.setup();
    // Set a tab-specific connection
    const tabWithConnection = { ...initialTabs[0], connectionId: mockConnections[1].id };
     useQueryTabStore.setState({
      tabs: [tabWithConnection],
      activeTabId: tabWithConnection.id,
    });
    
    renderEditorPanel();
    
    // Open the select dropdown
    const connectionSelect = screen.getByLabelText(/Connection/i);
    // MUI Select uses a button role for the dropdown trigger
    await user.click(screen.getByRole('button', { name: /Connection/i })); 
    // Select the connection (assuming options are rendered)
    // This part is tricky with mocked MUI Select. A more direct state update might be needed for unit test.
    // For this test, let's assume the connectionId is already set on the tab.
    
    const runButton = screen.getByRole('button', { name: /Run/i });
    await user.click(runButton);

    expect(mockExecuteQuery).toHaveBeenCalledWith(
      tabWithConnection.id,
      mockConnections[1].id, // Expecting the tab-specific connection ID
      tabWithConnection.sql
    );
  });
  
  it('should disable Run button if no query or no connection', () => {
    // Case 1: No SQL query
    useQueryTabStore.setState({
        tabs: [{ ...initialTabs[0], sql: '   ' }], // Empty SQL
        activeTabId: initialTabs[0].id,
    });
    // Ensure no global or tab-specific connection
    useConnectionStore.setState(prev => ({...prev, activeConnection: null}));


    const { rerender } = renderEditorPanel();
    expect(screen.getByRole('button', { name: /Run/i })).toBeDisabled();

    // Case 2: SQL query exists, but no connection
    useQueryTabStore.setState(prev => ({
        tabs: [{ ...prev.tabs[0], sql: 'SELECT 1;' }],
        activeTabId: prev.tabs[0].id,
    }));
    // Ensure activeConnection is null from connectionStore and tab connectionId is null
    useConnectionStore.setState(prev => ({...prev, activeConnection: null}));
    useQueryTabStore.setState(prev => ({tabs: prev.tabs.map(t => ({...t, connectionId: null}))}));


    rerender(
        <SnackbarProvider>
            <QueryEditorPanel />
        </SnackbarProvider>
    );
    expect(screen.getByRole('button', { name: /Run/i })).toBeDisabled();
  });


  it('should show loading indicator in Run button when query is loading', () => {
    useQueryExecutionStore.mockReturnValue({
        ...useQueryExecutionStore(), // Get existing mocked values
        isLoading: true, // Set isLoading to true
        results: {}, logs: {}, error: {}
    });
    renderEditorPanel();
    expect(screen.getByRole('progressbar')).toBeInTheDocument(); // Inside the Run button
    expect(screen.getByRole('button', { name: /Run/i })).toBeDisabled();
  });
  
  it('should call updateTabConnection when a connection is selected from dropdown', async () => {
    const user = userEvent.setup();
    renderEditorPanel();

    // Open the select dropdown (MUI Select renders as a button)
    const selectButton = screen.getByRole('button', { name: /Connection/i });
    await user.click(selectButton);

    // MUI renders options in a Popper. We need to find an option by its text.
    // Assuming options for mockConnections[0] and mockConnections[1] are rendered.
    const connectionOption = await screen.findByRole('option', { name: mockConnections[1].name });
    await user.click(connectionOption);
    
    expect(mockUpdateTabConnection).toHaveBeenCalledWith(initialTabs[0].id, mockConnections[1].id);
  });
  
  // Test for removing a tab is more complex due to the way tabs are rendered and close buttons handled
  // It would require more specific selectors for the close icon within a tab.
});
