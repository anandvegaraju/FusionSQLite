import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage'; // This will host the main 3-panel layout
import useAuthStore from './store/authStore'; // Assuming Zustand store for auth

// ProtectedRoute component
const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      {/* Add other routes here, e.g., for a specific query tab or settings */}
      <Route path="*" element={<Navigate to="/" />} /> {/* Redirect unknown paths to dashboard or login */}
    </Routes>
  );
}

export default App;
