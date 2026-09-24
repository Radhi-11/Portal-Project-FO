import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useProjects } from '../contexts/ProjectContext';
import Spinner from '../components/Spinner';
import KMZMap from '../components/KMZMap';
import { formatDate, getStatusColor, getStatusText, getValidationStatusColor, getValidationStatusText, formatCurrency } from '../utils/projectUtils';
import { useAuth } from '../contexts/AuthContext';
import './ProjectDetail.css';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [boqItems, setBoqItems] = useState([]);
  const [boqSummary, setBoqSummary] = useState(null);
  const [khsComparison, setKhsComparison] = useState(null);
  const [kmzLength, setKmzLength] = useState(null);
  const [loading, setLoading] = useState(true);
  const [boqLoading, setBoqLoading] = useState(false);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [kmzLoading, setKmzLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const { isAdmin } = useAuth();
  const { refreshProjects } = useProjects();

  useEffect(() => {
    loadProject();
    loadBoqItems();
    loadKhsComparison();
    loadKmzLength();
  }, [id]);

  const loadProject = async () => {
    try {
      const res = await api.get(`/projects/${id}`);
      setProject(res.data.project);
      setFiles(res.data.files || []);
    } catch {
      setError('Failed to load project.');
    } finally {
      setLoading(false);
    }
  };

  const loadBoqItems = async () => {
    setBoqLoading(true);
    try {
      const res = await api.get(`/projects/${id}/boq-items`);
      setBoqItems(res.data.data || []);
      setBoqSummary(res.data.summary || null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load BoQ items.');
    } finally {
      setBoqLoading(false);
    }
  };

  const loadKhsComparison = async () => {
    setComparisonLoading(true);
    try {
      const res = await api.get(`/projects/${id}/khs-comparison`);
      setKhsComparison(res.data.data || null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load KHS comparison.');
    } finally {
      setComparisonLoading(false);
    }
  };

  const loadKmzLength = async () => {
    setKmzLoading(true);
    try {
      const res = await api.get(`/projects/${id}/kmz-length`);
      setKmzLength(res.data.data || null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load KMZ length.');
    } finally {
      setKmzLoading(false);
    }
  };

  const downloadFile = (fileId) => {
    window.open(`${api.defaults.baseURL}/projects/files/${fileId}`, '_blank');
  };

  const handleReview = async (status) => {
    if (!status) return;
    setActionLoading(true);
    try {
      await api.post(`/projects/${id}/review`, {
        review_status: status,
        notes: reviewNotes,
      });
      setReviewNotes('');
      if (status === 'APPROVED') {
        refreshProjects();
      }
      loadProject();
    } catch (err) {
      setError(err.response?.data?.error || 'Review failed.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Spinner label="Loading project..." />;

  if (error) {
    return (
      <div className="project-detail-page">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-detail-page">
        <div className="alert">Project not found.</div>
      </div>
    );
  }

  const canReview = isAdmin && project.review_status !== 'APPROVED';
  const reviewStatuses = [
    { value: 'APPROVED', label: 'Approve', class: 'btn-success' },
    { value: 'REVISION', label: 'Request Revision', class: 'btn-warning' },
    { value: 'REJECTED', label: 'Reject', class: 'btn-danger' },
  ];

  return (
    <div className="project-detail-page">
      <div className="detail-header-modern">
        <div>
          <nav className="breadcrumb">
            <Link to="/my-projects" className="breadcrumb-link">Projects</Link>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">{project.project_name}</span>
          </nav>
          <div className="detail-title-row">
            <h1>{project.project_name}</h1>
            <span className={`badge ${getStatusColor(project.review_status || project.validation_status)}`}>
              {getStatusText(project.review_status || project.validation_status)}
            </span>
          </div>
        </div>
        <div className="detail-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => window.history.back()}>
            ← Back
          </button>
          <Link to={`/projects/${project.id}`} className="btn btn-secondary btn-sm">
            Refresh
          </Link>
        </div>
      </div>

      <div className="khs-active-indicator">
        <span className="indicator-dot"></span>
        KHS Version: AcuanKHSSMUO.xlsx (Active v2.4)
      </div>

      <div className="detail-grid-modern">
        <div className="detail-card">
          <h2 className="card-title">Project Information</h2>
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">Project Name</span>
              <span className="info-value">{project.project_name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Project Type</span>
              <span className="info-value">{project.project_type || '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Location</span>
              <span className="info-value">
                {project.city ? `${project.city}, ${project.province || ''}` : '-'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Address</span>
              <span className="info-value">{project.address || '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Created By</span>
              <span className="info-value">{project.creator || `- (${formatDate(project.created_at)})`}</span>
            </div>
          </div>
        </div>

        <div className="detail-card">
          <h2 className="card-title">Validation Results</h2>
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">Validation Status</span>
              <span className={`badge ${getValidationStatusColor(project.validation_status)}`}>
                {getValidationStatusText(project.validation_status)}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Review Status</span>
              <span className={`badge ${getStatusColor(project.review_status)}`}>
                {getStatusText(project.review_status)}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">BOQ Length</span>
              <span className="info-value">
                {project.boq_proposed_length ? `${project.boq_proposed_length} m` : '-'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">KMZ Route Length</span>
              <span className="info-value">
                {kmzLoading
                  ? 'Loading...'
                  : kmzLength
                    ? `${kmzLength.totalRouteLength} m (${kmzLength.routeCount} route${kmzLength.routeCount > 1 ? 's' : ''})`
                    : project.kmz_selected_length
                      ? `${project.kmz_selected_length} m`
                      : '-'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Length Difference</span>
              <span className="info-value">
                {kmzLoading
                  ? 'Loading...'
                  : kmzLength?.lengthDifference
                    ? `${kmzLength.lengthDifference} m (${kmzLength.lengthDifferencePercentage}%)`
                    : project.length_difference
                      ? `${project.length_difference} m (${project.length_difference_percentage}%)`
                      : '-'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Total Project Value</span>
              <span className="info-value">
                {boqSummary
                  ? formatCurrency(boqSummary.totalValue)
                  : project.total_project_value
                    ? formatCurrency(project.total_project_value)
                    : '-'}
              </span>
            </div>
          </div>
        </div>

        <div className="detail-card">
          <h2 className="card-title">Files</h2>
          <div className="file-list">
            {files.map((file) => (
              <div key={file.id} className="file-item">
                <div className="file-meta">
                  <span className="file-type-badge">{file.file_type}</span>
                  <div>
                    <div className="file-name">{file.original_filename}</div>
                    <div className="file-meta-secondary">
                      {(file.file_size / 1024).toFixed(1)} KB • {formatDate(file.created_at)}
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => downloadFile(file.id)}
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {canReview && (
        <div className="detail-card review-card">
          <h2 className="card-title">Admin Review</h2>
          <div className="review-actions">
            <textarea
              placeholder="Notes (optional)..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="notes-input"
              rows="3"
              disabled={actionLoading}
            />
            <div className="review-buttons">
              {reviewStatuses.map((s) => (
                <button
                  key={s.value}
                  className={`btn btn-sm ${s.class}`}
                  onClick={() => handleReview(s.value)}
                  disabled={actionLoading}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="detail-card boq-comparison-card">
        <div className="card-header-modern">
          <h2 className="card-title">BoQ Items vs KHS Master</h2>
          {khsComparison && (
            <div className="comparison-stats">
              <span className="stat-badge success">{khsComparison.stats.matched} Match</span>
              <span className="stat-badge warning">{khsComparison.stats.boqHigher} BoQ Higher</span>
              <span className="stat-badge danger">{khsComparison.stats.notFoundInKhs} Not in KHS</span>
            </div>
          )}
        </div>

        {(boqLoading || comparisonLoading) ? (
          <Spinner label="Loading items..." />
        ) : khsComparison ? (
          <>
            {khsComparison.stats.notFoundInKhs > 0 && (
              <div className="alert alert-error">
                <strong>Warning:</strong> {khsComparison.stats.notFoundInKhs} BoQ items not found in KHS Master.
              </div>
            )}
            {khsComparison.stats.boqHigher > 0 || khsComparison.stats.boqLower > 0 ? (
              <div className="alert alert-warning">
                <strong>Warning:</strong> Some BoQ items have price differences compared to KHS Master.
              </div>
            ) : null}

            <div className="table-container">
              <table className="table compact">
                <thead>
                  <tr>
                    <th>Product No</th>
                    <th>Description</th>
                    <th className="text-right">Qty</th>
                    <th>Unit</th>
                    <th className="text-right">BoQ Price</th>
                    <th className="text-right">KHS Price</th>
                    <th className="text-right">Diff</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {boqItems.map((item) => {
                    const comp = khsComparison.comparisons.find(
                      (c) => c.product_no === item.product_no,
                    );
                    return (
                      <tr
                        key={item.id}
                        className={
                          comp?.status === 'NOT_FOUND_IN_KHS'
                            ? 'row-error'
                            : comp?.status === 'MATCH'
                              ? 'row-success'
                              : comp?.status === 'BOQ_HIGHER' || comp?.status === 'BOQ_LOWER'
                                ? 'row-warning'
                                : ''
                        }
                      >
                        <td className="font-monospace">{item.product_no}</td>
                        <td>{item.product_desc}</td>
                        <td className="text-right">{item.quantity}</td>
                        <td>{item.unit}</td>
                        <td className="text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="text-right">
                          {comp?.khs_item_price
                            ? formatCurrency(comp.khs_item_price)
                            : '-'}
                        </td>
                        <td className="text-right">
                          {comp?.price_difference !== null && comp?.price_difference !== undefined
                            ? `${formatCurrency(comp.price_difference)} (${comp.price_difference_percentage}%)`
                            : '-'}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              comp?.status === 'MATCH'
                                ? 'badge-success'
                                : comp?.status === 'NOT_FOUND_IN_KHS'
                                  ? 'badge-danger'
                                  : comp?.status === 'BOQ_HIGHER' || comp?.status === 'BOQ_LOWER'
                                    ? 'badge-warning'
                                    : 'badge-secondary'
                            }`}
                          >
                            {comp?.status === 'MATCH'
                              ? '✓ Valid'
                              : comp?.status === 'NOT_FOUND_IN_KHS'
                                ? 'Not in KHS'
                                : comp?.status === 'BOQ_HIGHER'
                                  ? 'BoQ Higher'
                                  : comp?.status === 'BOQ_LOWER'
                                    ? 'BoQ Lower'
                                    : '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {boqSummary && (
              <div className="boq-summary">
                <div className="summary-row">
                  <span className="summary-label">Total Items:</span>
                  <span className="summary-value">{boqSummary.totalItems}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Total BoQ Value:</span>
                  <span className="summary-value">{formatCurrency(boqSummary.totalValue)}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <p>No BoQ items found for this project.</p>
          </div>
        )}
      </div>

      <div className="detail-card">
        <h2 className="card-title">Section Map</h2>
        <div className="map-container-detail">
          <KMZMap projectId={id} />
        </div>
      </div>
    </div>
  );
}
