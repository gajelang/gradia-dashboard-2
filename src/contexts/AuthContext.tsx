"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// Enhanced user interface with additional fields
interface User {
  userId: string;
  id: string;
  name: string;
  email: string;
  role: string;
  fullName?: string;
  phoneNumber?: string;
  position?: string;
  department?: string;
  address?: string;
  bio?: string;
  skills?: string;
  experience?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Additional registration data interface
interface AdditionalRegistrationData {
  fullName?: string;
  phoneNumber?: string;
  position?: string;
  department?: string;
  [key: string]: string | undefined;
}

// Extended AuthContext with additional registration parameters
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, additionalData?: AdditionalRegistrationData) => Promise<boolean>;
  logout: () => void;
}

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Validate token with the server
  const validateToken = async (currentToken: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsLoading(false);
      } else {
        // Token invalid
        logout();
      }
    } catch (err) {
      console.error("Token validation error:", err);
      setIsLoading(false);
      // Continue with stored user data if offline
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Check if user is already logged in on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        validateToken(storedToken);
      } catch (err) {
        console.error("Error parsing stored user:", err);
        logout(); // Invalid stored data, log out
      }
    } else {
      setIsLoading(false);
    }
  }, [logout, validateToken]);

  // Login function
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
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      // Save user and token
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setUser(data.user);
      setToken(data.token);
      
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

  // Register function that works with your existing API
  const register = async (
    name: string, 
    email: string, 
    password: string,
    additionalData?: AdditionalRegistrationData
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Prepare registration data
      const userData = {
        name,
        email,
        password,
        // Include additional user profile data if provided
        ...(additionalData || {})
      };
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      return true;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Value object for the context provider
  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}