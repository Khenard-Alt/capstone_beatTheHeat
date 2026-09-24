import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { isValidEmail, isValidPassword } from '../utils/validators';
import { apiClient } from '../services/api';
import { MdEmail, MdLock, MdCheckCircle } from 'react-icons/md';
import schoolLogo from '../assets/mayamotlogo.png';
import realtimeIcon from '../assets/login/realtime.svg';
import healthAdvisoryIcon from '../assets/login/healthAdvisory.svg';
import aiPoweredAnalysisIcon from '../assets/login/aiPoweredAnalysis.svg';
import '../styles/Login.css';
import '../styles/Register.css';

type Step = 'email' | 'otp' | 'reset' | 'done';

const stages: Step[] = ['email', 'otp', 'reset', 'done'];

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpTimeLeft, setOtpTimeLeft] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [stepDirection, setStepDirection] = useState<'forward' | 'backward'>('forward');

  const currentStepIndex = stages.indexOf(step);

  const transitionToStep = (nextStep: Step) => {
    setStepDirection(stages.indexOf(nextStep) >= currentStepIndex ? 'forward' : 'backward');
    setStep(nextStep);
  };

  useEffect(() => {
    if (otpTimeLeft > 0) {
      const timer = setTimeout(() => setOtpTimeLeft(otpTimeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimeLeft]);

  const handleSendOTP = async () => {
    setErrorMessage('');
    if (!email) {
      setErrors({ email: 'Email is required' });
      return;
    }
    if (!isValidEmail(email)) {
      setErrors({ email: 'Invalid email' });
      return;
    }
    setErrors({});

    setIsLoading(true);
    try {
      const { data } = await apiClient.post('/api/users/send-otp', { email, purpose: 'reset' });
      setSuccessMessage('Reset code sent to your email!');
      setOtpTimeLeft(data.expiresIn || 600);
      setOtpCode('');
      transitionToStep('otp');
    } catch (err) {
      const responseData = (err as any)?.response?.data;
      setErrorMessage(responseData?.message || 'Failed to send reset code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      setErrors({ otpCode: 'Enter the 6-digit code' });
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    try {
      await apiClient.post('/api/users/verify-otp', { email, code: otpCode });
      setSuccessMessage('Code verified. Choose your new password.');
      transitionToStep('reset');
    } catch (err) {
      const responseData = (err as any)?.response?.data;
      setErrorMessage(responseData?.message || 'Code verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const newErrors: Record<string, string> = {};
    if (!newPassword) newErrors.newPassword = 'New password is required';
    else if (!isValidPassword(newPassword)) newErrors.newPassword = 'Use 8+ chars, uppercase, lowercase, and a number';
    if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Passwords must match';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setErrorMessage('');
    setIsLoading(true);
    try {
      await apiClient.post('/api/users/reset-password', { email, code: otpCode, newPassword });
      transitionToStep('done');
    } catch (err) {
      const responseData = (err as any)?.response?.data;
      setErrorMessage(responseData?.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-split-container forgot-password-layout">
        {/* Left Side - Branding (same as the login page, so this never looks
            like a bare, disconnected modal floating on a gray backdrop) */}
        <div className="login-brand-section">
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
              <img className="login-school-logo" src={schoolLogo} alt="Mayamot Elementary School logo" />
              <div>
                <h1 className="login-brand-title">Beat The Heat</h1>
                <p className="login-brand-school">Mayamot Elementary School</p>
              </div>
            </div>
            <p className="login-brand-description">
              AI-Integrated Smart Heat Index and Real-Time Health Advisory System
            </p>
            <div className="login-brand-features">
              <div className="feature-item">
                <img className="feature-icon" src={realtimeIcon} alt="" aria-hidden="true" />
                <div className="feature-text">
                  <h3>Real-Time Monitoring</h3>
                  <p>Track heat index levels across school premises</p>
                </div>
              </div>
              <div className="feature-item">
                <img className="feature-icon" src={healthAdvisoryIcon} alt="" aria-hidden="true" />
                <div className="feature-text">
                  <h3>Health Advisories</h3>
                  <p>Instant alerts for heat-related health concerns</p>
                </div>
              </div>
              <div className="feature-item">
                <img className="feature-icon" src={aiPoweredAnalysisIcon} alt="" aria-hidden="true" />
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

        {/* Right Side - Reset Password Form */}
        <div className="login-form-section">
          <div className="login-form-container">
            <div className="register-progress" aria-label="Reset password progress">
              {stages.map((stage, index) => (
                <div key={stage} className={`register-progress-step ${index <= currentStepIndex ? 'active' : ''}`}>
                  <span className="register-progress-dot">{index + 1}</span>
                  {index < stages.length - 1 && <span className="register-progress-line" />}
                </div>
              ))}
            </div>

            <div key={`${step}-${stepDirection}`} className={`forgot-password-step ${stepDirection}`}>
            {step === 'email' && (
              <div className="modal-step">
                <h3>Forgot Password</h3>
                <p>Enter your registered email address and we'll send you a reset code.</p>

                {errorMessage && <ErrorMessage message={errorMessage} type="warning" className="register-toast register-toast-warning" onClose={() => setErrorMessage('')} />}

                <Input
                  label="Email"
                  name="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  icon={<MdEmail />}
                  error={errors.email}
                  errorDisplay="floating"
                />

                <div className="modal-actions">
                  <Button onClick={() => navigate('/login')} variant="secondary">Back to login</Button>
                  <Button onClick={handleSendOTP} variant="primary" loading={isLoading}>Send reset code</Button>
                </div>
              </div>
            )}

            {step === 'otp' && (
              <div className="modal-step">
                <h3>Enter Reset Code</h3>
                <p>Enter the 6-digit code sent to {email}</p>

                {errorMessage && <ErrorMessage message={errorMessage} type="warning" className="register-toast register-toast-warning" onClose={() => setErrorMessage('')} />}
                {successMessage && <ErrorMessage message={successMessage} type="success" className="register-toast register-toast-success" onClose={() => setSuccessMessage('')} />}

                <div className="otp-input-container">
                  <Input
                    label="Reset Code"
                    name="otpCode"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    error={errors.otpCode}
                    errorDisplay="floating"
                  />
                  <div className="otp-timer">
                    {otpTimeLeft > 0 ? (
                      <span className="timer-text">Expires in {Math.floor(otpTimeLeft / 60)}:{(otpTimeLeft % 60).toString().padStart(2, '0')}</span>
                    ) : (
                      <span className="timer-expired">Code expired. Go back and resend.</span>
                    )}
                  </div>
                </div>

                <div className="modal-actions">
                  <Button onClick={() => transitionToStep('email')} variant="secondary">Back</Button>
                  <Button onClick={handleVerifyOTP} variant="primary" loading={isLoading} disabled={otpCode.length !== 6}>
                    Verify
                  </Button>
                </div>
              </div>
            )}

            {step === 'reset' && (
              <div className="modal-step">
                <h3>Choose a New Password</h3>
                <p>Set a new password for {email}</p>

                {errorMessage && <ErrorMessage message={errorMessage} type="warning" className="register-toast register-toast-warning" onClose={() => setErrorMessage('')} />}

                <Input
                  label="New password"
                  type="password"
                  name="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  icon={<MdLock />}
                  error={errors.newPassword}
                  errorDisplay="side-left"
                />
                <Input
                  label="Confirm password"
                  type="password"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  icon={<MdLock />}
                  error={errors.confirmPassword}
                  errorDisplay="side-right"
                />

                <div className="modal-actions">
                  <Button onClick={() => transitionToStep('otp')} variant="secondary">Back</Button>
                  <Button onClick={handleResetPassword} variant="primary" loading={isLoading}>Reset password</Button>
                </div>
              </div>
            )}

            {step === 'done' && (
              <div className="modal-step welcome-step">
                <div className="welcome-hero">
                  <div className="welcome-icon">
                    <MdCheckCircle />
                  </div>
                  <div>
                    <h3>Password Reset!</h3>
                    <p className="student-name">You can now sign in with your new password.</p>
                  </div>
                </div>

                <div className="modal-actions">
                  <Button onClick={() => navigate('/login')} variant="primary" fullWidth>
                    Go to Login
                  </Button>
                </div>
              </div>
            )}
            </div>

            {step !== 'done' && (
              <p style={{ textAlign: 'center', marginTop: 12 }}>
              
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
