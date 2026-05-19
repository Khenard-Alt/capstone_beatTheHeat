import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { isValidEmail } from '../utils/validators';
import { STORAGE_KEYS } from '../utils/constants';
import { MdEmail, MdLock, MdClose, MdAdminPanelSettings } from 'react-icons/md';
import '../styles/Login.css';
import RegisterModal from './Register';

const ADMIN_AUTH_STORAGE_KEY = 'school_management_admin_unlocked';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const { login } = auth;

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [adminAuthEmail, setAdminAuthEmail] = useState('admin@beattheheat.local');
  const [adminAuthSecret, setAdminAuthSecret] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');
  const [adminAuthSuccess, setAdminAuthSuccess] = useState('');
  const [isAuthenticatingAdmin, setIsAuthenticatingAdmin] = useState(false);
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setShowAdminAuth(true);
        setAdminAuthError('');
        setAdminAuthSuccess('');
      }
    };

    window.addEventListener('keydown', handleShortcut);

    return () => {
      window.removeEventListener('keydown', handleShortcut);
    };
  }, []);

  const getLandingPath = (role: string): string => {
    switch (role) {
      case 'parent':
        return '/parent/dashboard';
      case 'principal':
        return '/principal/dashboard';
      case 'head-teacher':
        return '/head-teacher/dashboard';
      case 'teacher':
        return '/teacher/dashboard';
      case 'admin':
        return '/admin';
      default:
        return '/dashboard';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validate()) return;

    setIsLoading(true);
    try {
      const signedInUser = await login(formData.email, formData.password);
      navigate(getLandingPath(signedInUser.role));
    } catch {
      setErrorMessage('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setAdminAuthError('');
    setAdminAuthSuccess('');
    setIsAuthenticatingAdmin(true);

    try {
      const response = await apiClient.post('/api/users/admin-auth', {
        email: adminAuthEmail,
        secret: adminAuthSecret,
      });

      if (!response.data?.success) {
        throw new Error('Admin authentication failed.');
      }

      localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, 'true');
      
      const adminUser = {
        id: 'admin-auth-session',
        email: adminAuthEmail,
        firstName: 'Admin',
        lastName: 'Panel',
        role: 'admin' as const,
        schoolId: 'school-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Use the context setter to update the global auth state immediately
      if (auth && 'setAdminAuthSession' in auth) {
        auth.setAdminAuthSession(adminUser as any);
      } else {
        // Fallback if context is tricky, though we'll ensure it works
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(adminUser));
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'admin-auth-token');
      }
      
      setAdminAuthSecret('');
      setAdminAuthSuccess('Admin authenticated. Redirecting to admin panel...');
      
      setTimeout(() => {
        navigate('/admin');
      }, 800);
    } catch (authError) {
      setAdminAuthError(authError instanceof Error ? authError.message : 'Admin authentication failed.');
    } finally {
      setIsAuthenticatingAdmin(false);
    }
  };

  return (
    <div className="login-page">
      {showAdminAuth && (
        <div className="admin-auth-overlay" role="dialog" aria-modal="true">
          <form className="admin-auth-modal" onSubmit={handleAdminAuth}>
            <div className="admin-auth-modal-header">
              <div>
                {/* <div className="admin-auth-eyebrow">Login Shortcut</div> */}
                <h2>Admin Authentication</h2>
              </div>
              <button
                type="button"
                className="admin-auth-close"
                onClick={() => setShowAdminAuth(false)}
                aria-label="Close admin auth"
              >
                <MdClose />
              </button>
            </div>

            {adminAuthError && <div className="admin-inline-alert error">{adminAuthError}</div>}
            {adminAuthSuccess && <div className="admin-inline-alert success">{adminAuthSuccess}</div>}

            <Input
              label="Admin Email"
              value={adminAuthEmail}
              onChange={(event) => setAdminAuthEmail(event.target.value)}
              placeholder="admin@example.com"
            />
            <Input
              label="Password"
              type="password"
              value={adminAuthSecret}
              onChange={(event) => setAdminAuthSecret(event.target.value)}
              placeholder="Enter admin password"
            />

            <div className="admin-auth-actions">
              <Button variant="secondary" type="button" onClick={() => setShowAdminAuth(false)}>
                Close
              </Button>
              <Button variant="primary" type="submit" loading={isAuthenticatingAdmin} icon={<MdAdminPanelSettings />}>
                Verify Admin Auth
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="login-split-container">
        {/* Left Side - Branding */}
        <div className="login-brand-section">
          {/* Animated Particles */}
          <div className="particles">
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
          </div>
          
          <div className="login-brand-content">
            <div className="login-brand-logo">
              <div className="login-logo-icon"></div>
              <h1 className="login-brand-title">Beat The Heat</h1>
            </div>
            <p className="login-brand-description">
              AI-Integrated Smart Heat Index and Real-Time Health Advisory System
            </p>
            <div className="login-brand-features">
              <div className="feature-item">
                <div className="feature-icon">📊</div>
                <div className="feature-text">
                  <h3>Real-Time Monitoring</h3>
                  <p>Track heat index levels across school premises</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🏥</div>
                <div className="feature-text">
                  <h3>Health Advisories</h3>
                  <p>Instant alerts for heat-related health concerns</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🤖</div>
                <div className="feature-text">
                  <h3>AI-Powered Analysis</h3>
                  <p>Smart predictions and recommendations</p>
                </div>
              </div>
            </div>
            <div className="login-brand-footer">
              <p>Mayamot Elementary School</p>
              <p className="login-copyright">© 2026 Beat The Heat Project</p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-section">
          <div className="login-form-container">
            <div className="login-form-header">
              <h2 className="login-form-title">Welcome Back</h2>
              <p className="login-form-subtitle">Sign in to access the monitoring system</p>
            </div>

            {errorMessage && (
              <div className="login-error-message">
                <span className="error-icon">⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <MdEmail className="input-icon" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                    className={`form-input ${errors.email ? 'input-error' : ''}`}
                  />
                </div>
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrapper">
                  <MdLock className="input-icon" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className={`form-input ${errors.password ? 'input-error' : ''}`}
                  />
                </div>
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>

              <div className="login-options">
                <label className="checkbox-label">
                  <input type="checkbox" className="checkbox-input" />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className="forgot-password">
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                className={`login-submit-btn ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="login-signup">
              <p className="signup-prompt">Don't have an account?</p>
              <button className="signup-btn btn btn-secondary" onClick={() => setIsRegisterOpen(true)}>Create an account</button>
            </div>
          </div>
        </div>

        <RegisterModal open={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
      </div>

    </div>
  );
};
