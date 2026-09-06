import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';
import { supabase } from '../services/supabase';
import type { User } from '../types';
import { STORAGE_KEYS } from '../utils/constants';

const getLandingPath = (role: string): string => {
  switch (role) {
    case 'parent': return '/parent/dashboard';
    case 'principal': return '/principal/dashboard';
    case 'head-teacher': return '/head-teacher/dashboard';
    case 'teacher': return '/teacher/dashboard';
    case 'admin': return '/admin';
    default: return '/dashboard';
  }
};

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [message, setMessage] = useState('Completing Google sign-in...');

  useEffect(() => {
    let active = true;

    const completeSignIn = async () => {
      if (!supabase) {
        setMessage('Google sign-in is not configured yet.');
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setMessage(error?.message ?? 'Google sign-in session was not found.');
        return;
      }

      try {
        const response = await apiClient.post<{ success: boolean; user: User; token: string }>(
          '/api/users/oauth/sync',
          { accessToken: data.session.access_token },
        );
        if (!active) return;
        updateUser(response.data.user);
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
        navigate(getLandingPath(response.data.user.role), { replace: true });
      } catch (requestError) {
        setMessage(requestError instanceof Error ? requestError.message : 'Could not sync your Google account.');
      }
    };

    void completeSignIn();
    return () => { active = false; };
  }, [navigate, updateUser]);

  return <main style={{ padding: 32, textAlign: 'center' }}><h1>{message}</h1></main>;
};
