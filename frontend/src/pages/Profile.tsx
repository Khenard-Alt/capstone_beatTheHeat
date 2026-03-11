import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { MdPerson, MdEmail, MdPhone, MdSave } from 'react-icons/md';
import { formatDate } from '../utils/formatters';
import { DATE_FORMATS } from '../utils/constants';
import '../styles/Profile.css';

export const Profile: React.FC = () => {
  const { user } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle profile update
    console.log('Updating profile:', formData);
    setIsEditing(false);
  };

  if (!user) return null;

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your account information</p>
      </div>

      <div className="profile-grid">
        <Card title="Profile Information">
          <div className="profile-header">
            <div className="profile-avatar">
              <MdPerson size={80} />
            </div>
            <div className="profile-info">
              <h2>
                {user.firstName} {user.lastName}
              </h2>
              <p className="profile-role">{user.role.toUpperCase()}</p>
              <p className="profile-email">
                <MdEmail /> {user.email}
              </p>
            </div>
          </div>

          <div className="profile-details">
            <form onSubmit={handleSubmit}>
              <Input
                label="First Name"
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                disabled={!isEditing}
                icon={<MdPerson />}
                fullWidth
              />

              <Input
                label="Last Name"
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                disabled={!isEditing}
                icon={<MdPerson />}
                fullWidth
              />

              <Input
                label="Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={!isEditing}
                icon={<MdEmail />}
                fullWidth
              />

              <Input
                label="Phone Number"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
                icon={<MdPhone />}
                placeholder="+63 XXX XXX XXXX"
                fullWidth
              />

              <div className="profile-actions">
                {!isEditing ? (
                  <Button
                    variant="primary"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button type="submit" variant="primary" icon={<MdSave />}>
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </form>
          </div>
        </Card>

        <div className="profile-sidebar">
          <Card title="Account Details">
            <div className="account-detail">
              <label>User ID</label>
              <p>{user.id}</p>
            </div>
            <div className="account-detail">
              <label>Role</label>
              <p className="role-badge">{user.role}</p>
            </div>
            <div className="account-detail">
              <label>School ID</label>
              <p>{user.schoolId}</p>
            </div>
            <div className="account-detail">
              <label>Member Since</label>
              <p>{formatDate(user.createdAt, DATE_FORMATS.DATE_ONLY)}</p>
            </div>
            <div className="account-detail">
              <label>Last Updated</label>
              <p>{formatDate(user.updatedAt, DATE_FORMATS.SHORT)}</p>
            </div>
          </Card>

          <Card title="Security">
            <Button variant="outline" fullWidth>
              Change Password
            </Button>
            <Button variant="outline" fullWidth>
              Enable Two-Factor Auth
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
