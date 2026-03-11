import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isValidEmail } from '../utils/validators';
import { MdEmail, MdLock, MdClose, MdSend } from 'react-icons/md';
import '../styles/Login.css';

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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      text: "Hi! I'm your Weather & Heat Index Assistant 🌤️ How can I help you today?",
      sender: 'ai',
      suggestions: [
        'What is heat index?',
        'Current weather status',
        'Health advisory tips',
        'How to use the system'
      ]
    }
  ]);
  const [userInput, setUserInput] = useState('');

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
      await login(formData.email, formData.password);
      navigate('/');
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
        text: "Heat Index measures how hot it feels when humidity is factored with air temperature. Our system monitors this in real-time to protect students from heat-related illnesses! 🌡️",
        suggestions: ['View live monitoring', 'Health safety tips', 'System features']
      };
    } else if (lowerMsg.includes('weather') || lowerMsg.includes('current')) {
      return {
        text: "Our system provides real-time weather monitoring including temperature, humidity, and heat index levels. Once you log in, you'll see live updates on the dashboard! ☀️",
        suggestions: ['How to login?', 'What features available?', 'Emergency protocols']
      };
    } else if (lowerMsg.includes('health') || lowerMsg.includes('advisory') || lowerMsg.includes('tips')) {
      return {
        text: "We provide instant health advisories based on heat levels:\n\n🟢 Safe (HI < 27°C)\n🟡 Caution (27-32°C)\n🟠 Extreme Caution (32-41°C)\n🔴 Danger (41-54°C)\n⚫ Extreme Danger (> 54°C)",
        suggestions: ['What to do in high heat?', 'Student safety measures', 'Alert system']
      };
    } else if (lowerMsg.includes('use') || lowerMsg.includes('how') || lowerMsg.includes('system')) {
      return {
        text: "Simply log in with your credentials! The demo account is:\n📧 admin@mayamot.edu.ph\n🔐 Admin123\n\nAfter login, you'll access the dashboard with real-time monitoring, health advisories, and AI-powered predictions! 🚀",
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
        text: "I'm here to help! Ask me about:\n• Heat index monitoring\n• Current weather status\n• Health and safety tips\n• How to use the system\n• Available features",
        suggestions: ['Weather info', 'Safety guidelines', 'Login help', 'System features']
      };
    }
  };

  const handleSendMessage = (messageText?: string) => {
    const textToSend = messageText || userInput;
    if (!textToSend.trim()) return;

    const userMessage: ChatMessage = {
      id: chatMessages.length + 1,
      text: textToSend,
      sender: 'user'
    };

    const response = getAIResponse(textToSend);
    const aiMessage: ChatMessage = {
      id: chatMessages.length + 2,
      text: response.text,
      sender: 'ai',
      suggestions: response.suggestions
    };

    setChatMessages([...chatMessages, userMessage, aiMessage]);
    setUserInput('');
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  return (
    <div className="login-page">
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

            <div className="login-demo-credentials">
              <div className="demo-header">
                <span className="demo-icon"></span>
                <strong>Demo Credentials:</strong>
              </div>
              <div className="demo-info">
                <p><strong>Email:</strong> admin@mayamot.edu.ph</p>
                <p><strong>Password:</strong> Admin123</p>
              </div>
            </div>
          </div>
        </div>
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
                  <h3>AI Weather Assistant</h3>
                  <span className="chat-status">
                    <span className="status-dot"></span>
                    Online
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
                placeholder="Ask me anything about weather & heat index..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button
                className="chat-send-button"
                onClick={() => handleSendMessage()}
                disabled={!userInput.trim()}
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
