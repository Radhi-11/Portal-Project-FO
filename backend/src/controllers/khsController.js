const { body, validationResult, query, param } = require('express-validator');
const db = require('../config/database');
const { extractKhsItems } = require('../services/khsParser');
const { validateKhsFile, getUploadPath } = require('../middlewares/upload');
const fs = require('fs');
const path = require('path');

const listValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('search').optional().isString(),
  query('item_category').optional().isString(),
  query('is_active').optional().isBoolean(),
];

const createValidation = [
  body('item_category').notEmpty().withMessage('Category is required'),
  body('product_no').notEmpty().withMessage('Product No is required'),
  body('product_desc').notEmpty().withMessage('Product Description is required'),
  body('item_price').isFloat({ min: 0 }).withMessage('Item Price must be a positive number'),
];

const updateValidation = [
  param('id').isInt().withMessage('Item ID must be an integer'),
  body('item_category').optional().notEmpty().withMessage('Category is required'),
  body('product_no').optional().notEmpty().withMessage('Product No is required'),
  body('product_desc').optional().notEmpty().withMessage('Product Description is required'),
  body('item_price').optional().isFloat({ min: 0 }).withMessage('Item Price must be a positive number'),
];

const idValidation = [
  param('id').isInt().withMessage('Item ID must be an integer'),
];

