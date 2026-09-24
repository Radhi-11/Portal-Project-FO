import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useProjects } from '../contexts/ProjectContext';
import FileUpload from '../components/FileUpload';
import Spinner from '../components/Spinner';
import './UploadProject.css';

const STEPS = [
  { id: 1, name: 'Upload Files', label: 'Upload' },
  { id: 2, name: 'Parsing Files', label: 'Processing' },
  { id: 3, name: 'Review Before Submit', label: 'Review & Submit' },
];

const PROCESSING_STEPS = [
  { id: 'boq', name: 'Reading BoQ' },
  { id: 'kmz', name: 'Reading KMZ' },
  { id: 'geometry', name: 'Detecting Route' },
  { id: 'length', name: 'Calculating Route Length' },
  { id: 'geocode', name: 'Geocoding Location' },
  { id: 'validate', name: 'Comparing BoQ & KMZ' },
  { id: 'match', name: 'Comparing BoQ & KHS' },
];

export default function UploadProject() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const { refreshProjects } = useProjects();

  const [projectTypes, setProjectTypes] = useState([]);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [extractedData, setExtractedData] = useState(null);

  const [files, setFiles] = useState({
    boq: null,
    kmz: null,
  });

  const [formData, setFormData] = useState({
    project_name: '',
    project_type: '',
    province: '',
    city: '',
    address: '',
    boq_proposed_length: '',
  });

  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadProjectTypes();
  }, []);

  const loadProjectTypes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/projects/types');
      setProjectTypes(res.data.data);
    } catch {
      setProjectTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (type, file) => {
    setFiles((prev) => ({ ...prev, [type]: file }));
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!files.boq) newErrors.boq = 'BoQ file is required';
    if (!files.kmz) newErrors.kmz = 'KMZ file is required';
    setError(newErrors.boq || newErrors.kmz || '');
    return Object.keys(newErrors).length === 0;
  };

  const handleUpload = async () => {
    setProcessingComplete(false);
    setCompletedSteps([]);
    setError('');

    if (!validateStep1()) return;

    setCurrentStep(2);

    try {
      const formDataObj = new FormData();
      formDataObj.append('boq', files.boq);
      formDataObj.append('kmz', files.kmz);

      const steps = [];

      for (let i = 0; i < PROCESSING_STEPS.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 300));
        steps.push(PROCESSING_STEPS[i].id);
        setCompletedSteps([...steps]);
      }

      const res = await api.post('/projects/parse', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setProcessingComplete(true);
        setExtractedData(res.data.data);

        setFormData({
          project_name: res.data.data.project_name || '',
          project_type: '',
          province: res.data.data.province || '',
          city: res.data.data.city || '',
          address: res.data.data.address || '',
          boq_proposed_length: res.data.data.boq_proposed_length || '',
        });

        setTimeout(() => {
          setCurrentStep(3);
          setEditMode(true);
        }, 500);
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to parse files. Please try again.',
      );
    }
  };

   const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleEditMode = () => {
    setEditMode((prev) => !prev);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

     const formDataObj = new FormData();
     formDataObj.append('project_name', formData.project_name);
     formDataObj.append('project_type', formData.project_type || '');
     formDataObj.append('province', formData.province || '');
    formDataObj.append('city', formData.city || '');
    formDataObj.append('address', formData.address || '');
    formDataObj.append('boq_proposed_length', formData.boq_proposed_length || '');
    formDataObj.append('boq', files.boq);
    formDataObj.append('kmz', files.kmz);

    try {
      const response = await api.post('/projects', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        setSuccess('Project submitted successfully!');
        refreshProjects();
        setTimeout(() => {
          navigate('/my-projects');
        }, 2000);
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to submit project.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="step-indicator">
      {STEPS.map((step) => (
        <div key={step.id} className="step-item">
          <div className={`step-circle ${currentStep >= step.id ? 'active' : ''}`}>
            {step.id}
          </div>
          <span className="step-label">{step.label}</span>
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="step-content">
      <h2>Upload Project Files</h2>
      <p className="text-secondary">
        Drag and drop your BoQ (.xlsx/.xls) and Geomap (.kmz/.kml) files.
        The system will extract project information automatically.
      </p>

      <div className="dual-upload">
        <div className="upload-section">
          <FileUpload
            id="boq-upload"
            label="BoQ File (.xlsx, .xls)"
            accept=".xlsx,.xls"
            onFileSelect={(file) => handleFileChange('boq', file)}
            error=""
            file={files.boq}
          />
        </div>

        <div className="upload-section">
          <FileUpload
            id="kmz-upload"
            label="Geomap KMZ File (.kmz, .kml)"
            accept=".kmz,.kml"
            onFileSelect={(file) => handleFileChange('kmz', file)}
            error=""
            file={files.kmz}
          />
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleUpload}
          disabled={submitting}
        >
          Upload & Process
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="step-content">
      <h2>Processing Files &amp; Extracting Location...</h2>
      <p className="text-secondary">
        Please wait while the system parses your files and extracts project information.
      </p>

      <div className="processing-container">
        <Spinner label="Parsing files and extracting project data..." />

        <div className="validation-steps">
          {PROCESSING_STEPS.map((step) => {
            const done = completedSteps.includes(step.id);
            return (
              <div
                key={step.id}
                className={`validation-step ${done ? 'completed' : ''}`}
              >
                <span className="validation-step-icon">
                  {done ? '✓' : '●'}
                </span>
                <span className="validation-step-name">{step.name}</span>
              </div>
            );
          })}
        </div>

        {error && <div className="form-error">{error}</div>}
      </div>

      {error && (
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setCurrentStep(1)}>
            Back to Upload
          </button>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="step-content">
      <div className="review-header">
        <h2>Review Before Submit</h2>
        {extractedData && (
          <span className="extraction-badge">Auto-extracted</span>
        )}
      </div>
      <p className="text-secondary">
        {editMode
          ? 'Edit the fields below if auto-extraction is inaccurate.'
          : 'Review the auto-filled project information before submitting.'
        }
      </p>

      {extractedData && (
        <div className="extraction-summary">
          <div className="summary-card">
            <h3>Extracted Data</h3>
            <div className="summary-grid">
              {extractedData.project_name && (
                <div className="summary-row">
                  <span>Project Name (from BoQ)</span>
                  <span>{extractedData.project_name}</span>
                </div>
              )}
              {extractedData.kmz_route_length > 0 && (
                <div className="summary-row">
                  <span>KMZ Route Length</span>
                  <span>{(extractedData.kmz_route_length).toFixed(2)} m</span>
                </div>
              )}
              {extractedData.boq_proposed_length && (
                <div className="summary-row">
                  <span>BoQ Proposed Length</span>
                  <span>{extractedData.boq_proposed_length} m</span>
                </div>
              )}
              {extractedData.total_project_value > 0 && (
                <div className="summary-row">
                  <span>Total Project Value</span>
                  <span>Rp {extractedData.total_project_value.toLocaleString('id-ID')}</span>
                </div>
              )}
              {extractedData.geocoding?.error && (
                <div className="summary-row">
                  <span>Geocoding</span>
                  <span className="text-warning">Limited (offline)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

       <form
         className={`review-form ${editMode ? 'editable' : ''}`}
         onSubmit={(e) => {
           e.preventDefault();
           handleSubmit();
         }}
       >
         <div className="form-group">
           <label className="form-label">Project Name *</label>
           <input
             type="text"
             className="form-input"
             name="project_name"
             value={formData.project_name}
             onChange={handleInputChange}
             readOnly={!editMode}
             required
           />
         </div>

         <div className="form-group">
           <label className="form-label">Project Type</label>
           <select
             className="form-input"
             name="project_type"
             value={formData.project_type}
             onChange={handleInputChange}
             disabled={!editMode}
           >
             <option value="">Select project type</option>
             {projectTypes.map((pt) => (
               <option key={pt.code} value={pt.code}>
                 {pt.name}
               </option>
             ))}
           </select>
         </div>

         <div className="form-grid">
           <div className="form-group">
             <label className="form-label">Province</label>
             <input
               type="text"
               className="form-input"
               name="province"
               value={formData.province}
               onChange={handleInputChange}
               readOnly={!editMode}
             />
           </div>

           <div className="form-group">
             <label className="form-label">City</label>
             <input
               type="text"
               className="form-input"
               name="city"
               value={formData.city}
               onChange={handleInputChange}
               readOnly={!editMode}
             />
           </div>
         </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">City</label>
            <input
              type="text"
              className="form-input"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              readOnly={!editMode}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Proposed Length (m)</label>
            <input
              type="number"
              className="form-input"
              name="boq_proposed_length"
              value={formData.boq_proposed_length}
              onChange={handleInputChange}
              readOnly={!editMode}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Address</label>
          <textarea
            className="form-input"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            readOnly={!editMode}
            rows={3}
          />
        </div>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setCurrentStep(1)}
          >
            Back
          </button>
          {!editMode ? (
            <button type="button" className="btn btn-secondary" onClick={toggleEditMode}>
              Edit Fields
            </button>
          ) : (
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Project'}
            </button>
          )}
        </div>
      </form>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      default: return renderStep1();
    }
  };

  if (loading && currentStep === 1 && projectTypes.length === 0) {
    return <Spinner label="Loading project types..." />;
  }

  return (
    <div className="upload-project-page">
      <div className="upload-header">
        <h1>Upload New Project</h1>
        <p className="text-secondary">
          Upload your BoQ and KMZ files. The system will extract project details automatically.
        </p>
      </div>

      {renderStepIndicator()}

      <div className="upload-card">
        {renderCurrentStep()}
      </div>
    </div>
  );
}
