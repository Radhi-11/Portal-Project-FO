const express = require('express');
const { authenticate } = require('../middlewares/auth');
const {
  reportsValidation,
  getProjectReports,
} = require('../controllers/reportController');

const router = express.Router();

router.use(authenticate);

router.get('/summary', reportsValidation, getProjectReports);

module.exports = router;
