import React, { useRef, useState } from 'react';
import { MdCameraAlt } from 'react-icons/md';
import { useAuth } from '../hooks/useAuth';
import { uploadUserAvatar } from '../services/users.service';
import { Avatar } from './Avatar';
import '../styles/Avatar.css';

const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

interface AvatarUploadProps {
  size?: number;
}

/**
 * Clickable profile picture with an upload button — works for every role
 * since it reads/writes the currently signed-in user via AuthContext.
 */
export const AvatarUpload: React.FC<AvatarUploadProps> = ({ size = 96 }) => {
  const { user, updateUser } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !user) {
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setError('Image must be 3MB or smaller.');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const updated = await uploadUserAvatar(user.id, file);
      updateUser({ ...user, avatarUrl: updated.avatarUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="avatar-upload">
      <div className="avatar-upload-frame" style={{ width: size, height: size }}>
        <Avatar src={user?.avatarUrl} firstName={user?.firstName} lastName={user?.lastName} size={size} />
        <button
          type="button"
          className="avatar-upload-btn"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Change profile picture"
        >
          <MdCameraAlt />
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(event) => void handleFileChange(event)}
      />
      {uploading && <div className="avatar-upload-status">Uploading…</div>}
      {error && <div className="avatar-upload-error">{error}</div>}
    </div>
  );
};
