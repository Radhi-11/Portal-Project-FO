const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/jwt');
const config = require('../config');
const { validatePasswordStrength, comparePassword } = require('../utils/password');

const loginValidation = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const registerValidation = [
  body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('role').optional().isIn(['ADMIN', 'USER']).withMessage('Invalid role'),
];

const changePasswordValidation = [
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password').notEmpty().withMessage('New password is required'),
];

async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, password } = req.body;

    const result = await db.query(
      'SELECT id, username, email, full_name, password_hash, role, must_change_password, is_active FROM users WHERE username = $1',
      [username],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    const user = result.rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Contact administrator.',
      });
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
      must_change_password: user.must_change_password,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        must_change_password: user.must_change_password,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function register(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, email, full_name, password, role, address } = req.body;

    const pwCheck = validatePasswordStrength(password);
    if (!pwCheck.valid) {
      return res.status(400).json({
        success: false,
        error: pwCheck.message,
      });
    }

    const existing = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Username or email already exists',
      });
    }

    const hashedPassword = await bcrypt.hash(password, config.bcrypt.saltRounds);

    const result = await db.query(
      `INSERT INTO users (username, email, full_name, password_hash, role, address, must_change_password, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, username, email, full_name, role, address, must_change_password, is_active, created_at`,
      [username, email, full_name, hashedPassword, role || 'USER', address || null, false, true],
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    const pwCheck = validatePasswordStrength(new_password);
    if (!pwCheck.valid) {
      return res.status(400).json({
        success: false,
        error: pwCheck.message,
      });
    }

    const result = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = result.rows[0];
    const isPasswordValid = await comparePassword(current_password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    const hashedNewPassword = await bcrypt.hash(new_password, config.bcrypt.saltRounds);

    await db.query(
      'UPDATE users SET password_hash = $1, must_change_password = false, updated_at = NOW() WHERE id = $2',
      [hashedNewPassword, userId],
    );

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const result = await db.query(
      'SELECT id, username, email, full_name, role, address, must_change_password, is_active, created_at, updated_at FROM users WHERE id = $1',
      [req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  register,
  changePassword,
  getMe,
  loginValidation,
  registerValidation,
  changePasswordValidation,
};
