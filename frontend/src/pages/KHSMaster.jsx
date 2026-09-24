import { useState, useEffect } from 'react';
import api from '../api/axios';
import Spinner from '../components/Spinner';
import { formatCurrency } from '../utils/projectUtils';
import { useAuth } from '../contexts/AuthContext';
import './KHSMaster.css';

export default function KHSMaster() {
  const { user } = useAuth();
  const [khsItems, setKhsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const loadKhsItems = async (params = {}) => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      qs.set('page', params.page || pagination.page);
      qs.set('limit', params.limit || pagination.limit);
      if (params.search) qs.set('search', params.search);
      if (params.category) qs.set('item_category', params.category);
      if (params.active !== undefined) qs.set('is_active', params.active);

      const res = await api.get(`/khs?${qs.toString()}`);
      setKhsItems(res.data.data || []);
      setPagination({
        page: res.data.pagination?.page || 1,
        limit: res.data.pagination?.limit || 20,
        total: res.data.pagination?.total || 0,
        totalPages: res.data.pagination?.totalPages || 1,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load KHS items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKhsItems({ page: pagination.page, search, category: categoryFilter, active: activeFilter });
  }, [pagination.page, search, categoryFilter, activeFilter]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const handleSearchBlur = () => {
    if (search !== '') {
      loadKhsItems({ page: 1, search, category: categoryFilter, active: activeFilter });
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setActiveFilter(true);
    loadKhsItems({ page: 1 });
  };

  const hasActiveFilters = search || categoryFilter || activeFilter !== true;

  const handlePageChange = (newPage) => {
    loadKhsItems({ page: newPage, search, category: categoryFilter, active: activeFilter });
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData(e.target);
      const payload = {
        item_category: formData.get('item_category'),
        product_no: formData.get('product_no'),
        product_desc: formData.get('product_desc'),
        item_price: parseFloat(formData.get('item_price')),
      };

      if (editingItem) {
        await api.put(`/khs/${editingItem.id}`, payload);
      } else {
        await api.post('/khs', payload);
      }
      loadKhsItems({ page: pagination.page, search, category: categoryFilter, active: activeFilter });
      closeModal();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save KHS item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Deactivate "${item.product_no}"?`)) return;
    try {
      await api.delete(`/khs/${item.id}`);
      loadKhsItems({ page: pagination.page, search, category: categoryFilter, active: activeFilter });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to deactivate KHS item.');
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('khs', importFile);
      const res = await api.post('/khs/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data.data);
      loadKhsItems({ page: 1, search, category: categoryFilter, active: activeFilter });
    } catch (err) {
      setImportResult({ error: err.response?.data?.error || 'Import failed.' });
    } finally {
      setImporting(false);
      setImportFile(null);
      setImportModalOpen(false);
    }
  };

  if (loading && khsItems.length === 0) return <Spinner label="Loading KHS items..." />;

  return (
    <div className="khs-master-page">
      <div className="khs-header">
        <div>
          <h1>KHS Master</h1>
          <p className="text-secondary">
            Manage KHS (Harga Standard Kurir) master items
          </p>
        </div>
        <div className="khs-actions">
          <button
            onClick={() => setImportModalOpen(true)}
            className="btn btn-secondary"
          >
            Import from Excel
          </button>
          <button
            onClick={openCreateModal}
            className="btn btn-primary"
          >
            Add KHS Item
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="search-filter-bar">
        <input
          type="text"
          placeholder="Search by product no or description..."
          value={search}
          onChange={handleSearchChange}
          onBlur={handleSearchBlur}
          className="search-input"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">All Categories</option>
          <option value="MATERIAL">Material</option>
          <option value="SERVICE">Service</option>
        </select>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value === 'true')}
          className="filter-select"
        >
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
          <option value="">All</option>
        </select>
        {hasActiveFilters && (
          <button onClick={handleClearFilters} className="btn btn-sm btn-secondary">
            Clear Filters
          </button>
        )}
      </div>

      {khsItems.length > 0 ? (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Product No</th>
                  <th>Description</th>
                  <th className="text-right">Item Price</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {khsItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.item_category}</td>
                    <td className="font-monospace">{item.product_no}</td>
                    <td>{item.product_desc}</td>
                    <td className="text-right">{formatCurrency(item.item_price)}</td>
                    <td>
                      <span className={`badge ${item.is_active ? 'badge-success' : 'badge-secondary'}`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => openEditModal(item)}
                        className="btn btn-sm btn-secondary"
                      >
                        Edit
                      </button>
                      {item.is_active && (
                        <button
                          onClick={() => handleDelete(item)}
                          className="btn btn-sm btn-danger"
                        >
                          Deactivate
                        </button>
                      )}
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
          <div className="empty-icon">📋</div>
          <h3>No KHS items found</h3>
          <p>Click "Add KHS Item" to get started.</p>
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingItem ? 'Edit KHS Item' : 'Add KHS Item'}</h2>
              <button onClick={closeModal} className="btn btn-sm btn-secondary">
                Close
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Category</label>
                <select name="item_category" required defaultValue={editingItem?.item_category || ''}>
                  <option value="">Select Category</option>
                  <option value="MATERIAL">Material</option>
                  <option value="SERVICE">Service</option>
                </select>
              </div>
              <div className="form-group">
                <label>Product No</label>
                <input
                  type="text"
                  name="product_no"
                  placeholder="e.g. MAT-001"
                  required
                  defaultValue={editingItem?.product_no || ''}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="product_desc"
                  placeholder="Product description"
                  required
                  defaultValue={editingItem?.product_desc || ''}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Unit Price (Rp)</label>
                <input
                  type="number"
                  name="item_price"
                  placeholder="0"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={editingItem?.item_price || ''}
                />
              </div>
              <div className="modal-footer">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Import KHS from Excel</h2>
              <button
                onClick={() => setImportModalOpen(false)}
                className="btn btn-sm btn-secondary"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleImportSubmit} className="modal-body">
              <div className="form-group">
                <label>KHS Excel File (.xlsx)</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  required
                />
              </div>
              {importResult && (
                <div className="import-result">
                  {importResult.error ? (
                    <div className="alert alert-error">{importResult.error}</div>
                  ) : (
                    <div className="alert alert-info">
                      <p>
                        Import complete: {importResult.imported} imported,{' '}
                        {importResult.skipped_duplicate} skipped{' '}
                        (duplicates), {importResult.failed} failed.
                      </p>
                    </div>
                  )}
                </div>
              )}
              <div className="modal-footer">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={importing || !importFile}
                >
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