async function listKhsItems(req, res, next) {
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

    if (req.query.search) {
      whereClauses.push(
        `(product_no ILIKE $${paramCount} OR product_desc ILIKE $${paramCount})`,
      );
      values.push(`%${req.query.search}%`);
      paramCount += 1;
    }

    if (req.query.item_category) {
      whereClauses.push(`item_category = $${paramCount}`);
      values.push(req.query.item_category);
      paramCount += 1;
    }

    if (req.query.is_active !== undefined && req.query.is_active !== '') {
      whereClauses.push(`is_active = $${paramCount}`);
      values.push(req.query.is_active === 'true');
      paramCount += 1;
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countResult = await db.query(
      `SELECT COUNT(*) FROM khs_items ${whereSQL}`,
      values,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    values.push(limit, offset);
    const result = await db.query(
      `SELECT id, item_category, product_no, product_desc, item_price,
              is_active, created_at, updated_at
       FROM khs_items
       ${whereSQL}
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

async function getKhsItem(req, res, next) {
  try {
    const result = await db.query('SELECT * FROM khs_items WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'KHS item not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

async function createKhsItem(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { item_category, product_no, product_desc, item_price } = req.body;

    const existing = await db.query(
      'SELECT id FROM khs_items WHERE product_no = $1',
      [product_no],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Product No already exists',
      });
    }

    const result = await db.query(
      `INSERT INTO khs_items
         (item_category, product_no, product_desc, item_price, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [item_category, product_no, product_desc, parseFloat(item_price), req.user.id],
    );

    res.status(201).json({
      success: true,
      message: 'KHS item created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

async function updateKhsItem(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { item_category, product_no, product_desc, item_price, is_active } = req.body;

    if (product_no) {
      const existing = await db.query(
        'SELECT id FROM khs_items WHERE product_no = $1 AND id != $2',
        [product_no, req.params.id],
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Product No already exists',
        });
      }
    }

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (item_category !== undefined) {
      updateFields.push(`item_category = $${paramCount}`);
      updateValues.push(item_category);
      paramCount += 1;
    }
    if (product_no !== undefined) {
      updateFields.push(`product_no = $${paramCount}`);
      updateValues.push(product_no);
      paramCount += 1;
    }
    if (product_desc !== undefined) {
      updateFields.push(`product_desc = $${paramCount}`);
      updateValues.push(product_desc);
      paramCount += 1;
    }
    if (item_price !== undefined) {
      updateFields.push(`item_price = $${paramCount}`);
      updateValues.push(parseFloat(item_price));
      paramCount += 1;
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount}`);
      updateValues.push(is_active);
      paramCount += 1;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(req.params.id);

    const result = await db.query(
      `UPDATE khs_items SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      updateValues,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'KHS item not found' });
    }

    res.json({
      success: true,
      message: 'KHS item updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

async function deleteKhsItem(req, res, next) {
  try {
    const result = await db.query(
      'UPDATE khs_items SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id',
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'KHS item not found' });
    }

    res.json({
      success: true,
      message: 'KHS item deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function getKhsStats(req, res, next) {
  try {
    const totalResult = await db.query('SELECT COUNT(*) as count FROM khs_items WHERE is_active = true');
    const materialResult = await db.query(
      "SELECT COUNT(*) as count FROM khs_items WHERE item_category = 'MATERIAL' AND is_active = true",
    );
    const serviceResult = await db.query(
      "SELECT COUNT(*) as count FROM khs_items WHERE item_category = 'SERVICE' AND is_active = true",
    );
    const valueResult = await db.query(
      'SELECT COALESCE(SUM(item_price), 0) as value FROM khs_items WHERE is_active = true',
    );

    res.json({
      success: true,
      data: {
        total_items: parseInt(totalResult.rows[0].count, 10),
        material_count: parseInt(materialResult.rows[0].count, 10),
        service_count: parseInt(serviceResult.rows[0].count, 10),
        total_value: parseFloat(valueResult.rows[0].value),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function importKhsExcel(req, res, next) {
  try {
    const file = req.files?.khs?.[0];
    if (!file) {
      return res.status(400).json({ success: false, error: 'KHS file is required' });
    }

    const khsCheck = validateKhsFile(file);
    if (!khsCheck.valid) {
      return res.status(400).json({ success: false, error: khsCheck.error });
    }

    const khsInfo = extractKhsItems(file.path);

    if (khsInfo.error) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        error: `Failed to parse KHS: ${khsInfo.error}`,
      });
    }

    const { khsItems } = khsInfo;
    if (khsItems.length === 0) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        error: 'No KHS items found in file',
      });
    }

    const newItems = [];
    const duplicateItems = [];
    const invalidItems = [];

    const existingNos = new Set(
      (await db.query('SELECT product_no FROM khs_items')).rows.map(
        (r) => r.product_no,
      ),
    );

    for (let i = 0; i < khsItems.length; i++) {
      const item = khsItems[i];
      const rowNumber = i + 2;

      if (item.is_duplicate) {
        duplicateItems.push({
          row: rowNumber,
          product_no: item.product_no,
          reason: 'Duplicate in file',
        });
        continue;
      }

      if (!item.product_no || !item.item_category || !item.product_desc || isNaN(item.item_price)) {
        invalidItems.push({
          row: rowNumber,
          product_no: item.product_no,
          reason: 'Missing required field or invalid price',
        });
        continue;
      }

      if (existingNos.has(item.product_no)) {
        duplicateItems.push({
          row: rowNumber,
          product_no: item.product_no,
          reason: 'ProductNo already exists in database',
        });
        continue;
      }

      newItems.push({
        item_category: item.item_category,
        product_no: item.product_no,
        product_desc: item.product_desc,
        item_price: item.item_price,
      });
    }

    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    const insertedItems = [];
    for (const item of newItems) {
      try {
        const result = await db.query(
          `INSERT INTO khs_items
             (item_category, product_no, product_desc, item_price, created_by)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [item.item_category, item.product_no, item.product_desc, item.item_price, req.user.id],
        );
        insertedItems.push(result.rows[0]);
      } catch (e) {
        invalidItems.push({
          product_no: item.product_no,
          reason: e.message,
        });
      }
    }

    res.json({
      success: true,
      message: 'KHS import complete',
      data: {
        total_rows: khsItems.length,
        imported: insertedItems.length,
        skipped_duplicate: duplicateItems.length,
        failed: invalidItems.length,
        duplicates: duplicateItems,
        invalid: invalidItems,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
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
};
