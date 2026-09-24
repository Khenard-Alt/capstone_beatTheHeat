import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { supabase } from '../services/supabase';
import { apiClient } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { completeLogin } = useAuth();
  const [message, setMessage] = useState('Completing Google sign-in...');

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
        const { data: syncResponse } = await apiClient.post('/api/users/oauth/sync', {
          accessToken: data.session.access_token,
          existingOnly: true,
        });
        completeLogin(syncResponse.user, syncResponse.token);
        if (active) navigate(getLandingPath(syncResponse.user.role), { replace: true });
        return;
      } catch (syncError) {
        if (!axios.isAxiosError(syncError) || syncError.response?.status !== 404) {
          setMessage('Could not complete Google sign-in. Please try again.');
          return;
        }
      }

      const metadata = data.session.user.user_metadata ?? {};
      sessionStorage.setItem('bth_pending_google_registration', JSON.stringify({
        accessToken: data.session.access_token,
        email: data.session.user.email ?? '',
        firstName: metadata.first_name ?? metadata.given_name ?? metadata.name?.split(' ')[0] ?? '',
        lastName: metadata.last_name ?? metadata.family_name ?? metadata.name?.split(' ').slice(1).join(' ') ?? '',
      }));
      if (active) navigate('/login?oauth=google', { replace: true });
    };

    void completeSignIn();
    return () => { active = false; };
  }, [navigate]);

  return <main style={{ padding: 32, textAlign: 'center' }}><h1>{message}</h1></main>;
};
