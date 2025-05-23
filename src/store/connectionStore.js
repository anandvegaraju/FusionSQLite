import {create} from 'zustand';
import apiClient from '../api'; // Using the configured Axios instance
import { persist, createJSONStorage } from 'zustand/middleware';

const useConnectionStore = create(
  persist(
    (set, get) => ({
      connections: [],
      activeConnection: null, // Stores the full active connection object
      loading: false,
      error: null,

      fetchConnections: async () => {
        set({ loading: true, error: null });
        try {
          const response = await apiClient.get('/connections');
          set({ connections: response.data, loading: false });
          // If an active connection ID was persisted, try to find it in the fresh list
          const currentActiveId = get().activeConnection?.id;
          if (currentActiveId) {
            const newActive = response.data.find(c => c.id === currentActiveId);
            if (newActive) {
              set({ activeConnection: newActive });
            } else {
              // Active connection no longer exists, clear it
              set({ activeConnection: null });
            }
          }
          return response.data;
        } catch (err) {
          set({ error: err.message, loading: false });
          throw err;
        }
      },

      addConnection: async (connectionData) => {
        set({ loading: true, error: null });
        try {
          const response = await apiClient.post('/connections', connectionData);
          set((state) => ({
            connections: [...state.connections, response.data],
            loading: false,
          }));
          return response.data;
        } catch (err) {
          set({ error: err.message, loading: false });
          throw err;
        }
      },

      updateConnection: async (id, connectionData) => {
        set({ loading: true, error: null });
        try {
          const response = await apiClient.put(`/connections/${id}`, connectionData);
          set((state) => ({
            connections: state.connections.map((conn) =>
              conn.id === id ? response.data : conn
            ),
            loading: false,
          }));
          // Update active connection if it was the one edited
          if (get().activeConnection?.id === id) {
            set({ activeConnection: response.data });
          }
          return response.data;
        } catch (err) {
          set({ error: err.message, loading: false });
          throw err;
        }
      },

      deleteConnection: async (id) => {
        set({ loading: true, error: null });
        try {
          await apiClient.delete(`/connections/${id}`);
          set((state) => ({
            connections: state.connections.filter((conn) => conn.id !== id),
            loading: false,
          }));
          // If the deleted connection was active, clear it
          if (get().activeConnection?.id === id) {
            set({ activeConnection: null });
          }
        } catch (err) {
          set({ error: err.message, loading: false });
          throw err;
        }
      },
      
      testConnection: async (connectionData) => {
        // This doesn't modify store state directly but uses the API client
        set({ loading: true, error: null }); // Can indicate loading for test
        try {
            // Assuming backend expects full connection data for test,
            // or specific fields like url, username, password
            const response = await apiClient.post('/connections/test', connectionData);
            set({ loading: false });
            return response.data; // { success: true, message: "..." } or { success: false, error: "..." }
        } catch (err) {
            set({ error: err.message, loading: false });
            throw err;
        }
      },

      setActiveConnection: (connection) => {
        set({ activeConnection: connection });
      },
      
      // Getter to retrieve full connection details, including decrypted password, if needed by other services
      // This should be used CAREFULLY and only when submitting to the BI Publisher service
      // The backend connectionModel's getConnectionWithPassword is the source for this
      // For now, this store only holds what the /connections endpoint returns (no passwords)
      // If we need the password, the query execution logic will have to fetch it specifically.
    }),
    {
      name: 'connection-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ activeConnection: state.activeConnection }), // Only persist activeConnection ID/details
                                                                            // Connections list will be fetched on load
    }
  )
);

export default useConnectionStore;
