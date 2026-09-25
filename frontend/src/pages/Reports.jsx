import { useState, useEffect } from 'react';
import { useProjects } from '../contexts/ProjectContext';
import Spinner from '../components/Spinner';
import { formatDate, getStatusColor, getStatusText, formatCurrency } from '../utils/projectUtils';
import './Reports.css';

function FormatCompact({ value }) {
  return formatCurrency(value || 0);
}

export default function Reports() {
  const { reportsData: data, reportsLoading: loading, reportsError: error, loadReports, refreshReports } = useProjects();
  const [filters, setFilters] = useState({
    province: '',
    city: '',
    project_type: '',
    review_status: '',
    year: '',
    month: '',
  });
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    loadReports(filters);
  };

  const clearFilters = () => {
    setFilters({
      province: '',
      city: '',
      project_type: '',
      review_status: '',
      year: '',
      month: '',
    });
    setSearch('');
    loadReports({});
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const filteredProjects = data?.projects?.filter((p) => {
    if (!search) return true;
    const lower = search.toLowerCase();
    return (
      (p.project_name || '').toLowerCase().includes(lower)
    );
  }) || [];

  if (loading) return <Spinner label="Loading reports..." />;

  if (error) {
    return (
      <div className="reports-page">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="reports-page">
        <p>No report data available.</p>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const summary = {
    total_projects: data.summary?.total_projects || 0,
    total_value: data.summary?.total_value || 0,
    provinces_count: data.summary?.provinces_count || 0,
    cities_count: data.summary?.cities_count || 0,
  };

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h1>Project Reports</h1>
        <p className="text-secondary">
          Analyze project data by status, province, city, and time period.
        </p>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-label">Total Projects</div>
          <div className="summary-value">{summary.total_projects}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Project Value</div>
          <div className="summary-value">
            <FormatCompact value={summary.total_value} />
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Provinces</div>
          <div className="summary-value">{summary.provinces_count}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Cities</div>
          <div className="summary-value">{summary.cities_count}</div>
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-grid">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={handleSearch}
            className="search-input compact"
          />
          <select
            name="province"
            value={filters.province}
            onChange={handleFilterChange}
            className="filter-select compact"
          >
            <option value="">Province</option>
            {data.filters?.provinces?.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            name="city"
            value={filters.city}
            onChange={handleFilterChange}
            className="filter-select compact"
          >
            <option value="">City</option>
            {data.filters?.cities
              ?.filter((c) => !filters.province || data.projects?.some((p) => p.city === c && p.province === filters.province))
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>
          <select
            name="project_type"
            value={filters.project_type}
            onChange={handleFilterChange}
            className="filter-select compact"
          >
            <option value="">Project Type</option>
            {data.filters?.project_types
              ?.filter(Boolean)
              .map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
          </select>
          <select
            name="review_status"
            value={filters.review_status}
            onChange={handleFilterChange}
            className="filter-select compact"
          >
            <option value="">Status</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REVISION">Revision</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select
            name="year"
            value={filters.year}
            onChange={handleFilterChange}
            className="filter-select compact"
          >
            <option value="">Year</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            name="month"
            value={filters.month}
            onChange={handleFilterChange}
            className="filter-select compact"
          >
            <option value="">Month</option>
            {months.map((m, i) => (
              <option key={i + 1} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <button className="btn btn-sm btn-primary compact" onClick={applyFilters}>
            Apply
          </button>
          <button className="btn btn-sm btn-secondary compact" onClick={clearFilters}>
            Clear
          </button>
        </div>
      </div>

      <div className="reports-grid">
        <div className="report-card">
          <h2>Status Distribution</h2>
          <div className="status-list">
            {data.status_distribution?.length > 0 ? (
              data.status_distribution.map((s) => (
                <div key={s.status} className="status-item">
                  <span className={`badge ${getStatusColor(s.status)}`}>
                    {getStatusText(s.status)}
                  </span>
                  <span className="status-count">{s.count}</span>
                </div>
              ))
            ) : (
              <p className="text-secondary">No data</p>
            )}
          </div>
        </div>

          <div className="report-card">
          <h2>Province Distribution</h2>
          <div className="province-list">
            {data.province_distribution?.length > 0 ? (
              data.province_distribution.map((p) => (
                <div key={p.province} className="province-item">
                  <span className="province-name">{p.province}</span>
                  <span className="province-count">{p.count} projects</span>
                </div>
              ))
            ) : (
              <p className="text-secondary">No data</p>
            )}
          </div>
        </div>

        <div className="report-card">
          <h2>City Distribution</h2>
          <div className="province-list">
            {data.city_distribution?.length > 0 ? (
              data.city_distribution.map((c) => (
                <div key={c.city} className="province-item">
                  <span className="province-name">{c.city}</span>
                  <span className="province-count">{c.count} projects</span>
                </div>
              ))
            ) : (
              <p className="text-secondary">No data</p>
            )}
          </div>
        </div>

        <div className="report-card">
          <h2>Monthly Trend</h2>
          <div className="trend-list">
              {data.monthly_trend?.length > 0 ? (
              data.monthly_trend.map((m) => (
                <div key={`${m.year}-${m.month}`} className="trend-item">
                  <span className="trend-period">
                    {months[m.month - 1]} {m.year}
                  </span>
                  <span className="trend-count">{m.count} projects</span>
                </div>
              ))
            ) : (
              <p className="text-secondary">No data</p>
            )}
          </div>
        </div>
      </div>

      <div className="projects-table">
        <h2>Project List</h2>
        {filteredProjects.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Province</th>
                <th>City</th>
                <th>Value</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id}>
                  <td>{project.project_name}</td>
                  <td>{project.province || '-'}</td>
                  <td>{project.city || '-'}</td>
                  <td>
                    <FormatCompact value={project.total_project_value} />
                  </td>
                  <td>
                    <span className={`badge ${getStatusColor(project.review_status)}`}>
                      {getStatusText(project.review_status)}
                    </span>
                  </td>
                  <td>{formatDate(project.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <p>No projects match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
