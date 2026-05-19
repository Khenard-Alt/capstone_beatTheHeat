import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { isValidEmail } from '../utils/validators';
import { STORAGE_KEYS } from '../utils/constants';
import { MdEmail, MdLock, MdClose, MdSend, MdAdminPanelSettings } from 'react-icons/md';
import { generateScopedAdvisory } from '../services/healthAdvisory.service';
import '../styles/Login.css';
import RegisterModal from './Register';

const ADMIN_AUTH_STORAGE_KEY = 'school_management_admin_unlocked';

interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  suggestions?: string[];
}

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [adminAuthEmail, setAdminAuthEmail] = useState('admin@beattheheat.local');
  const [adminAuthSecret, setAdminAuthSecret] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');
  const [adminAuthSuccess, setAdminAuthSuccess] = useState('');
  const [isAuthenticatingAdmin, setIsAuthenticatingAdmin] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      text: "Hi! I am the Beat The Heat AI Advisory Assistant. I only use this system's live heat, humidity, and temperature data to generate school health advisories.",
      sender: 'ai',
      suggestions: [
        'Generate advisory based on current heat',
        'Explain heat index risk levels',
        'What actions for danger level?',
        'How is AI limited in this system?'
      ]
    }
  ]);
  const [userInput, setUserInput] = useState('');

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

  const getAIResponse = (message: string): { text: string; suggestions?: string[] } => {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('heat index') || lowerMsg.includes('what is')) {
      return {
        text: "Heat Index is the felt temperature when humidity is combined with air temperature. In this system, AI advisories are grounded on live heat index + humidity + temperature to guide school safety decisions.",
        suggestions: ['Generate advisory based on current heat', 'Explain heat index risk levels', 'System scope of AI']
      };
    } else if (lowerMsg.includes('weather') || lowerMsg.includes('current')) {
      return {
        text: "The system captures live weather and computes heat index in real-time. The AI then converts these values into prioritized actions for students, teachers, and school staff.",
        suggestions: ['Generate advisory based on current heat', 'What actions for danger level?', 'Emergency protocols']
      };
    } else if (lowerMsg.includes('health') || lowerMsg.includes('advisory') || lowerMsg.includes('tips')) {
      return {
        text: "AI advisories are generated from heat levels:\n\n🟢 Safe\n🟡 Caution\n🟠 Extreme Caution\n🔴 Danger\n⚫ Extreme Danger\n\nEach response includes risk level, action list, and scope note tied to system weather values.",
        suggestions: ['Generate advisory based on current heat', 'What actions for danger level?', 'How is AI limited in this system?']
      };
    } else if (lowerMsg.includes('use') || lowerMsg.includes('how') || lowerMsg.includes('system')) {
      return {
        text: "Login to access dashboards and AI-generated advisories. The AI assistant is system-scoped: it avoids off-topic answers and focuses only on heat safety guidance from live weather values.",
        suggestions: ['System benefits', 'Available features', 'Who can use this?']
      };
    } else if (lowerMsg.includes('feature') || lowerMsg.includes('benefit')) {
      return {
        text: "Our key features:\n✅ Real-time heat monitoring\n✅ AI-powered predictions\n✅ Health advisory alerts\n✅ Student tracking\n✅ Automated notifications\n✅ Historical data analysis",
        suggestions: ['How accurate is AI?', 'Alert notifications', 'Data privacy']
      };
    } else if (lowerMsg.includes('emergency') || lowerMsg.includes('danger')) {
      return {
        text: "In emergency situations with extreme heat:\n🚨 Instant alerts sent to all teachers\n🚨 Automatic activity recommendations\n🚨 Student health monitoring\n🚨 Emergency contact notifications\n\nSafety is our top priority! 💪",
        suggestions: ['Prevention measures', 'First aid tips', 'Contact support']
      };
    } else {
      return {
        text: "I can help with system-based heat advisories:\n• Current heat risk explanation\n• Advisory actions for school operations\n• Scope and confidence of AI output\n• Safety tips per heat level",
        suggestions: ['Generate advisory based on current heat', 'Explain heat index risk levels', 'How is AI limited in this system?', 'Safety guidelines']
      };
    }
  };

  const formatScopedResponse = (scoped: Awaited<ReturnType<typeof generateScopedAdvisory>>): string => {
    const confidenceRaw = typeof scoped.confidenceScore === 'number' ? scoped.confidenceScore : 0;
    const confidencePercent = Math.round(Math.max(0, Math.min(1, confidenceRaw)) * 100);
    const rationale = scoped.decisionBasis?.rationale?.length
      ? scoped.decisionBasis.rationale
      : ['Recommendations are based on current in-system heat and humidity values.'];

    return [
      scoped.summary,
      '',
      `Risk Level: ${scoped.riskLevel}`,
      `Confidence: ${confidencePercent}%`,
      '',
      'Recommended Actions:',
      ...scoped.actions.map((action) => `• ${action}`),
      '',
      'Heat Data Basis:',
      `• Heat Index: ${scoped.decisionBasis?.heatIndexC ?? 'N/A'}°C`,
      `• Temperature: ${scoped.decisionBasis?.temperatureC ?? 'N/A'}°C`,
      `• Humidity: ${scoped.decisionBasis?.humidityPercent ?? 'N/A'}%`,
      `• Heat Level: ${scoped.decisionBasis?.heatLevel ?? 'N/A'}`,
      `• Data Source: ${scoped.decisionBasis?.dataSource ?? 'system'}`,
      '',
      'AI Rationale:',
      ...rationale.map((item) => `• ${item}`),
      '',
      scoped.scopeNote,
    ].join('\n');
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || userInput;
    if (!textToSend.trim()) return;

    const userMessage: ChatMessage = {
      id: chatMessages.length + 1,
      text: textToSend,
      sender: 'user'
    };

    let response = getAIResponse(textToSend);

    try {
      const scoped = await generateScopedAdvisory(textToSend);
      response = {
        text: formatScopedResponse(scoped),
        suggestions: ['Generate advisory based on current heat', 'What actions for danger level?', 'How is AI limited in this system?'],
      };
    } catch (error) {
      console.error('Scoped AI API unavailable. Falling back to local assistant.', error);
    }

    const aiMessage: ChatMessage = {
      id: chatMessages.length + 2,
      text: response.text,
      sender: 'ai',
      suggestions: response.suggestions
    };

    setChatMessages((prev) => [...prev, userMessage, aiMessage]);
    setUserInput('');
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
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
      
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(adminUser));
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'admin-auth-token');
      
      setAdminAuthSecret('');
      setAdminAuthSuccess('Admin authenticated. Redirecting to admin panel...');
      
      setTimeout(() => {
        navigate('/schools');
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
                <div className="admin-auth-eyebrow">Login Shortcut</div>
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

            <p className="admin-auth-copy">This modal appears only on Login. Use Ctrl + Shift + A to open admin authentication.</p>

            {adminAuthError && <div className="admin-inline-alert error">{adminAuthError}</div>}
            {adminAuthSuccess && <div className="admin-inline-alert success">{adminAuthSuccess}</div>}

            <Input
              label="Admin Email"
              value={adminAuthEmail}
              onChange={(event) => setAdminAuthEmail(event.target.value)}
              placeholder="admin@example.com"
            />
            <Input
              label="Admin Secret"
              type="password"
              value={adminAuthSecret}
              onChange={(event) => setAdminAuthSecret(event.target.value)}
              placeholder="Enter admin auth secret"
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

      {/* AI Chatbot */}
      <div className={`ai-chatbot ${isChatOpen ? 'open' : ''}`}>
        {/* Chat Button */}
        <button
          className="ai-chat-button"
          onClick={toggleChat}
          aria-label="AI Assistant"
        >
          {isChatOpen ? (
            <MdClose className="chat-icon" />
          ) : (
            <div className="chat-icon-wrapper">
              <span className="ai-icon">🤖</span>
              <span className="pulse-ring"></span>
            </div>
          )}
        </button>

        {/* Chat Window */}
        {isChatOpen && (
          <div className="ai-chat-window">
            <div className="chat-header">
              <div className="chat-header-content">
                <span className="chat-header-icon">🤖</span>
                <div className="chat-header-text">
                  <h3>AI Heat Advisory Assistant</h3>
                  <span className="chat-status">
                    <span className="status-dot"></span>
                    System-Scoped Mode
                  </span>
                </div>
              </div>
            </div>

            <div className="chat-messages">
              {chatMessages.map((message) => (
                <div key={message.id} className={`chat-message ${message.sender}`}>
                  {message.sender === 'ai' && (
                    <div className="message-avatar">🤖</div>
                  )}
                  <div className="message-content">
                    <div className="message-bubble">
                      {message.text}
                    </div>
                    {message.suggestions && (
                      <div className="message-suggestions">
                        {message.suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            className="suggestion-chip"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {message.sender === 'user' && (
                    <div className="message-avatar user">👤</div>
                  )}
                </div>
              ))}
            </div>

            <div className="chat-input-container">
              <input
                type="text"
                className="chat-input"
                placeholder="Ask for heat-based school advisory..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button
                className="chat-send-button"
                onClick={() => handleSendMessage()}
                disabled={!userInput.trim()}
                title="Send message"
                aria-label="Send message"
              >
                <MdSend />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
