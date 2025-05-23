import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

import RegisterPage from '../RegisterPage';
import useAuthStore from '../../store/authStore';
import { SnackbarProvider } from 'notistack';

// Mock the authStore
jest.mock('../../store/authStore');

// Mock Copyright component
jest.mock('../../components/common/Copyright', () => () => <div data-testid="mock-copyright">Copyright</div>);

// Mock navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: jest.fn().mockImplementation(({ to, children, ...rest }) => <a href={to} {...rest}>{children}</a>)
}));

describe('RegisterPage Component', () => {
  let mockRegister;
  let mockAuthStoreState;

  beforeEach(() => {
    mockRegister = jest.fn();
    mockNavigate.mockClear();
    
    mockAuthStoreState = {
      register: mockRegister,
      isLoading: false,
      error: null,
    };
    useAuthStore.mockReturnValue(mockAuthStoreState);
  });

  const renderWithProviders = (ui) => {
    return render(
      <SnackbarProvider>
        <MemoryRouter initialEntries={['/register']}>
            <Routes>
                <Route path="/register" element={ui} />
                <Route path="/login" element={<div>Login Page</div>} />
            </Routes>
        </MemoryRouter>
      </SnackbarProvider>
    );
  };

  it('should render registration form correctly', () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument(); // Exact match for "Password"
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign Up/i })).toBeInTheDocument();
    expect(screen.getByText(/Already have an account\? Sign in/i)).toBeInTheDocument();
  });

  it('should allow typing into form fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    
    await user.type(screen.getByLabelText(/Username/i), 'newuser');
    expect(screen.getByLabelText(/Username/i).value).toBe('newuser');

    await user.type(screen.getByLabelText(/Email Address/i), 'new@example.com');
    expect(screen.getByLabelText(/Email Address/i).value).toBe('new@example.com');

    await user.type(screen.getByLabelText(/^Password$/i), 'password123');
    expect(screen.getByLabelText(/^Password$/i).value).toBe('password123');

    await user.type(screen.getByLabelText(/Confirm Password/i), 'password123');
    expect(screen.getByLabelText(/Confirm Password/i).value).toBe('password123');
  });

  it('should display validation errors for invalid input', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    const signUpButton = screen.getByRole('button', { name: /Sign Up/i });

    // Submit empty form
    await user.click(signUpButton);

    expect(await screen.findByText(/Username is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/^Password is required$/i)).toBeInTheDocument(); // For the "Password" field specifically
    
    // Test invalid email
    await user.type(screen.getByLabelText(/Email Address/i), 'invalidemail');
    await user.click(signUpButton);
    expect(await screen.findByText(/Email address is invalid/i)).toBeInTheDocument();

    // Test short password
    await user.type(screen.getByLabelText(/^Password$/i), '123'); // Clear and type
    // Need to clear and re-type for other fields to satisfy initial checks
    await user.clear(screen.getByLabelText(/Username/i));
    await user.type(screen.getByLabelText(/Username/i), 'user');
    await user.clear(screen.getByLabelText(/Email Address/i));
    await user.type(screen.getByLabelText(/Email Address/i), 'valid@email.com');


    await user.click(signUpButton);
    expect(await screen.findByText(/Password must be at least 6 characters/i)).toBeInTheDocument();

    // Test password mismatch
    await user.type(screen.getByLabelText(/^Password$/i), 'password123'); // Clear and type new valid password
    await user.type(screen.getByLabelText(/Confirm Password/i), 'password456'); // Clear and type mismatching password
    await user.click(signUpButton);
    expect(await screen.findByText(/Passwords do not match/i)).toBeInTheDocument();
  });

  it('should call register action on submit with valid data and navigate on success', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce({ user: { email: 'new@example.com' } }); // Simulate successful registration
    useAuthStore.mockReturnValue({ ...mockAuthStoreState, register: mockRegister });

    renderWithProviders(<RegisterPage />);
    
    await user.type(screen.getByLabelText(/Username/i), 'newuser');
    await user.type(screen.getByLabelText(/Email Address/i), 'new@example.com');
    await user.type(screen.getByLabelText(/^Password$/i), 'password123');
    await user.type(screen.getByLabelText(/Confirm Password/i), 'password123');
    
    await user.click(screen.getByRole('button', { name: /Sign Up/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('newuser', 'new@example.com', 'password123');
    });
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('should display error message from authStore on registration failure', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Email already in use';
    mockRegister.mockRejectedValueOnce(new Error(errorMessage));
    useAuthStore.mockReturnValue({ ...mockAuthStoreState, register: mockRegister, error: errorMessage });

    renderWithProviders(<RegisterPage />);
    
    await user.type(screen.getByLabelText(/Username/i), 'newuser');
    await user.type(screen.getByLabelText(/Email Address/i), 'new@example.com');
    await user.type(screen.getByLabelText(/^Password$/i), 'password123');
    await user.type(screen.getByLabelText(/Confirm Password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /Sign Up/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
      // General auth error display (not field specific in this case)
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should show loading indicator when isLoading is true', () => {
    useAuthStore.mockReturnValue({ ...mockAuthStoreState, isLoading: true });
    renderWithProviders(<RegisterPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign Up/i })).toBeDisabled();
  });
});
