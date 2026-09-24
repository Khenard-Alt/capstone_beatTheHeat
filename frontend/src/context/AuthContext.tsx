import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { STORAGE_KEYS } from '../utils/constants';
import axios from 'axios';
import { apiClient } from '../services/api';
import { supabase } from '../services/supabase';
import { getDeviceId, getDeviceLabel } from '../utils/deviceInfo';

export class PendingDeviceConfirmationError extends Error {
  sessionId: string;

  constructor(sessionId: string) {
    super('Awaiting confirmation from your other device.');
    this.name = 'PendingDeviceConfirmationError';
    this.sessionId = sessionId;
  }
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  completeLogin: (user: User, token: string) => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  register: (data: any) => Promise<{ user: User; verification?: string }>;
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

  useEffect(() => {
    // Closing the tab/browser (instead of clicking Logout) leaves no chance
    // for a normal async request to finish, so the server-side active_sessions
    // row would otherwise stay 'active' forever. sendBeacon is the one API
    // guaranteed to fire during unload, so we use it as a best-effort revoke.
    const revokeOnClose = () => {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!token) return;
      const url = `${apiClient.defaults.baseURL ?? ''}/api/users/logout`;
      const payload = JSON.stringify({ token });
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
        } else {
          fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
        }
      } catch {
        // best-effort only; nothing to do if the browser blocks the beacon
      }
    };

    window.addEventListener('pagehide', revokeOnClose);
    return () => window.removeEventListener('pagehide', revokeOnClose);
  }, []);

  const login = async (email: string, _password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.post('/api/users/login', {
        email,
        password: _password,
        deviceId: getDeviceId(),
        deviceLabel: getDeviceLabel(),
      });

      if (data.status === 'pending_confirmation') {
        throw new PendingDeviceConfirmationError(data.sessionId);
      }

      const loggedInUser: User = data.user;

      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(loggedInUser));
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token ?? 'mock-token');
      setUser(loggedInUser);
      return loggedInUser;
    } catch (error) {
      if (error instanceof PendingDeviceConfirmationError) {
        throw error;
      }
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

  const completeLogin = (loggedInUser: User, token: string) => {
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(loggedInUser));
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    setUser(loggedInUser);
  };

  const logout = () => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      // Best-effort: revoke server-side so a later login from another device
      // doesn't wait forever for approval from a device that already logged
      // out. Fire-and-forget — logout must not be blocked by the network.
      void apiClient.post('/api/users/logout', { token }).catch(() => {});
    }
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    setUser(null);
  };

  const loginWithGoogle = async () => {
    if (!supabase) {
      throw new Error('Google sign-in is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) throw error;
  };

  const register = async (data: any): Promise<{ user: User; verification?: string }> => {
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
        studentNumber: data.studentNumber,
        oauthAccessToken: data.oauthAccessToken,
        deviceId: getDeviceId(),
        deviceLabel: getDeviceLabel(),
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
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, result.token ?? 'auth-token');
      setUser(newUser);
      return { user: newUser, verification: result.verification };
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
        completeLogin,
        loginWithGoogle,
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
