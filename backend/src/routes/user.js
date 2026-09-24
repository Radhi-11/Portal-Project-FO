const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const { logAction } = require('../middlewares/auditLog');
const {
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  setUserPassword,
  listValidation,
  updateValidation,
  setPasswordValidation,
} = require('../controllers/userController');
const { param } = require('express-validator');

const idValidation = [
  param('id').isInt().withMessage('User ID must be an integer'),
];

const router = express.Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/', listValidation, listUsers);
router.get('/:id', idValidation, getUser);
router.put('/:id', idValidation, updateValidation, logAction('UPDATE', 'USER'), updateUser);
router.delete('/:id', idValidation, logAction('DELETE', 'USER'), deleteUser);
router.put(
  '/:id/set-password',
  idValidation,
  setPasswordValidation,
  logAction('PASSWORD_RESET', 'USER'),
  setUserPassword,
);

module.exports = router;
