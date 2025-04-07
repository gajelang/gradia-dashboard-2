"use client";

import { createContext, useState, useContext, useEffect, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";

// User type definition
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

// Additional registration data type
interface AdditionalRegistrationData {
  fullName?: string;
  phoneNumber?: string;
  position?: string;
  department?: string;
  [key: string]: string | undefined;
}

// Extended AuthContext with additional security parameters
interface AuthContextType {
  user: User | null;
  csrfToken: string | null; // CSRF token for protection against CSRF attacks
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, additionalData?: AdditionalRegistrationData) => Promise<boolean>;
  logout: () => Promise<boolean>;
  refreshCSRFToken: () => Promise<boolean>; // Function to refresh CSRF token
}

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [csrfToken, setCSRFToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Wrap logout with useCallback to stabilize its reference
  const logout = useCallback(async (): Promise<boolean> => {
    try {
      // Call logout API to invalidate the token server-side
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Don't use csrfToken from state to avoid dependency cycles
          // For logout, this is less critical for security
        },
      });

      // Even if the API call fails, we still want to clear client-side state

      // Clear client-side state
      setUser(null);
      setCSRFToken(null);
      localStorage.removeItem('user');

      // Redirect to login page
      router.push('/login');
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear client-side state on error
      setUser(null);
      setCSRFToken(null);
      localStorage.removeItem('user');
      router.push('/login');
      return false;
    }
  }, [router]); // Remove csrfToken dependency

  // Function to refresh CSRF token
  const refreshCSRFToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        throw new Error('Failed to refresh CSRF token');
      }

      const data = await response.json();

      // Update CSRF token in localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          userData.csrfToken = data.csrfToken;
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (e) {
          console.error('Error updating CSRF token in localStorage:', e);
        }
      }

      setCSRFToken(data.csrfToken);
      return true;
    } catch (error) {
      console.error('CSRF token refresh error:', error);
      return false;
    }
  }, []);

  // Wrap validateSession with useCallback and include logout as dependency
  const validateSession = useCallback(async () => {
    try {
      // Call /api/auth/me endpoint to validate the session
      // The cookie will be sent automatically
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include', // Include cookies
      });

      if (response.ok) {
        const data = await response.json();

        // Save user data and CSRF token
        const userData = {
          ...data.user,
          csrfToken: data.csrfToken // Include CSRF token in user data
        };
        localStorage.setItem('user', JSON.stringify(userData));

        setUser(data.user);
        setCSRFToken(data.csrfToken);
        setIsLoading(false);
      } else {
        // Session invalid
        await logout();
      }
    } catch (err) {
      console.error("Session validation error:", err);
      setIsLoading(false);
      // Continue with stored user data if offline
    }
  }, [logout]);

  // Check for session on initial load - only runs once
  useEffect(() => {
    const checkInitialSession = async () => {
      const storedUser = localStorage.getItem('user');

      if (storedUser) {
        try {
          // Set user from localStorage temporarily while we validate the session
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);

          // Validate the session with the server
          await validateSession();
        } catch (err) {
          console.error("Error parsing stored user:", err);
          localStorage.removeItem('user');
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    // Run the initial session check
    checkInitialSession();

    // We don't need to set up an interval here - it would cause too many requests
    // Instead, we'll refresh the token when needed (after login, etc.)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array means this only runs once

  // We don't need a separate useEffect for CSRF token refresh
  // The interval in the main useEffect will handle this
  // And we'll refresh the token when the user logs in or registers

  // Login function with enhanced security
  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Include cookies in the request
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Save user data and CSRF token
      const userData = {
        ...data.user,
        csrfToken: data.csrfToken // Include CSRF token in user data
      };
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(data.user);
      setCSRFToken(data.csrfToken);

      // Redirect to dashboard
      router.push('/dashboard');
      return true;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function with enhanced security
  const register = async (name: string, email: string, password: string, additionalData?: AdditionalRegistrationData): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Prepare registration data
      const registrationData = {
        name,
        email,
        password,
        ...additionalData
      };

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
        credentials: 'include', // Include cookies in the request
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Save user data and CSRF token
      const userData = {
        ...data.user,
        csrfToken: data.csrfToken // Include CSRF token in user data
      };
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(data.user);
      setCSRFToken(data.csrfToken);

      // Redirect to dashboard
      router.push('/dashboard');
      return true;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue = {
    user,
    csrfToken,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshCSRFToken,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
