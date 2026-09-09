import React from 'react';
import '../styles/Avatar.css';

interface AvatarProps {
  src?: string | null;
  firstName?: string;
  lastName?: string;
  size?: number;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, firstName, lastName, size = 44, className = '' }) => {
  const initials = `${firstName?.charAt(0) ?? ''}${lastName?.charAt(0) ?? ''}`.toUpperCase() || '?';
  const label = `${firstName ?? ''} ${lastName ?? ''}`.trim() || 'Profile picture';

  if (src) {
    return (
      <img
        src={src}
        alt={label}
        className={`avatar-image ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`avatar-initials ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(12, size * 0.4) }}
      role="img"
      aria-label={label}
    >
      {initials}
    </div>
  );
};
