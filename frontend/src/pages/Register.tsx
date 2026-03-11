import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { useAuth } from '../hooks/useAuth';
import { isValidEmail, isValidPassword, getPasswordStrength } from '../utils/validators';
import { MdEmail, MdLock, MdPerson } from 'react-icons/md';
import '../styles/Register.css';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'teacher' as 'teacher' | 'staff',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] =  useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!isValidPassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      await register(formData);
      navigate('/');
    } catch (error) {
      setErrorMessage('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = formData.password ? getPasswordStrength(formData.password) : null;

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-header">
          <h1 className="register-title">☀️ Beat The Heat</h1>
          <p className="register-subtitle">Heat Index Monitoring System</p>
          <h2>Create Your Account</h2>
        </div>

        {errorMessage && (
          <ErrorMessage
            message={errorMessage}
            type="error"
            onClose={() => setErrorMessage('')}
          />
        )}

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <Input
              label="First Name"
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              error={errors.firstName}
              icon={<MdPerson />}
              placeholder="John"
              fullWidth
            />
            <Input
              label="Last Name"
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              error={errors.lastName}
              icon={<MdPerson />}
              placeholder="Doe"
              fullWidth
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            icon={<MdEmail />}
            placeholder="your.email@example.com"
            fullWidth
          />

          <div className="form-field">
            <label>Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="select-field"
            >
              <option value="teacher">Teacher</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            icon={<MdLock />}
            placeholder="Create a strong password"
            fullWidth
          />
          {passwordStrength && (
            <div className={`password-strength password-strength-${passwordStrength}`}>
              Strength: {passwordStrength}
            </div>
          )}

          <Input
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            icon={<MdLock />}
            placeholder="Re-enter your password"
            fullWidth
          />

          <div className="terms-checkbox">
            <label>
              <input type="checkbox" required />
              I agree to the Terms and Conditions
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Register'}
          </Button>
        </form>

        <div className="register-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="login-link">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
