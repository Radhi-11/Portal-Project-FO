const path = require('path');
const fs = require('fs');
const config = require('../config');

const ALLOWED_BOQ_EXTENSIONS = ['.xlsx', '.xls'];
const ALLOWED_KMZ_EXTENSIONS = ['.kmz', '.kml'];
const ALLOWED_KHS_EXTENSIONS = ['.xlsx', '.xls'];
const MAX_FILE_SIZE = config.upload.maxFileSize;

const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function validateBoqFile(file) {
  if (!file) {
    return { valid: false, error: 'BoQ file is required' };
  }
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_BOQ_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Invalid file type. Allowed: ${ALLOWED_BOQ_EXTENSIONS.join(', ')}` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Max size: ${MAX_FILE_SIZE} bytes` };
  }
  return { valid: true };
}

function validateKmzFile(file) {
  if (!file) {
    return { valid: false, error: 'KMZ file is required' };
  }
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_KMZ_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Invalid file type. Allowed: ${ALLOWED_KMZ_EXTENSIONS.join(', ')}` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Max size: ${MAX_FILE_SIZE} bytes` };
  }
  return { valid: true };
}

function validateKhsFile(file) {
  if (!file) {
    return { valid: false, error: 'KHS file is required' };
  }
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_KHS_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Invalid file type. Allowed: ${ALLOWED_KHS_EXTENSIONS.join(', ')}` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Max size: ${MAX_FILE_SIZE} bytes` };
  }
  return { valid: true };
}

function generateStoredFilename(originalFilename) {
  const ext = path.extname(originalFilename);
  const name = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
  return name;
}

function getUploadPath(storedFilename) {
  return path.join(uploadDir, storedFilename);
}

module.exports = {
  ALLOWED_BOQ_EXTENSIONS,
  ALLOWED_KMZ_EXTENSIONS,
  ALLOWED_KHS_EXTENSIONS,
  MAX_FILE_SIZE,
  uploadDir,
  validateBoqFile,
  validateKmzFile,
  validateKhsFile,
  generateStoredFilename,
  getUploadPath,
};
