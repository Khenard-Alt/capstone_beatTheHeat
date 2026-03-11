import React from 'react';
import { MdError, MdWarning, MdInfo } from 'react-icons/md';
import '../styles/ErrorMessage.css';

interface ErrorMessageProps {
  message: string;
  type?: 'error' | 'warning' | 'info';
  onClose?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  type = 'error',
  onClose,
  className = '',
}) => {
  const icons = {
    error: <MdError />,
    warning: <MdWarning />,
    info: <MdInfo />,
  };

  const classes = ['error-message', `error-message-${type}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <div className="error-message-icon">{icons[type]}</div>
      <div className="error-message-content">
        <p className="error-message-text">{message}</p>
      </div>
      {onClose && (
        <button className="error-message-close" onClick={onClose}>
          &times;
        </button>
      )}
    </div>
  );
};
