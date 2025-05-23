import useConnectionStore from '../connectionStore';
import apiClient from '../../api'; // Will use the mock from src/api/__mocks__
import { act } from '@testing-library/react';

// Mock the apiClient
jest.mock('../../api');

// Helper to reset store state
const resetConnectionStore = () => {
  act(() => {
    useConnectionStore.setState(useConnectionStore.getInitialState ? useConnectionStore.getInitialState() : {
      connections: [],
      activeConnection: null,
      loading: false,
      error: null,
    });
    localStorage.removeItem('connection-storage'); // Clear persisted state
     act(() => {
      useConnectionStore.persist.rehydrate();
    });
  });
};

describe('Connection Store', () => {
  beforeEach(() => {
    apiClient.get.mockClear();
    apiClient.post.mockClear();
    apiClient.put.mockClear();
    apiClient.delete.mockClear();
    resetConnectionStore();
  });
  
  afterEach(() => {
    localStorage.removeItem('connection-storage');
  });

  const mockConnectionsList = [
    { id: '1', name: 'Prod', url: 'http://prod.com', fusion_username: 'user1' },
    { id: '2', name: 'Test', url: 'http://test.com', fusion_username: 'user2' },
  ];

  it('should have initial state', () => {
    const { connections, activeConnection, loading, error } = useConnectionStore.getState();
    expect(connections).toEqual([]);
    expect(activeConnection).toBeNull();
    expect(loading).toBe(false);
    expect(error).toBeNull();
  });

  describe('fetchConnections Action', () => {
    it('should fetch connections and update state', async () => {
      apiClient.get.mockResolvedValueOnce({ data: mockConnectionsList });

      await act(async () => {
        await useConnectionStore.getState().fetchConnections();
      });
      
      const { connections, loading, error } = useConnectionStore.getState();
      expect(loading).toBe(false);
      expect(error).toBeNull();
      expect(connections).toEqual(mockConnectionsList);
      expect(apiClient.get).toHaveBeenCalledWith('/connections');
    });
    
    it('should restore activeConnection if it exists in fetched list', async () => {
        // Simulate an active connection being persisted
        act(() => {
            useConnectionStore.setState({ activeConnection: mockConnectionsList[0] });
        });

        apiClient.get.mockResolvedValueOnce({ data: mockConnectionsList });
        await act(async () => {
            await useConnectionStore.getState().fetchConnections();
        });

        expect(useConnectionStore.getState().activeConnection).toEqual(mockConnectionsList[0]);
    });

    it('should clear activeConnection if it no longer exists in fetched list', async () => {
        act(() => {
            useConnectionStore.setState({ activeConnection: {id: 'non-existent', name: 'Old'} });
        });
        apiClient.get.mockResolvedValueOnce({ data: mockConnectionsList });
        await act(async () => {
            await useConnectionStore.getState().fetchConnections();
        });
        expect(useConnectionStore.getState().activeConnection).toBeNull();
    });


    it('should set error on failed fetchConnections', async () => {
      const errorMessage = 'Failed to fetch';
      apiClient.get.mockRejectedValueOnce(new Error(errorMessage));

      try {
        await act(async () => {
          await useConnectionStore.getState().fetchConnections();
        });
      } catch (e) {
        // Error is re-thrown by the action
      }
      
      const { connections, loading, error } = useConnectionStore.getState();
      expect(loading).toBe(false);
      expect(error).toBe(errorMessage);
      expect(connections).toEqual([]);
    });
  });

  describe('addConnection Action', () => {
    const newConnectionData = { name: 'Dev', url: 'http://dev.com', fusionUsername: 'user_dev', fusionPassword: 'password' };
    const newConnectionResponse = { id: '3', ...newConnectionData };
    delete newConnectionResponse.fusionPassword; // Password not returned

    it('should add a connection and update state', async () => {
      apiClient.post.mockResolvedValueOnce({ data: newConnectionResponse });

      await act(async () => {
        await useConnectionStore.getState().addConnection(newConnectionData);
      });

      const { connections, loading, error } = useConnectionStore.getState();
      expect(loading).toBe(false);
      expect(error).toBeNull();
      expect(connections).toContainEqual(newConnectionResponse);
      expect(apiClient.post).toHaveBeenCalledWith('/connections', newConnectionData);
    });
  });
  
  describe('updateConnection Action', () => {
    const existingConnection = mockConnectionsList[0];
    const updatedData = { ...existingConnection, name: 'Prod Updated' };

    it('should update a connection and refresh state', async () => {
      apiClient.put.mockResolvedValueOnce({ data: updatedData });
      act(() => { // Pre-populate store for update
          useConnectionStore.setState({ connections: [...mockConnectionsList], activeConnection: existingConnection });
      });

      await act(async () => {
        await useConnectionStore.getState().updateConnection(existingConnection.id, updatedData);
      });

      const { connections, activeConnection, loading, error } = useConnectionStore.getState();
      expect(loading).toBe(false);
      expect(error).toBeNull();
      const updated = connections.find(c => c.id === existingConnection.id);
      expect(updated.name).toBe('Prod Updated');
      expect(activeConnection.name).toBe('Prod Updated'); // Check if active connection is also updated
      expect(apiClient.put).toHaveBeenCalledWith(`/connections/${existingConnection.id}`, updatedData);
    });
  });

  describe('deleteConnection Action', () => {
    const connectionToDelete = mockConnectionsList[0];
     act(() => { // Pre-populate store
        useConnectionStore.setState({ connections: [...mockConnectionsList], activeConnection: connectionToDelete });
    });

    it('should delete a connection and update state', async () => {
      apiClient.delete.mockResolvedValueOnce({}); // Successful delete returns 204

      await act(async () => {
        await useConnectionStore.getState().deleteConnection(connectionToDelete.id);
      });
      
      const { connections, activeConnection, loading, error } = useConnectionStore.getState();
      expect(loading).toBe(false);
      expect(error).toBeNull();
      expect(connections.find(c => c.id === connectionToDelete.id)).toBeUndefined();
      expect(activeConnection).toBeNull(); // Check if active connection is cleared
      expect(apiClient.delete).toHaveBeenCalledWith(`/connections/${connectionToDelete.id}`);
    });
  });
  
  describe('testConnection Action', () => {
    const testData = { url: 'http://test.com', username: 'u', password: 'p' };
    const successResponse = { success: true, message: "Connection successful!" };

    it('should call test API and return result without altering store much', async () => {
      apiClient.post.mockResolvedValueOnce({ data: successResponse });
      
      let result;
      await act(async () => {
        result = await useConnectionStore.getState().testConnection(testData);
      });

      const { loading, error } = useConnectionStore.getState();
      expect(loading).toBe(false); // Should reset loading
      // Error might be set by the call, or might be cleared. Test current behavior.
      // expect(error).toBeNull(); // Or check if it's the error from a failed test
      expect(result).toEqual(successResponse);
      expect(apiClient.post).toHaveBeenCalledWith('/connections/test', testData);
    });
  });

  describe('setActiveConnection Action', () => {
    it('should set the active connection', () => {
      const connectionToActivate = mockConnectionsList[1];
      act(() => {
        useConnectionStore.getState().setActiveConnection(connectionToActivate);
      });
      expect(useConnectionStore.getState().activeConnection).toEqual(connectionToActivate);
    });
  });
});
