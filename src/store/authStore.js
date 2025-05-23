import {create} from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Attempt to get the host for the API URL
// In Vite, import.meta.env.VITE_API_BASE_URL would be used if set in .env
// For now, defaulting to localhost typical backend port
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';


const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null, // Store user info like { id, username, email }
      isLoading: false,
      error: null,

      // Login action
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || 'Login failed');
          }
          set({ token: data.token, user: data.user, isLoading: false, error: null });
          return data;
        } catch (error) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      // Register action
      register: async (username, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
          }
          // Optionally log in the user directly or redirect to login
          set({ isLoading: false, error: null });
          return data;
        } catch (error) {
          set({ isLoading: false, error: error.message });
          throw error;
        }
      },

      // Logout action
      logout: () => {
        // Optionally call backend /api/auth/logout if it does token invalidation
        // For now, just clearing client-side state
        set({ token: null, user: null, isLoading: false, error: null });
        // localStorage.removeItem('auth-storage'); // Handled by persist middleware's clearStorage option if needed
      },

      // Helper to get current token (useful for API service)
      getToken: () => get().token,
    }),
    {
      name: 'auth-storage', // Name of the item in localStorage
      storage: createJSONStorage(() => localStorage), // Use localStorage
      partialize: (state) => ({ token: state.token, user: state.user }), // Only persist token and user
    }
  )
);

export default useAuthStore;
