import React from 'react';
import { ProfileInformationCard } from '../components/ProfileInformationCard';
import { useAuth } from '../hooks/useAuth';
import '../styles/Profile.css';

export const Profile: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your account information</p>
      </div>

      <div className="profile-grid">
        <ProfileInformationCard />
      </div>
    </div>
  );
};
