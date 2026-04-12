import React from 'react';
import '../styles/Card.css';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  icon,
  actions,
  className = '',
  hoverable = false,
  noPadding = false,
}) => {
  const cardClasses = [
    'card',
    hoverable ? 'card-hoverable' : '',
    noPadding ? 'card-no-padding' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClasses}>
      {(title || subtitle || actions || icon) && (
        <div className="card-header">
          <div className="card-header-content">
            {title && (
              <h3 className="card-title">
                {icon && <span className="card-title-icon">{icon}</span>}
                {title}
              </h3>
            )}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
};
