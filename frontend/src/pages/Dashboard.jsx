import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects } from '../contexts/ProjectContext';
import { formatCurrency } from '../utils/projectUtils';
import Spinner from '../components/Spinner';
import './Dashboard.css';

export default function Dashboard() {
  const { summary, summaryLoading, summaryError, loadProjectSummary } = useProjects();
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadProjectSummary();
  }, [loadProjectSummary]);

  if (summaryLoading) {
    return (
      <div className="dashboard">
        <div className="loading-skeleton-header">
          <div className="skeleton-title"></div>
          <div className="skeleton-subtitle"></div>
        </div>
        <div className="loading-skeleton">
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </div>
      </div>
    );
  }

  if (summaryError) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
        </div>
        <div className="alert alert-error">{summaryError}</div>
      </div>
    );
  }

  const s = summary;
  const projects = s?.projects || [];
  const displayedProjects = showAll ? projects : projects.slice(0, 5);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard & Projects</h1>
          <p className="page-subtitle">
            Manage and monitor all FO projects in one place.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm">
            Export Excel
          </button>
          <Link to="/upload-project" className="btn btn-primary btn-sm">
            + Upload Project Baru
          </Link>
        </div>
      </div>

      <div className="kpi-cards">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Total FO Projects</span>
            <span className="kpi-card-icon">📁</span>
          </div>
          <div className="kpi-card-value">{s?.summary?.total_projects || 0}</div>
          <div className="kpi-card-subtext">Projects</div>
          <div className="kpi-card-bottom">
            <span className="kpi-card-metric">{formatCurrency(s?.summary?.total_value || 0)}</span>
            <span className="kpi-card-trend positive">+12% MoM</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Approved / Siap RFS</span>
            <span className="kpi-card-icon">✅</span>
          </div>
          <div className="kpi-card-value">
            {s?.status_distribution?.find((s) => s.status === 'APPROVED')?.count || 0}
          </div>
          <div className="kpi-card-subtext">
            {s?.projects?.length > 0
              ? `${Math.round(((s?.status_distribution?.find((s) => s.status === 'APPROVED')?.count || 0) / s.projects.length) * 100)}%`
              : '0%'} Proyek
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-card-metric">
              {formatCurrency(
                s?.projects
                  ?.filter((p) => p.review_status === 'APPROVED')
                  .reduce((sum, p) => sum + (Number(p.total_project_value) || 0), 0) || 0,
              )}
            </span>
            <span className="kpi-card-status success">KHS Valid 100%</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Pending Review</span>
            <span className="kpi-card-icon">⏳</span>
          </div>
          <div className="kpi-card-value">
            {s?.status_distribution?.find((s) => s.status === 'PENDING_REVIEW')?.count || 0}
          </div>
          <div className="kpi-card-subtext">Butuh Tindakan</div>
          <div className="kpi-card-bottom">
            <span className="kpi-card-metric">
              {formatCurrency(
                s?.projects
                  ?.filter((p) => p.review_status === 'PENDING_REVIEW')
                  .reduce((sum, p) => sum + (Number(p.total_project_value) || 0), 0) || 0,
              )}
            </span>
            <span className="kpi-card-status warning">SLA 24h</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Revision & Rejected</span>
            <span className="kpi-card-icon">⚠️</span>
          </div>
          <div className="kpi-card-value">
            {(s?.status_distribution?.find((s) => s.status === 'REVISION')?.count || 0) +
              (s?.status_distribution?.find((s) => s.status === 'REJECTED')?.count || 0)}
          </div>
          <div className="kpi-card-subtext">Total Issues</div>
          <div className="kpi-card-bottom">
            <span className="kpi-card-metric">
              {formatCurrency(
                s?.projects
                  ?.filter((p) => p.review_status === 'REVISION' || p.review_status === 'REJECTED')
                  .reduce((sum, p) => sum + (Number(p.total_project_value) || 0), 0) || 0,
              )}
            </span>
            <span className="kpi-card-status error">
              {s?.status_distribution?.find((s) => s.status === 'REJECTED')?.count || 0} Rejected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
