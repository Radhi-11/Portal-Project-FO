const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const { logAction } = require('../middlewares/auditLog');
const {
  listKhsItems,
  getKhsItem,
  createKhsItem,
  updateKhsItem,
  deleteKhsItem,
  getKhsStats,
  importKhsExcel,
  listValidation,
  createValidation,
  updateValidation,
  idValidation,
} = require('../controllers/khsController');
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

const router = express.Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/stats', getKhsStats);
router.get('/', listValidation, listKhsItems);
router.post('/', createValidation, logAction('CREATE', 'KHS'), createKhsItem);
router.post(
  '/import',
  upload.fields([{ name: 'khs', maxCount: 1 }]),
  logAction('IMPORT', 'KHS'),
  importKhsExcel,
);
router.get('/:id', idValidation, getKhsItem);
router.put('/:id', idValidation, updateValidation, logAction('UPDATE', 'KHS'), updateKhsItem);
router.delete('/:id', idValidation, logAction('DELETE', 'KHS'), deleteKhsItem);

module.exports = router;
