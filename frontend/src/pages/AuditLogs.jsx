import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Spinner from '../components/Spinner';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/projectUtils';
import './AuditLogs.css';

export default function AuditLogs() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    userId: '',
    entityType: '',
    action: '',
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
    }
    loadLogs();
  }, [isAdmin, navigate]);

  const loadLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (filters.userId) qs.set('userId', filters.userId);
      if (filters.entityType) qs.set('entity_type', filters.entityType);
      if (filters.action) qs.set('action', filters.action);

      const res = await api.get(`/audit/audit-logs?${qs.toString()}`);
      setLogs(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    loadLogs();
  };

  const clearFilters = () => {
    setFilters({ userId: '', entityType: '', action: '' });
    loadLogs();
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) return <Spinner label="Loading audit logs..." />;

  return (
    <div className="audit-logs-page">
      <div className="audit-header">
        <h1>Audit Logs</h1>
        <p className="text-secondary">
          Track all user actions and system events
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filter-bar">
        <input
          type="number"
          name="userId"
          placeholder="User ID"
          value={filters.userId}
          onChange={handleFilterChange}
          className="search-input compact"
        />
        <select
          name="entityType"
          value={filters.entityType}
          onChange={handleFilterChange}
          className="filter-select compact"
        >
          <option value="">All Entity Types</option>
          <option value="PROJECT">Project</option>
          <option value="KHS">KHS</option>
          <option value="USER">User</option>
        </select>
        <select
          name="action"
          value={filters.action}
          onChange={handleFilterChange}
          className="filter-select compact"
        >
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="REVIEW">Review</option>
          <option value="DELETE">Delete</option>
        </select>
        <button onClick={applyFilters} className="btn btn-sm btn-primary compact">
          Apply
        </button>
        <button onClick={clearFilters} className="btn btn-sm btn-secondary compact">
          Clear
        </button>
      </div>

      {logs.length > 0 ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Entity ID</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDate(log.created_at)}</td>
                  <td>
                    {log.full_name || log.user_username || '-'}
                    {log.user_id && <span className="text-secondary"> (ID: {log.user_id})</span>}
                  </td>
                  <td>
                    <span className="badge badge-info">{log.action}</span>
                  </td>
                  <td>{log.entity_type || '-'}</td>
                  <td>{log.entity_id || '-'}</td>
                  <td className="font-monospace">{log.ip_address || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No audit logs found</h3>
          <p>Audit logs will appear when users perform actions.</p>
        </div>
      )}
    </div>
  );
}
