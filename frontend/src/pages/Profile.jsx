import { useState, useEffect } from 'react';
import api from '../api/axios';
import Spinner from '../components/Spinner';
import './Profile.css';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      setFormData({
        full_name: response.data.user.full_name,
        email: response.data.user.email,
        address: response.data.user.address || '',
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.put(`/users/${user.id}`, formData);
      setSuccess('Profile updated successfully.');
      setIsEditing(false);
      fetchProfile();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile.');
    }
  };

  if (loading) {
    return <Spinner label="Loading profile..." />;
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <h2>Profile</h2>
          {!isEditing && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </button>
          )}
        </div>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {isEditing ? (
          <form className="profile-form" onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea
                className="form-input"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                placeholder="Enter your address"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setIsEditing(false); setError(''); }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-info">
            <div className="profile-row">
              <span className="profile-label">Username</span>
              <span className="profile-value">{user?.username}</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Full Name</span>
              <span className="profile-value">{user?.full_name}</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Email</span>
              <span className="profile-value">{user?.email}</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Role</span>
              <span className="profile-value">
                <span className={`badge ${user?.role === 'ADMIN' ? 'badge-warning' : 'badge-info'}`}>
                  {user?.role}
                </span>
              </span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Address</span>
              <span className="profile-value">{user?.address || 'N/A'}</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Account Status</span>
              <span className="profile-value">
                <span className={`badge ${user?.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                  {user?.is_active ? 'Active' : 'Inactive'}
                </span>
              </span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Must Change Password</span>
              <span className="profile-value">
                {user?.must_change_password ? 'Yes' : 'No'}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: 'var(--spacing-md)' }}
              onClick={() => (window.location.href = '/change-password')}
            >
              Change Password
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
