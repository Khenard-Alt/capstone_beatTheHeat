import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdCameraAlt, MdClose } from 'react-icons/md';
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
  const [previewOpen, setPreviewOpen] = useState(false);

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
        <button
          type="button"
          className="avatar-view-trigger"
          onClick={() => user?.avatarUrl && setPreviewOpen(true)}
          aria-label={user?.avatarUrl ? 'View profile picture' : 'Profile picture'}
          disabled={!user?.avatarUrl}
        >
          <Avatar src={user?.avatarUrl} firstName={user?.firstName} lastName={user?.lastName} size={size} />
        </button>
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

      {previewOpen && user?.avatarUrl &&
        createPortal(
          // Rendered into document.body via a portal — kept OUT of the
          // Information card's DOM subtree. A card's hover effect applies
          // `transform`, which turns the card into the containing block for
          // any `position: fixed` descendant, so the modal would shrink to
          // the card's bounds (and flicker) as the cursor crossed its edge.
          <div className="avatar-view-modal">
            <div className="avatar-view-modal-content">
              <img src={user.avatarUrl} alt={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} />
              <div className="avatar-view-modal-actions">
                <button
                  type="button"
                  className="avatar-view-modal-change-btn"
                  onClick={() => {
                    setPreviewOpen(false);
                    inputRef.current?.click();
                  }}
                  disabled={uploading}
                >
                  <MdCameraAlt /> Change photo
                </button>
                <button
                  type="button"
                  className="avatar-view-modal-cancel-btn"
                  onClick={() => setPreviewOpen(false)}
                >
                  <MdClose /> Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
