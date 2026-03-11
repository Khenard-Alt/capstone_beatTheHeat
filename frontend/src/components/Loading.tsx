import React from 'react';
import '../styles/Loading.css';

interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  text?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  fullScreen = false,
  text,
}) => {
  const spinnerClasses = ['spinner', `spinner-${size}`].filter(Boolean).join(' ');

  const content = (
    <div className="loading-content">
      <div className={spinnerClasses}>
        <div className="spinner-circle"></div>
        <div className="spinner-circle"></div>
        <div className="spinner-circle"></div>
      </div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return <div className="loading-fullscreen">{content}</div>;
  }

  return <div className="loading-container">{content}</div>;
};
