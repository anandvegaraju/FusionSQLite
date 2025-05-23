import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom'; // MemoryRouter for testing
import userEvent from '@testing-library/user-event'; // For more realistic user interactions

import LoginPage from '../LoginPage';
import useAuthStore from '../../store/authStore'; // Zustand store
import { SnackbarProvider } from 'notistack'; // Required by LoginPage

// Mock the authStore
jest.mock('../../store/authStore');

// Mock Copyright component as it's not the focus of this test
jest.mock('../../components/common/Copyright', () => () => <div data-testid="mock-copyright">Copyright</div>);


// Mock navigate to check redirection
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
  useNavigate: () => mockNavigate,
  Link: jest.fn().mockImplementation(({ to, children, ...rest }) => <a href={to} {...rest}>{children}</a>) // Simple mock for Link
}));


describe('LoginPage Component', () => {
  let mockLogin;
  let mockAuthStoreState;

  beforeEach(() => {
    // Reset mocks and store state before each test
    mockLogin = jest.fn();
    mockNavigate.mockClear();
    
    mockAuthStoreState = {
      login: mockLogin,
      isLoading: false,
      error: null,
      token: null, // Simulate logged out state
    };
    useAuthStore.mockReturnValue(mockAuthStoreState); // Default mock state for the store hook
  });

  const renderWithProviders = (ui) => {
    return render(
      <SnackbarProvider>
        <MemoryRouter initialEntries={['/login']}>
            <Routes>
                <Route path="/login" element={ui} />
                <Route path="/" element={<div>Dashboard Page</div>} /> {/* Mock dashboard for navigation checks */}
            </Routes>
        </MemoryRouter>
      </SnackbarProvider>
    );
  };

  it('should render login form correctly', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByText(/Don't have an account\? Sign Up/i)).toBeInTheDocument();
    expect(screen.getByTestId('mock-copyright')).toBeInTheDocument(); // Check for mocked Copyright
  });

  it('should allow typing into email and password fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Password/i);

    await user.type(emailInput, 'test@example.com');
    expect(emailInput.value).toBe('test@example.com');

    await user.type(passwordInput, 'password123');
    expect(passwordInput.value).toBe('password123');
  });

  it('should show error if email or password is empty on submit', async () => {
    renderWithProviders(<LoginPage />);
    const signInButton = screen.getByRole('button', { name: /Sign In/i });
    
    fireEvent.click(signInButton); // Click without filling form

    // The component uses enqueueSnackbar for this, we can check if login was NOT called
    // Or, if there's a local formError state that shows a message:
    await waitFor(() => {
      // Assuming enqueueSnackbar is called, which is hard to assert directly without mocking it globally
      // and checking calls. For this test, let's check that login was not called.
      expect(mockLogin).not.toHaveBeenCalled();
      // If there was a local error display:
      // expect(screen.getByText(/Email and password are required/i)).toBeInTheDocument();
    });
  });

  it('should call login action on submit with valid data and navigate on success', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({ token: 'fake-token', user: { email: 'test@example.com' } }); // Simulate successful login
    useAuthStore.mockReturnValue({ ...mockAuthStoreState, login: mockLogin });


    renderWithProviders(<LoginPage />);
    
    await user.type(screen.getByLabelText(/Email Address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
    
    // Wait for navigation to be called after successful login
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should display error message from authStore on login failure', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Invalid credentials';
    mockLogin.mockRejectedValueOnce(new Error(errorMessage)); // Simulate failed login
    // Update the store mock to reflect the error state AFTER the call
    useAuthStore.mockImplementation(selectorFn => {
        const state = {
            ...mockAuthStoreState,
            login: mockLogin,
            // Simulate error being set after login attempt
            error: selectorFn === useAuthStore ? errorMessage : null, 
            isLoading: selectorFn === useAuthStore ? false : false,
        };
        return state;
    });
    // A more direct way to test error display is to set it in the initial mock and ensure login page reads it
    useAuthStore.mockReturnValue({ ...mockAuthStoreState, login: mockLogin, error: errorMessage });


    renderWithProviders(<LoginPage />);
    
    await user.type(screen.getByLabelText(/Email Address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
      // The error is displayed from the store's error state
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should show loading indicator when isLoading is true', () => {
    useAuthStore.mockReturnValue({ ...mockAuthStoreState, isLoading: true });
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeDisabled();
  });
  
  it('should navigate to register page when "Sign Up" link is clicked', async () => {
      renderWithProviders(<LoginPage />);
      const signUpLink = screen.getByText(/Don't have an account\? Sign Up/i);
      expect(signUpLink.closest('a')).toHaveAttribute('href', '/register'); // Check link destination
      // Actual navigation testing with MemoryRouter is more complex if you want to assert the route change.
      // For this unit test, checking the link's href is often sufficient.
  });
});
