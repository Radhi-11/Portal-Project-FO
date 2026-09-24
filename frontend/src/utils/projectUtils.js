export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const getStatusColor = (status) => {
  const colors = {
    draft: 'bg-secondary',
    submitted: 'bg-info',
    validated: 'bg-success',
    verified: 'bg-warning',
    rejected: 'bg-danger',
    archived: 'bg-dark',
    PENDING: 'bg-info',
    VALIDATED: 'bg-success',
    PENDING_REVIEW: 'bg-info',
    APPROVED: 'bg-success',
    REVISION: 'bg-warning',
    REJECTED: 'bg-danger',
  };
  return colors[status] || colors[status?.toLowerCase()] || 'bg-secondary';
};

export const getStatusText = (status) => {
  const texts = {
    draft: 'Draft',
    submitted: 'Submitted',
    validated: 'Validated',
    verified: 'Verified',
    rejected: 'Rejected',
    archived: 'Archived',
    PENDING: 'Pending',
    VALIDATED: 'Validated',
    PENDING_REVIEW: 'Pending Review',
    APPROVED: 'Approved',
    REVISION: 'Revision',
    REJECTED: 'Rejected',
  };
  return texts[status] || texts[status?.toLowerCase()] || status || '-';
};

export const getValidationStatusColor = (status) => {
  const colors = {
    PENDING: 'bg-info',
    VALIDATED: 'bg-success',
    FAILED: 'bg-danger',
  };
  return colors[status] || 'bg-secondary';
};

export const getValidationStatusText = (status) => {
  const texts = {
    PENDING: 'Pending',
    VALIDATED: 'Validated',
    FAILED: 'Failed',
  };
  return texts[status] || status || '-';
};

export const formatCurrency = (value) => {
  if (!value && value !== 0) return 'Rp 0';
  const num = Number(value);
  if (isNaN(num)) return 'Rp 0';
  return `Rp ${num.toLocaleString('id-ID')}`;
};
