import React from 'react';
import { MdWarning } from 'react-icons/md';
import '../styles/Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  errorDisplay?: 'inline' | 'floating' | 'side-left' | 'side-right';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  icon,
  fullWidth = false,
  errorDisplay = 'inline',
  className = '',
  ...props
}) => {
  const inputClasses = [
    'input-field',
    error ? 'input-error' : '',
    icon ? 'input-with-icon' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const containerClasses = [
    'input-container',
    fullWidth ? 'input-full-width' : '',
    errorDisplay !== 'inline' ? 'input-floating-error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const errorClasses = [
    'input-error-text',
    errorDisplay === 'floating' ? 'input-error-toast' : '',
    errorDisplay === 'side-left' ? 'input-error-toast input-error-toast-side input-error-toast-left' : '',
    errorDisplay === 'side-right' ? 'input-error-toast input-error-toast-side input-error-toast-right' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      {label && <label className="input-label">{label}</label>}
      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}
        <input className={inputClasses} {...props} />
      </div>
      {error && (
        <span className={errorClasses}>
          {errorDisplay !== 'inline' && <MdWarning className="input-error-toast-icon" aria-hidden="true" />}
          <span className="input-error-toast-text">{error}</span>
        </span>
      )}
      {!error && helperText && <span className="input-helper-text">{helperText}</span>}
    </div>
  );
};
