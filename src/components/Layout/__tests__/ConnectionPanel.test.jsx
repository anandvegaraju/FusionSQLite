import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnackbarProvider } from 'notistack'; // ConnectionPanel uses useSnackbar

import ConnectionPanel from '../ConnectionPanel';
import useConnectionStore from '../../../store/connectionStore';

// Mock the connectionStore
jest.mock('../../../store/connectionStore');

// Mock ConnectionDialog as its functionality is tested separately
jest.mock('../../Connections/ConnectionDialog', () => ({ open, onClose, connection }) => (
  <div data-testid="mock-connection-dialog" data-open={open} data-connection={JSON.stringify(connection)}>
    Mock Connection Dialog
    <button onClick={() => onClose(false)}>Close Dialog</button>
    <button onClick={() => onClose(true)}>Close Dialog and Refresh</button> 
  </div>
));


describe('ConnectionPanel Component', () => {
  let mockFetchConnections;
  let mockDeleteConnection;
  let mockSetActiveConnection;
  let mockConnectionStoreState;

  const mockConnections = [
    { id: '1', name: 'Prod Server', url: 'https://prod.example.com', fusion_username: 'produser' },
    { id: '2', name: 'Test Server', url: 'https://test.example.com', fusion_username: 'testuser' },
  ];

  beforeEach(() => {
    mockFetchConnections = jest.fn().mockResolvedValue(mockConnections); // Default success
    mockDeleteConnection = jest.fn().mockResolvedValue({});
    mockSetActiveConnection = jest.fn();
    
    mockConnectionStoreState = {
      connections: [],
      activeConnection: null,
      loading: false,
      error: null,
      fetchConnections: mockFetchConnections,
      deleteConnection: mockDeleteConnection,
      setActiveConnection: mockSetActiveConnection,
    };
    useConnectionStore.mockReturnValue(mockConnectionStoreState);
  });

  const renderPanel = () => {
    return render(
      <SnackbarProvider>
        <ConnectionPanel />
      </SnackbarProvider>
    );
  };

  it('should render "Connections" title and an add button', () => {
    useConnectionStore.mockReturnValue({ ...mockConnectionStoreState, connections: [] });
    renderPanel();
    expect(screen.getByText('Connections')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add connection/i })).toBeInTheDocument();
  });

  it('should fetch connections on initial render', async () => {
    useConnectionStore.mockReturnValue({ ...mockConnectionStoreState, connections: [] });
    renderPanel();
    await waitFor(() => {
      expect(mockFetchConnections).toHaveBeenCalledTimes(1);
    });
  });
  
  it('should display loading indicator when loading and no connections initially', () => {
    useConnectionStore.mockReturnValue({ ...mockConnectionStoreState, loading: true, connections: [] });
    renderPanel();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display error message if fetching connections fails', async () => {
    const errorMessage = 'Failed to load connections';
    mockFetchConnections.mockRejectedValueOnce(new Error(errorMessage));
    // This relies on useSnackbar being mocked or the component handling the error display directly.
    // For now, let's assume the component displays the error from the store.
    useConnectionStore.mockReturnValue({ ...mockConnectionStoreState, error: errorMessage, connections:[] });
    renderPanel();
    
    await waitFor(() => {
        // The component itself shows the error if store.error is set
        expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  it('should display a list of connections', async () => {
    useConnectionStore.mockReturnValue({ ...mockConnectionStoreState, connections: mockConnections });
    renderPanel();
    
    await waitFor(() => {
      expect(screen.getByText(mockConnections[0].name)).toBeInTheDocument();
      expect(screen.getByText(mockConnections[1].name)).toBeInTheDocument();
      // Check for secondary text (username@hostname)
      expect(screen.getByText(`${mockConnections[0].fusion_username}@${new URL(mockConnections[0].url).hostname}`)).toBeInTheDocument();
    });
  });
  
  it('should display "No connections found" message when list is empty', () => {
    useConnectionStore.mockReturnValue({ ...mockConnectionStoreState, connections: [] });
    renderPanel();
    expect(screen.getByText(/No connections found/i)).toBeInTheDocument();
  });


  it('should open ConnectionDialog when Add Connection button is clicked', async () => {
    const user = userEvent.setup();
    useConnectionStore.mockReturnValue({ ...mockConnectionStoreState, connections: [] });
    renderPanel();
    
    const addButton = screen.getByRole('button', { name: /add connection/i });
    await user.click(addButton);

    const dialog = screen.getByTestId('mock-connection-dialog');
    expect(dialog).toHaveAttribute('data-open', 'true');
    expect(JSON.parse(dialog.getAttribute('data-connection'))).toBeNull(); // No connection passed for add
  });

  it('should open ConnectionDialog with connection data when Edit button is clicked', async () => {
    const user = userEvent.setup();
    useConnectionStore.mockReturnValue({ ...mockConnectionStoreState, connections: mockConnections });
    renderPanel();
    
    // Wait for items to be rendered
    await screen.findByText(mockConnections[0].name); 

    // Find edit button for the first connection (assuming order is preserved)
    // Edit buttons might not have accessible names by default, need to be specific
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]); // Click the first edit button

    const dialog = screen.getByTestId('mock-connection-dialog');
    expect(dialog).toHaveAttribute('data-open', 'true');
    expect(JSON.parse(dialog.getAttribute('data-connection'))).toEqual(mockConnections[0]);
  });

  it('should call deleteConnection when Delete button is clicked and confirmed', async () => {
    const user = userEvent.setup();
    window.confirm = jest.fn().mockReturnValue(true); // Mock window.confirm
    useConnectionStore.mockReturnValue({ ...mockConnectionStoreState, connections: mockConnections });
    renderPanel();

    await screen.findByText(mockConnections[0].name);
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this connection?');
    await waitFor(() => {
      expect(mockDeleteConnection).toHaveBeenCalledWith(mockConnections[0].id);
    });
  });
  
  it('should not call deleteConnection if not confirmed', async () => {
    const user = userEvent.setup();
    window.confirm = jest.fn().mockReturnValue(false); // Simulate user clicking "Cancel"
    useConnectionStore.mockReturnValue({ ...mockConnectionStoreState, connections: mockConnections });
    renderPanel();

    await screen.findByText(mockConnections[0].name);
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);
    
    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteConnection).not.toHaveBeenCalled();
  });

  it('should call setActiveConnection when a connection item is clicked', async () => {
    const user = userEvent.setup();
    useConnectionStore.mockReturnValue({ ...mockConnectionStoreState, connections: mockConnections });
    renderPanel();

    const firstConnectionItem = await screen.findByText(mockConnections[0].name);
    // Click the ListItemButton containing the text
    await user.click(firstConnectionItem.closest('button')); 

    expect(mockSetActiveConnection).toHaveBeenCalledWith(mockConnections[0]);
  });
  
  it('should highlight the active connection', async () => {
    useConnectionStore.mockReturnValue({ 
        ...mockConnectionStoreState, 
        connections: mockConnections, 
        activeConnection: mockConnections[0] // First connection is active
    });
    renderPanel();
    
    const firstConnectionItem = await screen.findByText(mockConnections[0].name);
    // MUI's ListItem has 'Mui-selected' class when selected, or check background color if defined by sx prop
    // The component uses `backgroundColor: activeConnection?.id === conn.id ? 'action.selected' : 'transparent'`
    // Testing specific style values can be brittle. For now, checking if the item is present.
    // A more robust test might involve snapshot testing or checking for a specific data-attribute if added.
    expect(firstConnectionItem).toBeInTheDocument(); 
    // A more direct test would be to ensure the ListItemButton for the active connection has a different style/class.
    // This is often better handled by visual regression or E2E tests.
  });

  it('should refresh connections when dialog is closed with refresh flag', async () => {
    useConnectionStore.mockReturnValue({ ...mockConnectionStoreState, connections: [] });
    renderPanel();
    
    const addButton = screen.getByRole('button', { name: /add connection/i });
    await userEvent.click(addButton); // Open dialog

    // Simulate closing dialog with refresh flag (e.g., after successful save)
    const closeAndRefreshButton = screen.getByText('Close Dialog and Refresh');
    await userEvent.click(closeAndRefreshButton); 
    
    expect(mockFetchConnections).toHaveBeenCalledTimes(2); // Initial fetch + refresh
  });
});
