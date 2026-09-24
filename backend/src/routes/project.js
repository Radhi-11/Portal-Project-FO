const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { logAction } = require('../middlewares/auditLog');
const {
  createProject,
  getProject,
  listProjects,
  listProjectTypes,
  downloadFile,
  createProjectValidation,
  listValidation,
  parseProjectFiles,
  parseKhsFile,
  validateProject,
  reviewProject,
  reviewValidation,
  getKmzGeometry,
  getApprovedProjectsForGeomap,
  getProjectBoqItems,
  getProjectKmzLength,
  getKhsComparison,
} = require('../controllers/projectController');
const { param } = require('express-validator');
const multer = require('multer');
const path = require('path');

const upload = multer({
  dest: path.join(__dirname, '../../uploads'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
});

const idValidation = [
  param('id').isInt().withMessage('Project ID must be an integer'),
];

const fileIdValidation = [
  param('id').isInt().withMessage('Project ID must be an integer'),
  param('fileId').isInt().withMessage('File ID must be an integer'),
];

const router = express.Router();

router.use(authenticate);

router.get('/', listValidation, listProjects);
router.get('/types', listProjectTypes);
router.get('/geomap/projects', getApprovedProjectsForGeomap);
router.post(
  '/parse',
  upload.fields([
    { name: 'boq', maxCount: 1 },
    { name: 'kmz', maxCount: 1 },
  ]),
  parseProjectFiles,
);
router.post(
  '/parse-khs',
  upload.fields([
    { name: 'khs', maxCount: 1 },
  ]),
  parseKhsFile,
);
router.post(
  '/validate',
  upload.fields([
    { name: 'boq', maxCount: 1 },
    { name: 'khs', maxCount: 1 },
    { name: 'kmz', maxCount: 1 },
  ]),
  validateProject,
);
router.post(
  '/',
  upload.fields([
    { name: 'boq', maxCount: 1 },
    { name: 'kmz', maxCount: 1 },
  ]),
  createProjectValidation,
  logAction('CREATE', 'PROJECT'),
  createProject,
);
router.get('/:id', idValidation, getProject);
router.get('/:id/kmz', idValidation, getKmzGeometry);
router.get('/:id/files/:fileId/download', fileIdValidation, downloadFile);
router.post(
  '/:id/review',
  idValidation,
  reviewValidation,
  logAction('REVIEW', 'PROJECT'),
  reviewProject,
);
router.get('/:id/boq-items', idValidation, getProjectBoqItems);
router.get('/:id/kmz-length', idValidation, getProjectKmzLength);
router.get('/:id/khs-comparison', idValidation, getKhsComparison);

module.exports = router;
