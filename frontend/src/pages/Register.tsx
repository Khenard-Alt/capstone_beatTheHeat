import React, { useEffect, useState } from 'react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { useAuth } from '../hooks/useAuth';
import { isValidEmail, isValidPassword } from '../utils/validators';
import { apiClient } from '../services/api';
import { MdEmail, MdLock, MdPerson, MdClose, MdCheckCircle, MdSearch } from 'react-icons/md';
import '../styles/Register.css';

interface RegisterModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'basic' | 'otp' | 'child-search' | 'relationship' | 'terms' | 'welcome';

interface StudentOption {
  id: string;
  name: string;
  grade?: string;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({ open, onClose }) => {
  const { register } = useAuth();

  const [step, setStep] = useState<Step>('basic');
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentOption[]>([]);

  const [formData, setFormData] = useState<any>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'parent',
    childId: '',
    childName: '',
    relationshipType: 'parent',
    termsAccepted: false,
  });

  const [otpCode, setOtpCode] = useState('');
  const [otpTimeLeft, setOtpTimeLeft] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch all students on mount
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { data } = await apiClient.get('/api/students');
        setStudents(data.students || []);
      } catch (err) {
        console.warn('Using fallback students:', err);
        setStudents([
          { id: 's1', name: 'Juan Dela Cruz', grade: 'Grade 3' },
          { id: 's2', name: 'Maria Santos', grade: 'Grade 5' },
          { id: 's3', name: 'Carlos Reyes', grade: 'Grade 4' },
        ]);
      }
    };
    if (open) fetchStudents();
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('basic');
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        role: 'parent',
        childId: '',
        childName: '',
        relationshipType: 'parent',
        termsAccepted: false,
      });
      setOtpCode('');
      setOtpTimeLeft(0);
      setErrors({});
      setErrorMessage('');
      setSuccessMessage('');
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [open]);

  // OTP countdown timer
  useEffect(() => {
    if (otpTimeLeft > 0) {
      const timer = setTimeout(() => setOtpTimeLeft(otpTimeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimeLeft]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev: any) => ({ ...prev, [name]: val }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateBasic = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!isValidEmail(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.phone) newErrors.phone = 'Phone number is required';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (!isValidPassword(formData.password)) newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOTP = async () => {
    if (!validateBasic()) return;

    setIsLoading(true);
    setErrorMessage('');
    try {
      const { data } = await apiClient.post('/api/users/send-otp', { email: formData.email });
      setSuccessMessage('OTP sent to your email!');
      setOtpTimeLeft(data.expiresIn || 600);
      setStep('otp');
      setOtpCode('');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode) {
      setErrors({ otpCode: 'Enter the OTP code' });
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      await apiClient.post('/api/users/verify-otp', { email: formData.email, code: otpCode });

      setSuccessMessage('Email verified successfully!');
      setStep('child-search');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchStudent = (query: string) => {
    setSearchQuery(query);
    if (query.length < 1) {
      setSearchResults([]);
      return;
    }

    const results = students.filter((s) =>
      s.name.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(results);
  };

  const handleSelectChild = (student: StudentOption) => {
    setFormData((prev: any) => ({
      ...prev,
      childId: student.id,
      childName: student.name,
    }));
    setSearchQuery('');
    setSearchResults([]);
    setStep('relationship');
  };

  const handleNext = () => {
    if (step === 'child-search') {
      if (!formData.childId) {
        setErrorMessage('Please select your child');
        return;
      }
      setStep('relationship');
    } else if (step === 'relationship') {
      setStep('terms');
    } else if (step === 'terms') {
      if (!formData.termsAccepted) {
        setErrorMessage('You must accept the terms and conditions');
        return;
      }
      setStep('welcome');
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      await register({
        ...formData,
        role: 'parent',
      });
      setSuccessMessage('Registration complete!');
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <MdClose />
        </button>

        {/* Step 1: Basic Registration */}
        {step === 'basic' && (
          <div className="modal-step">
            <h3>Create Your Account</h3>
            <p>Enter your basic information</p>

            {errorMessage && <ErrorMessage message={errorMessage} type="error" onClose={() => setErrorMessage('')} />}

            <div className="form-row">
              <Input label="First name" name="firstName" value={formData.firstName} onChange={handleChange} icon={<MdPerson />} error={errors.firstName} />
              <Input label="Last name" name="lastName" value={formData.lastName} onChange={handleChange} icon={<MdPerson />} error={errors.lastName} />
            </div>

            <Input label="Email" name="email" value={formData.email} onChange={handleChange} icon={<MdEmail />} error={errors.email} />
            <Input label="Phone number" name="phone" value={formData.phone} onChange={handleChange} error={errors.phone} />

            <div className="form-row">
              <Input label="Password" type="password" name="password" value={formData.password} onChange={handleChange} icon={<MdLock />} error={errors.password} />
              <Input label="Confirm password" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} icon={<MdLock />} error={errors.confirmPassword} />
            </div>

            <div className="modal-actions">
              <Button onClick={onClose} variant="secondary">Cancel</Button>
              <Button onClick={handleSendOTP} variant="primary" loading={isLoading}>Send OTP</Button>
            </div>
          </div>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'otp' && (
          <div className="modal-step">
            <h3>Verify Your Email</h3>
            <p>Enter the 6-digit code sent to {formData.email}</p>

            {errorMessage && <ErrorMessage message={errorMessage} type="error" onClose={() => setErrorMessage('')} />}
            {successMessage && <ErrorMessage message={successMessage} type="success" onClose={() => setSuccessMessage('')} />}

            <div className="otp-input-container">
              <Input
                label="OTP Code"
                name="otpCode"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                error={errors.otpCode}
              />
              <div className="otp-timer">
                {otpTimeLeft > 0 ? (
                  <span className="timer-text">Expires in {Math.floor(otpTimeLeft / 60)}:{(otpTimeLeft % 60).toString().padStart(2, '0')}</span>
                ) : (
                  <span className="timer-expired">Code expired. Send new OTP.</span>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <Button onClick={() => setStep('basic')} variant="secondary">Back</Button>
              <Button onClick={handleVerifyOTP} variant="primary" loading={isLoading} disabled={otpCode.length !== 6}>
                Verify
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Child Search & Selection */}
        {step === 'child-search' && (
          <div className="modal-step">
            <h3>Find Your Child</h3>
            <p>Search and select your child from the school database</p>

            {errorMessage && <ErrorMessage message={errorMessage} type="error" onClose={() => setErrorMessage('')} />}

            <div className="search-container">
              <Input
                label="Search student name"
                name="studentSearch"
                value={searchQuery}
                onChange={(e) => handleSearchStudent(e.target.value)}
                icon={<MdSearch />}
                placeholder="Type child's name..."
              />

              {searchQuery && searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((student) => (
                    <button
                      key={student.id}
                      className={`search-result-item ${formData.childId === student.id ? 'selected' : ''}`}
                      onClick={() => handleSelectChild(student)}
                    >
                      <div>
                        <strong>{student.name}</strong>
                        {student.grade && <span className="grade-label">{student.grade}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && (
                <div className="no-results">No students found matching "{searchQuery}"</div>
              )}

              {formData.childId && (
                <div className="selected-child">
                  <MdCheckCircle /> <strong>Selected: {formData.childName}</strong>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <Button onClick={() => setStep('otp')} variant="secondary">Back</Button>
              <Button onClick={handleNext} variant="primary" disabled={!formData.childId}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Relationship Type */}
        {step === 'relationship' && (
          <div className="modal-step">
            <h3>What's your relationship?</h3>
            <p>Select your relationship to {formData.childName}</p>

            <div className="relationship-options">
              {['parent', 'legal-guardian', 'guardian', 'other'].map((type) => (
                <label key={type} className={`relationship-option ${formData.relationshipType === type ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="relationshipType"
                    value={type}
                    checked={formData.relationshipType === type}
                    onChange={handleChange}
                  />
                  <div className="relationship-label">
                    <strong>{type === 'legal-guardian' ? 'Legal Guardian' : type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                  </div>
                </label>
              ))}
            </div>

            <div className="modal-actions">
              <Button onClick={() => setStep('child-search')} variant="secondary">Back</Button>
              <Button onClick={handleNext} variant="primary">Continue</Button>
            </div>
          </div>
        )}

        {/* Step 5: Terms & Conditions */}
        {step === 'terms' && (
          <div className="modal-step">
            <h3>Terms & Conditions</h3>

            {errorMessage && <ErrorMessage message={errorMessage} type="error" onClose={() => setErrorMessage('')} />}

            <div className="terms-container">
              <h4>Beat The Heat - Terms of Service</h4>
              <div className="terms-content">
                <p>
                  <strong>1. Service Overview</strong>
                  <br />
                  Beat The Heat is a real-time heat advisory and health monitoring system designed to help schools and parents protect students during extreme heat conditions.
                </p>
                <div>
                  <p>
                    <strong>2. Parent Responsibilities</strong>
                    <br />
                    Parents agree to:
                  </p>
                  <ul>
                    <li>Keep contact information up to date</li>
                    <li>Respond to emergency alerts promptly</li>
                    <li>Follow health advisories provided by the system</li>
                    <li>Notify the school of any medical conditions</li>
                  </ul>
                </div>
                <p>
                  <strong>3. Data Privacy</strong>
                  <br />
                  Your data is protected and used only for student safety and health monitoring purposes.
                </p>
                <p>
                  <strong>4. Liability</strong>
                  <br />
                  While we provide real-time data, parents remain responsible for their child's safety and should follow local health authorities' guidance.
                </p>
              </div>
            </div>

            <label className="terms-checkbox">
              <input
                type="checkbox"
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={handleChange}
              />
              <span>I accept the Terms and Conditions</span>
            </label>

            <div className="modal-actions">
              <Button onClick={() => setStep('relationship')} variant="secondary">Back</Button>
              <Button onClick={handleNext} variant="primary" disabled={!formData.termsAccepted}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 6: Welcome Screen */}
        {step === 'welcome' && (
          <div className="modal-step welcome-step">
            <div className="welcome-icon">
              <MdCheckCircle />
            </div>
            <h3>Welcome to Beat The Heat!</h3>
            <p className="student-name">Hello! {formData.childName}'s account is now ready.</p>

            <div className="welcome-features">
              <div className="feature">
                <strong>✓ Real-Time Heat Alerts</strong>
                <span>Get instant notifications when heat index reaches dangerous levels</span>
              </div>
              <div className="feature">
                <strong>✓ Health Advisories</strong>
                <span>Receive personalized health recommendations for your child</span>
              </div>
              <div className="feature">
                <strong>✓ Predictive Analytics</strong>
                <span>Get insights into future weather patterns and heat risks</span>
              </div>
              <div className="feature">
                <strong>✓ Notifications Alerts</strong>
                <span>Stay informed about school closures and safety protocols</span>
              </div>
            </div>

            <p className="welcome-message">You can now access the dashboard and monitor your child's school environment. Stay safe!</p>

            <div className="modal-actions">
              <Button onClick={handleRegister} variant="primary" loading={isLoading} style={{ width: '100%' }}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterModal;
