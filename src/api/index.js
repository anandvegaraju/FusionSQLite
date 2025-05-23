import axios from 'axios';
import useAuthStore from '../store/authStore'; // Import the Zustand store

// Default to localhost if VITE_API_BASE_URL is not set (e.g., in .env files)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token to headers
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().getToken(); // Get token from Zustand store
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor (optional, for global error handling or token refresh logic)
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized errors, e.g., token expired
      // Could trigger logout or redirect to login
      useAuthStore.getState().logout(); // Example: logout user if 401
      // Potentially redirect to login page
      // window.location.href = '/login';
      console.error('Unauthorized access - 401. User logged out.');
    }
    // You can also extract more specific error messages here
    const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred.';
    return Promise.reject(new Error(errorMessage));
  }
);

// Generic API service functions (can be expanded or moved to separate service files)

// Auth service calls (already handled in authStore, but can be centralized here too)
// export const loginUser = (email, password) => apiClient.post('/auth/login', { email, password });
// export const registerUser = (username, email, password) => apiClient.post('/auth/register', { username, email, password });

// Connection service calls
export const fetchConnections = () => apiClient.get('/connections');
export const createConnection = (connectionData) => apiClient.post('/connections', connectionData);
export const updateConnection = (id, connectionData) => apiClient.put(`/connections/${id}`, connectionData);
export const deleteConnection = (id) => apiClient.delete(`/connections/${id}`);
export const testConnection = (connectionData) => apiClient.post('/connections/test', connectionData); // Assuming /test exists as per blueprint

// Query service calls
export const executeQuery = (queryData) // { connection_id, sql }
  => apiClient.post('/query/execute', queryData); 
// Add cancelQuery if available on backend

export default apiClient;
