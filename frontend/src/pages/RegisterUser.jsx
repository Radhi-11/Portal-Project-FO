import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './RegisterUser.css';

export default function RegisterUser() {
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    address: '',
    role: 'USER',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      await api.post('/auth/register', formData);
      setSuccess('User registered successfully!');
      setTimeout(() => navigate('/users'), 1500);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to register user.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRules = [
    'At least 8 characters',
    'Contains uppercase letter',
    'Contains lowercase letter',
    'Contains a number',
  ];

  return (
    <div className="register-page">
      <div className="register-card">
        <h2>Register New User</h2>
        <p className="text-secondary">
          Fill in the details to create a new user account.
        </p>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Enter username (min 3 chars)"
              required
              minLength={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              placeholder="Enter full name"
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
              placeholder="Enter email address"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-input"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter password"
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address (Optional)</label>
            <textarea
              className="form-input"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              rows={3}
              placeholder="Enter address"
            />
          </div>

          <div className="password-rules">
            <p className="rules-title">Password must contain:</p>
            <ul className="rules-list">
              {passwordRules.map((rule, idx) => (
                <li key={idx}>{rule}</li>
              ))}
            </ul>
          </div>

          {error && <div className="form-error">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/users')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Registering...' : 'Register User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
