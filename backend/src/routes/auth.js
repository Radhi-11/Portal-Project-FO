const express = require('express');
const { login, register, changePassword, getMe, loginValidation, registerValidation, changePasswordValidation } = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.post(
  '/login',
  loginValidation,
  login,
);

router.post(
  '/register',
  registerValidation,
  register,
);

router.post(
  '/change-password',
  authenticate,
  changePasswordValidation,
  changePassword,
);

router.get('/me', authenticate, getMe);

module.exports = router;
