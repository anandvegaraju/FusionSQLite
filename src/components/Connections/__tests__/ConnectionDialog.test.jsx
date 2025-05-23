import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnackbarProvider } from 'notistack';

import ConnectionDialog from '../ConnectionDialog';
import useConnectionStore from '../../../store/connectionStore';

// Mock the connectionStore
jest.mock('../../../store/connectionStore');

describe('ConnectionDialog Component', () => {
  let mockAddConnection;
  let mockUpdateConnection;
  let mockApiTestConnection;
  let mockStoreState;
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockAddConnection = jest.fn();
    mockUpdateConnection = jest.fn();
    mockApiTestConnection = jest.fn();
    mockOnClose.mockClear();

    mockStoreState = {
      addConnection: mockAddConnection,
      updateConnection: mockUpdateConnection,
      testConnection: mockApiTestConnection,
      loading: false,
    };
    useConnectionStore.mockReturnValue(mockStoreState);
  });

  const renderDialog = (open = true, connection = null) => {
    return render(
      <SnackbarProvider>
        <ConnectionDialog open={open} onClose={mockOnClose} connection={connection} />
      </SnackbarProvider>
    );
  };

  it('should render "Add New Connection" form correctly when no connection prop is passed', () => {
    renderDialog();
    expect(screen.getByText(/Add New Connection/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Connection Name/i)).toHaveValue('');
    expect(screen.getByLabelText(/Instance URL/i)).toHaveValue('');
    expect(screen.getByLabelText(/Fusion Username/i)).toHaveValue('');
    expect(screen.getByLabelText(/Fusion Password/i)).toHaveValue(''); // Password field for new connection
  });

  it('should render "Edit Connection" form with pre-filled data when connection prop is passed', () => {
    const existingConnection = {
      id: '1',
      name: 'Prod Server',
      url: 'https://prod.example.com',
      fusion_username: 'produser',
    };
    renderDialog(true, existingConnection);

    expect(screen.getByText(/Edit Connection/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Connection Name/i)).toHaveValue(existingConnection.name);
    expect(screen.getByLabelText(/Instance URL/i)).toHaveValue(existingConnection.url);
    expect(screen.getByLabelText(/Fusion Username/i)).toHaveValue(existingConnection.fusion_username);
    expect(screen.getByLabelText(/New Password/i)).toHaveValue(''); // Password field should be empty for edits
  });

  it('should allow typing into form fields', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText(/Connection Name/i), 'My Test Conn');
    expect(screen.getByLabelText(/Connection Name/i).value).toBe('My Test Conn');

    await user.type(screen.getByLabelText(/Instance URL/i), 'http://test.com');
    expect(screen.getByLabelText(/Instance URL/i).value).toBe('http://test.com');
    
    await user.type(screen.getByLabelText(/Fusion Username/i), 'test_user');
    expect(screen.getByLabelText(/Fusion Username/i).value).toBe('test_user');

    await user.type(screen.getByLabelText(/Fusion Password/i), 'secret');
    expect(screen.getByLabelText(/Fusion Password/i).value).toBe('secret');
  });

  it('should validate form fields on submit and show errors', async () => {
    const user = userEvent.setup();
    renderDialog();
    const addButton = screen.getByRole('button', { name: /Add Connection/i });
    await user.click(addButton);

    expect(await screen.findByText(/Connection name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Instance URL is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Fusion username is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Password is required for new connections/i)).toBeInTheDocument();
    expect(mockAddConnection).not.toHaveBeenCalled();
  });
  
  it('should validate URL format', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText(/Instance URL/i), 'not-a-url');
    await user.type(screen.getByLabelText(/Connection Name/i), 'Valid Name'); // Fill other required fields
    await user.type(screen.getByLabelText(/Fusion Username/i), 'ValidUser');
    await user.type(screen.getByLabelText(/Fusion Password/i), 'ValidPass');


    const addButton = screen.getByRole('button', { name: /Add Connection/i });
    await user.click(addButton);
    
    expect(await screen.findByText(/Invalid URL format/i)).toBeInTheDocument();
    expect(mockAddConnection).not.toHaveBeenCalled();
  });


  it('should call "testConnection" action when Test Connection button is clicked', async () => {
    const user = userEvent.setup();
    mockApiTestConnection.mockResolvedValueOnce({ success: true, message: 'Test successful!' });
    renderDialog();

    await user.type(screen.getByLabelText(/Instance URL/i), 'http://test.com');
    await user.type(screen.getByLabelText(/Fusion Username/i), 'testuser');
    await user.type(screen.getByLabelText(/Fusion Password/i), 'password');
    
    const testButton = screen.getByRole('button', { name: /Test Connection/i });
    await user.click(testButton);

    await waitFor(() => {
      expect(mockApiTestConnection).toHaveBeenCalledWith({
        url: 'http://test.com',
        username: 'testuser',
        password: 'password',
      });
    });
    expect(await screen.findByText(/Test Result: Test successful!/i)).toBeInTheDocument();
  });
  
  it('should require URL, Username, Password for Test Connection button click', async () => {
    const user = userEvent.setup();
    renderDialog(); // New connection, password field is "Fusion Password"
    
    const testButton = screen.getByRole('button', { name: /Test Connection/i });
    await user.click(testButton); // Click without filling password

    // Check that test API was not called
    expect(mockApiTestConnection).not.toHaveBeenCalled();
    // Check for snackbar message (not directly testable here without more setup, but assume it's called)
    // Or check for local error states if the component sets them for these specific fields
    expect(screen.getByLabelText(/Instance URL/i)).toHaveAttribute('aria-invalid', 'true'); // Or specific error helper text
    expect(screen.getByLabelText(/Fusion Username/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/Fusion Password/i)).toHaveAttribute('aria-invalid', 'true');
  });


  it('should call "addConnection" action on submit for a new connection', async () => {
    const user = userEvent.setup();
    mockAddConnection.mockResolvedValueOnce({}); // Simulate successful add
    renderDialog();

    const connectionData = {
      name: 'New Test Conn',
      url: 'http://new.example.com',
      username: 'newuser',
      password: 'newpassword',
    };

    await user.type(screen.getByLabelText(/Connection Name/i), connectionData.name);
    await user.type(screen.getByLabelText(/Instance URL/i), connectionData.url);
    await user.type(screen.getByLabelText(/Fusion Username/i), connectionData.username);
    await user.type(screen.getByLabelText(/Fusion Password/i), connectionData.password);
    
    const addButton = screen.getByRole('button', { name: /Add Connection/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(mockAddConnection).toHaveBeenCalledWith({
        name: connectionData.name,
        url: connectionData.url,
        fusionUsername: connectionData.username,
        password: connectionData.password,
      });
    });
    expect(mockOnClose).toHaveBeenCalledWith(true);
  });

  it('should call "updateConnection" action on submit for an existing connection', async () => {
    const user = userEvent.setup();
    const existingConnection = {
      id: '1', name: 'Old Name', url: 'https://old.com', fusion_username: 'olduser' 
    };
    mockUpdateConnection.mockResolvedValueOnce({});
    renderDialog(true, existingConnection);

    const updatedDetails = {
      name: 'Updated Name',
      url: 'https://updated.com',
      username: 'updateduser',
      password: 'updatedpassword', // User provides a new password
    };

    await user.clear(screen.getByLabelText(/Connection Name/i));
    await user.type(screen.getByLabelText(/Connection Name/i), updatedDetails.name);
    await user.clear(screen.getByLabelText(/Instance URL/i));
    await user.type(screen.getByLabelText(/Instance URL/i), updatedDetails.url);
    await user.clear(screen.getByLabelText(/Fusion Username/i));
    await user.type(screen.getByLabelText(/Fusion Username/i), updatedDetails.username);
    await user.type(screen.getByLabelText(/New Password/i), updatedDetails.password);
    
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateConnection).toHaveBeenCalledWith(existingConnection.id, {
        name: updatedDetails.name,
        url: updatedDetails.url,
        fusionUsername: updatedDetails.username,
        password: updatedDetails.password,
      });
    });
    expect(mockOnClose).toHaveBeenCalledWith(true);
  });
  
  it('should call "updateConnection" without password if password field is empty for existing connection', async () => {
    const user = userEvent.setup();
    const existingConnection = {
      id: '1', name: 'Old Name', url: 'https://old.com', fusion_username: 'olduser' 
    };
    mockUpdateConnection.mockResolvedValueOnce({});
    renderDialog(true, existingConnection);

    await user.clear(screen.getByLabelText(/Connection Name/i));
    await user.type(screen.getByLabelText(/Connection Name/i), 'Name Changed Only');
    
    // Password field is left empty
    
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateConnection).toHaveBeenCalledWith(existingConnection.id, {
        name: 'Name Changed Only',
        url: existingConnection.url, // Original URL
        fusionUsername: existingConnection.fusion_username, // Original username
        // password field should be undefined or not present
      });
      // Check that the password field was not included in the payload
      const payload = mockUpdateConnection.mock.calls[0][1];
      expect(payload).not.toHaveProperty('password');
    });
    expect(mockOnClose).toHaveBeenCalledWith(true);
  });


  it('should call onClose(false) when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderDialog();
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);
    expect(mockOnClose).toHaveBeenCalledWith(false);
  });
});
