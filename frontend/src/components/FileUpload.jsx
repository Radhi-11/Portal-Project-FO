import { useState, useCallback } from 'react';
import './FileUpload.css';

export default function FileUpload({ id, label, accept, onFileSelect, error, file }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      onFileSelect(droppedFile);
    }
  }, [onFileSelect]);

  const handleChange = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  }, [onFileSelect]);

  const handleRemove = useCallback(() => {
    onFileSelect(null);
  }, [onFileSelect]);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  };

  return (
    <div className="file-upload-container">
      <label htmlFor={id} className="form-label">{label}</label>
      <div
        className={`file-upload-area ${isDragging ? 'dragging' : ''} ${error ? 'error' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {file ? (
          <div className="file-selected">
            <div className="file-info">
              <span className="file-name">{file.name}</span>
              <span className="file-size">{formatFileSize(file.size)}</span>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={handleRemove}
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <div className="file-upload-icon">📁</div>
            <div className="file-upload-text">
              <span className="file-upload-drag">Drag & Drop file here</span>
              <span className="file-upload-divider">or</span>
              <label htmlFor={id} className="file-upload-btn">
                Choose File
              </label>
            </div>
          </>
        )}
        <input
          id={id}
          type="file"
          className="file-upload-input"
          accept={accept}
          onChange={handleChange}
          style={{ display: 'none' }}
        />
      </div>
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}
