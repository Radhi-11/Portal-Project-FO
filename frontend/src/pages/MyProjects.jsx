import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProjects } from '../contexts/ProjectContext';
import Spinner from '../components/Spinner';
import { formatDate, getStatusColor, getStatusText, getValidationStatusColor, getValidationStatusText, formatCurrency } from '../utils/projectUtils';
import './MyProjects.css';

export default function MyProjects() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ project_type: '', review_status: '' });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const {
    projects,
    projectsLoading: loading,
    projectsError: error,
    projectsPagination: pagination,
    loadProjects,
    refreshProjects,
  } = useProjects();

  useEffect(() => {
    loadProjects({ page: pagination.page, search: debouncedSearch, ...filters });
  }, [pagination.page, debouncedSearch, filters]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    loadProjects({ page: 1, search: debouncedSearch, ...newFilters });
  };

  const handlePageChange = (newPage) => {
    loadProjects({ page: newPage, search: debouncedSearch, ...filters });
  };

  const clearFilters = () => {
    setSearch('');
    setFilters({ project_type: '', review_status: '' });
    loadProjects({ page: 1 });
  };

  const hasActiveFilters = debouncedSearch || filters.project_type || filters.review_status;

  if (loading && projects.length === 0) return <Spinner label="Loading your projects..." />;

  return (
    <div className="my-projects-page">
      <div className="my-projects-header">
        <div>
          <h1>Projects</h1>
          <p className="text-secondary">
            {pagination.total === 0
              ? 'No projects found.'
              : `Showing ${projects.length} of ${pagination.total} project${pagination.total > 1 ? 's' : ''}`}
          </p>
        </div>
        <Link to="/upload-project" className="btn btn-primary">
          + Upload Project Baru
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filter-bar">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search project name, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
        <select
          name="review_status"
          value={filters.review_status}
          onChange={handleFilterChange}
          className="filter-select"
        >
          <option value="">All Statuses</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REVISION">Revision</option>
          <option value="REJECTED">Rejected</option>
        </select>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="btn btn-sm btn-secondary">
            Clear
          </button>
        )}
      </div>

      {projects.length > 0 ? (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Value</th>
                  <th>Validation</th>
                  <th>Review</th>
                  <th>Submitted</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>{project.project_name}</td>
                    <td>{formatCurrency(project.total_project_value || 0)}</td>
                    <td>
                      <span className={`badge ${getValidationStatusColor(project.validation_status)}`}>
                        {getValidationStatusText(project.validation_status)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusColor(project.review_status)}`}>
                        {getStatusText(project.review_status)}
                      </span>
                    </td>
                    <td>{formatDate(project.created_at)}</td>
                    <td className="text-right">
                      <Link
                        to={`/projects/${project.id}`}
                        className="btn btn-sm btn-secondary"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination-bar">
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Previous
              </button>
              <span className="page-info">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <h3>No projects found</h3>
          <p>Click "Upload Project Baru" to get started.</p>
        </div>
      )}
    </div>
  );
}
