import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { STORAGE_KEYS } from '../utils/constants';
import axios from 'axios';
import { apiClient } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  register: (data: any) => Promise<void>;
  setAdminAuthSession: (user: User) => void;
  updateUser: (u: User) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setAdminAuthSession = (adminUser: User) => {
    setUser(adminUser);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(adminUser));
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'admin-auth-token');
  };

  const updateUser = (u: User) => {
    setUser(u);
    try {
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(u));
    } catch (_) {}
  };

  useEffect(() => {
    // Check for stored user data on mount
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user data:', error);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, _password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.post('/api/users/login', {
        email,
        password: _password,
      });

      const mockUser: User = data.user;

      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(mockUser));
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'mock-token');
      setUser(mockUser);
      return mockUser;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;
        const message =
          responseData && typeof responseData === 'object' && 'message' in responseData
            ? String(responseData.message)
            : error.message || 'Login failed';
        console.error('Login error:', error);
        throw new Error(message);
      }
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    setUser(null);
  };

  const register = async (data: any) => {
    setIsLoading(true);
    try {
      const { data: result } = await apiClient.post('/api/users/register', {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        phone: data.phone,
        childId: data.childId,
      });

      const newUser: User = {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        schoolId: result.user.schoolId,
        createdAt: result.user.createdAt,
        updatedAt: result.user.updatedAt,
      };

      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(newUser));
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'auth-token');
      setUser(newUser);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;
        const message =
          responseData && typeof responseData === 'object' && 'message' in responseData
            ? String(responseData.message)
            : error.message || 'Registration failed';
        console.error('Registration error:', error);
        throw new Error(message);
      }
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        register,
        setAdminAuthSession,
          updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
