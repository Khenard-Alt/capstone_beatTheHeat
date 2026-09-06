import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
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
