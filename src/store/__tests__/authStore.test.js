import useAuthStore from '../authStore';
import { act } from '@testing-library/react'; // For tests that update state

// Mock global fetch
global.fetch = jest.fn();

// Helper to reset store state before each test
const resetAuthStore = () => {
  act(() => {
    useAuthStore.setState(useAuthStore.getInitialState ? useAuthStore.getInitialState() : {
      token: null,
      user: null,
      isLoading: false,
      error: null,
    });
    // If persist middleware is used, you might need to clear its storage too,
    // or re-initialize the store to its default state.
    // For `persist` middleware, clearing localStorage item might be needed if tests interfere.
    localStorage.removeItem('auth-storage'); 
    // Re-initialize the store to ensure a clean state for persist middleware
     act(() => {
      useAuthStore.persist.rehydrate();
    });
  });
};


describe('Auth Store', () => {
  beforeEach(() => {
    fetch.mockClear();
    resetAuthStore();
  });
  
  afterEach(() => {
    // Ensure localStorage is clean after tests if persist is involved
    localStorage.removeItem('auth-storage');
  });


  it('should have initial state', () => {
    const { token, user, isLoading, error } = useAuthStore.getState();
    expect(token).toBeNull();
    expect(user).toBeNull();
    expect(isLoading).toBe(false);
    expect(error).toBeNull();
  });

  describe('Login Action', () => {
    const mockLoginCredentials = { email: 'test@example.com', password: 'password123' };
    const mockLoginResponse = {
      token: 'fake-jwt-token',
      user: { id: 1, username: 'testuser', email: 'test@example.com' },
    };

    it('should set token and user on successful login', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLoginResponse,
      });

      // Using act for async state updates
      await act(async () => {
        await useAuthStore.getState().login(mockLoginCredentials.email, mockLoginCredentials.password);
      });
      
      const { token, user, isLoading, error } = useAuthStore.getState();
      expect(token).toBe(mockLoginResponse.token);
      expect(user).toEqual(mockLoginResponse.user);
      expect(isLoading).toBe(false);
      expect(error).toBeNull();
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/login'), expect.any(Object));
    });

    it('should set error on failed login', async () => {
      const errorMessage = 'Invalid credentials';
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: errorMessage }),
      });

      try {
        await act(async () => {
          await useAuthStore.getState().login(mockLoginCredentials.email, mockLoginCredentials.password);
        });
      } catch (e) {
        expect(e.message).toBe(errorMessage);
      }
      
      const { token, user, isLoading, error } = useAuthStore.getState();
      expect(token).toBeNull();
      expect(user).toBeNull();
      expect(isLoading).toBe(false);
      expect(error).toBe(errorMessage);
    });
  });

  describe('Register Action', () => {
    const mockRegisterData = { username: 'newuser', email: 'new@example.com', password: 'newpassword123' };
    const mockRegisterResponse = {
      message: 'User registered successfully.',
      user: { id: 2, username: 'newuser', email: 'new@example.com' },
    };

    it('should complete registration successfully (no state change for token/user)', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegisterResponse,
      });

      await act(async () => {
        await useAuthStore.getState().register(mockRegisterData.username, mockRegisterData.email, mockRegisterData.password);
      });

      const { token, user, isLoading, error } = useAuthStore.getState();
      expect(token).toBeNull(); // Register doesn't log in automatically in this store
      expect(user).toBeNull();
      expect(isLoading).toBe(false);
      expect(error).toBeNull();
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/register'), expect.any(Object));
    });

    it('should set error on failed registration', async () => {
      const errorMessage = 'Email already exists';
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: errorMessage }),
      });

      try {
        await act(async () => {
          await useAuthStore.getState().register(mockRegisterData.username, mockRegisterData.email, mockRegisterData.password);
        });
      } catch (e) {
        expect(e.message).toBe(errorMessage);
      }
      
      const { isLoading, error } = useAuthStore.getState();
      expect(isLoading).toBe(false);
      expect(error).toBe(errorMessage);
    });
  });

  describe('Logout Action', () => {
    it('should clear token and user on logout', async () => {
      // First, simulate a login
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'temp-token', user: { id: 1 } }),
      });
      await act(async () => {
        await useAuthStore.getState().login('any@mail.com', 'anypass');
      });
      expect(useAuthStore.getState().token).toBe('temp-token');

      // Then, logout
      act(() => {
        useAuthStore.getState().logout();
      });
      
      const { token, user, isLoading, error } = useAuthStore.getState();
      expect(token).toBeNull();
      expect(user).toBeNull();
      expect(isLoading).toBe(false);
      expect(error).toBeNull();
    });
  });
  
  describe('getToken selector', () => {
    it('should return the current token', async () => {
       const mockToken = 'test-token-123';
       act(() => {
           useAuthStore.setState({ token: mockToken });
       });
       expect(useAuthStore.getState().getToken()).toBe(mockToken);
    });
  });
});
