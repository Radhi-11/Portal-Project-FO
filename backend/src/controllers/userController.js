const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
const bcrypt = require('bcrypt');
const config = require('../config');
const { validatePasswordStrength } = require('../utils/password');

const updateValidation = [
  body('full_name').optional().notEmpty().withMessage('Full name is required'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['ADMIN', 'USER']).withMessage('Invalid role'),
  body('address').optional().isString().withMessage('Address must be a string'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
  body('must_change_password').optional().isBoolean().withMessage('must_change_password must be boolean'),
];

const setPasswordValidation = [
  body('password').notEmpty().withMessage('Password is required'),
];

const listValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role').optional().isIn(['ADMIN', 'USER']).withMessage('Invalid role filter'),
  query('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
];

async function listUsers(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const offset = (page - 1) * limit;

    const whereClauses = [];
    const values = [];
    let paramCount = 1;

    if (req.query.role) {
      whereClauses.push(`role = $${paramCount}`);
      values.push(req.query.role);
      paramCount += 1;
    }
    if (req.query.is_active === 'true' || req.query.is_active === 'false') {
      whereClauses.push(`is_active = $${paramCount}`);
      values.push(req.query.is_active === 'true');
      paramCount += 1;
    }
    if (req.query.search) {
      whereClauses.push(`(username ILIKE $${paramCount} OR email ILIKE $${paramCount} OR full_name ILIKE $${paramCount})`);
      values.push(`%${req.query.search}%`);
      paramCount += 1;
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countResult = await db.query(`SELECT COUNT(*) FROM users ${whereSQL}`, values);
    const total = parseInt(countResult.rows[0].count, 10);

    values.push(limit, offset);
    const result = await db.query(
      `SELECT id, username, email, full_name, role, address, is_active, must_change_password, created_at, updated_at
       FROM users ${whereSQL}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      values,
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getUser(req, res, next) {
  try {
    const result = await db.query(
      'SELECT id, username, email, full_name, role, address, is_active, must_change_password, created_at, updated_at FROM users WHERE id = $1',
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { full_name, email, role, address, is_active, must_change_password } = req.body;

    const existing = await db.query('SELECT id FROM users WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (email) {
      const dup = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, req.params.id]);
      if (dup.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'Email already in use' });
      }
    }

    const fields = [];
    const values = [];
    let paramCount = 1;

    if (full_name !== undefined) {
      fields.push(`full_name = $${paramCount}`);
      values.push(full_name);
      paramCount += 1;
    }
    if (email !== undefined) {
      fields.push(`email = $${paramCount}`);
      values.push(email);
      paramCount += 1;
    }
    if (role !== undefined) {
      fields.push(`role = $${paramCount}`);
      values.push(role);
      paramCount += 1;
    }
    if (address !== undefined) {
      fields.push(`address = $${paramCount}`);
      values.push(address);
      paramCount += 1;
    }
    if (is_active !== undefined) {
      fields.push(`is_active = $${paramCount}`);
      values.push(is_active);
      paramCount += 1;
    }
    if (must_change_password !== undefined) {
      fields.push(`must_change_password = $${paramCount}`);
      values.push(must_change_password);
      paramCount += 1;
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(req.params.id);

    await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING id, username, email, full_name, role, address, is_active, must_change_password, updated_at`,
      values,
    );

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const existing = await db.query('SELECT id FROM users WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (parseInt(req.params.id, 10) === req.user.id) {
      return res.status(400).json({ success: false, error: 'You cannot delete your own account' });
    }

    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
}

async function setUserPassword(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { password } = req.body;

    const pwCheck = validatePasswordStrength(password);
    if (!pwCheck.valid) {
      return res.status(400).json({ success: false, error: pwCheck.message });
    }

    const existing = await db.query('SELECT id FROM users WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(password, config.bcrypt.saltRounds);

    await db.query(
      'UPDATE users SET password_hash = $1, must_change_password = false, updated_at = NOW() WHERE id = $2',
      [hashedPassword, req.params.id],
    );

    res.json({ success: true, message: 'Password set successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  setUserPassword,
  listValidation,
  updateValidation,
  setPasswordValidation,
};
