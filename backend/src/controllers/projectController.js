const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
const { validateBoqFile, validateKmzFile, validateKhsFile, generateStoredFilename, getUploadPath } = require('../middlewares/upload');
const { extractProjectInfoFromBoq } = require('../services/boqParser');
const { parseKmz, extractFirstCoordinate } = require('../services/kmzParser');
const { reverseGeocode } = require('../services/geocoding');
const { extractKhsItems } = require('../services/khsParser');
const { compareBoqWithKhs, validateBoqVsKmzLengths } = require('../services/validationEngine');
const fs = require('fs');
const { createNotification } = require('../middlewares/auditLog');

const createProjectValidation = [
  body('project_code').notEmpty().withMessage('Project code is required'),
  body('project_name').notEmpty().withMessage('Project name is required'),
  body('project_type').optional().isString().withMessage('Project type must be a string'),
  body('customer').optional().isString().withMessage('Customer must be a string'),
  body('province').optional().isString().withMessage('Province must be a string'),
  body('city').optional().isString().withMessage('City must be a string'),
  body('address').optional().isString().withMessage('Address must be a string'),
  body('boq_proposed_length').optional().isFloat({ min: 0 }).withMessage('Proposed length must be a positive number'),
];

const listValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('project_type').optional().isString().withMessage('Project type filter invalid'),
  query('review_status').optional().isIn(['PENDING_REVIEW', 'APPROVED', 'REVISION', 'REJECTED']).withMessage('Invalid review status'),
];

async function parseProjectFiles(req, res, next) {
  try {
    const boqFile = req.files?.boq?.[0];
    const kmzFile = req.files?.kmz?.[0];

    const boqCheck = validateBoqFile(boqFile);
    if (!boqCheck.valid) {
      return res.status(400).json({ success: false, error: boqCheck.error });
    }

    const kmzCheck = validateKmzFile(kmzFile);
    if (!kmzCheck.valid) {
      return res.status(400).json({ success: false, error: kmzCheck.error });
    }

    const boqInfo = extractProjectInfoFromBoq(boqFile.path, boqFile.originalname);
    if (boqInfo.error) {
      return res.status(400).json({
        success: false,
        error: `Failed to parse BoQ: ${boqInfo.error}`,
      });
    }

    const kmzResult = await parseKmz(kmzFile.path);
    const firstCoord = await extractFirstCoordinate(kmzFile.path);

    let geoInfo = null;
    try {
      geoInfo = await reverseGeocode(firstCoord.lat, firstCoord.lon);
    } catch (geoError) {
      geoInfo = {
        displayName: null,
        province: null,
        city: null,
        district: null,
        road: null,
        postcode: null,
        country: null,
        countryCode: null,
        lat: firstCoord.lat,
        lon: firstCoord.lon,
        error: geoError.message,
      };
    }

    const extractedData = {
      project_name: boqInfo.projectName,
      customer: boqInfo.customer || null,
      address: boqInfo.address || geoInfo?.displayName || null,
      province: geoInfo?.province || null,
      city: geoInfo?.city || boqInfo.location || null,
      boq_proposed_length: boqInfo.boqProposedLength,
      total_project_value: boqInfo.totalValue,
      kmz_route_length: kmzResult.lineStrings.reduce(
        (sum, ls) => sum + ls.calculated_length,
        0,
      ),
      kmz_objects: kmzResult.objects,
      coordinates: firstCoord,
      geocoding: geoInfo,
    };

    res.json({
      success: true,
      message: 'Files parsed successfully',
      data: extractedData,
    });
  } catch (error) {
    next(error);
  }
}

async function parseKhsFile(req, res, next) {
  try {
    const khsFile = req.files?.khs?.[0];

    const khsCheck = validateKhsFile(khsFile);
    if (!khsCheck.valid) {
      return res.status(400).json({ success: false, error: khsCheck.error });
    }

    const khsInfo = extractKhsItems(khsFile.path);
    if (khsInfo.error) {
      return res.status(400).json({
        success: false,
        error: `Failed to parse KHS: ${khsInfo.error}`,
      });
    }

    const { khsItems, totalItems, materialCount, serviceCount, hasSheetKHS, sheets } = khsInfo;

    const duplicateValidationErrors = khsItems
      .filter((item) => item.is_duplicate)
      .map((item) => ({
        row: item.product_no,
        error: `Duplicate ProductNo: ${item.product_no}`,
      }));

    const categoryValidationErrors = khsItems
      .filter((item) => !['MATERIAL', 'SERVICE'].includes(item.item_category))
      .map((item) => ({
        row: item.product_no,
        error: `Invalid ItemCategory: ${item.item_category}`,
      }));

    const productNoEmpty = khsItems.filter(
      (item) => !item.product_no || item.product_no === '',
    );

    res.json({
      success: true,
      message: 'KHS file parsed successfully',
      data: {
        khsItems,
        totalItems,
        materialCount,
        serviceCount,
        hasSheetKHS,
        sheets,
        valid: khsItems.every((item) => !item.is_duplicate && ['MATERIAL', 'SERVICE'].includes(item.item_category)),
        validationErrors: {
          duplicates: duplicateValidationErrors,
          invalidCategories: categoryValidationErrors,
          emptyProductNos: productNoEmpty,
          hasSheetKHS: !hasSheetKHS,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

async function validateProject(req, res, next) {
  try {
    const boqFile = req.files?.boq?.[0];
    const khsFile = req.files?.khs?.[0];
    const kmzFile = req.files?.kmz?.[0];

    const boqCheck = validateBoqFile(boqFile);
    if (!boqCheck.valid) {
      return res.status(400).json({ success: false, error: boqCheck.error });
    }

    const khsCheck = validateKhsFile(khsFile);
    if (!khsCheck.valid) {
      return res.status(400).json({ success: false, error: khsCheck.error });
    }

    const boqInfo = extractProjectInfoFromBoq(boqFile.path, boqFile.originalname);
    if (boqInfo.error) {
      return res.status(400).json({
        success: false,
        error: `Failed to parse BoQ: ${boqInfo.error}`,
      });
    }

    const khsInfo = extractKhsItems(khsFile.path);
    if (khsInfo.error) {
      return res.status(400).json({
        success: false,
        error: `Failed to parse KHS: ${khsInfo.error}`,
      });
    }

    const comparisonResult = compareBoqWithKhs(boqInfo.boqItems, khsInfo.khsItems);

    let kmzLengthCheck = null;
    if (kmzFile) {
      const kmzCheck = validateKmzFile(kmzFile);
      if (kmzCheck.valid) {
        const kmzResult = await parseKmz(kmzFile.path);
        const kmzTotalLength = kmzResult.objects
          .filter((o) => o.type === 'LINESTRING')
          .reduce((sum, ls) => sum + ls.calculated_length, 0);

        kmzLengthCheck = validateBoqVsKmzLengths(
          boqInfo.boqProposedLength,
          kmzTotalLength,
        );
      }
    }

    res.json({
      success: true,
      message: 'Validation complete',
      data: {
        boq: {
          projectName: boqInfo.projectName,
          totalItems: boqInfo.boqItems.length,
          totalValue: boqInfo.totalValue,
          proposedLength: boqInfo.boqProposedLength,
        },
        khs: {
          totalItems: khsInfo.totalItems,
          materialCount: khsInfo.materialCount,
          serviceCount: khsInfo.serviceCount,
        },
        priceComparisons: comparisonResult.comparisons,
        stats: comparisonResult.stats,
        lengthValidation: kmzLengthCheck,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function createProject(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await cleanupFiles(req);
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.user.id;
    const {
      project_code,
      project_name,
      project_type,
      customer,
      province,
      city,
      address,
      boq_proposed_length,
    } = req.body;

    const existing = await db.query('SELECT id FROM projects WHERE project_code = $1', [project_code]);
    if (existing.rows.length > 0) {
      await cleanupFiles(req);
      return res.status(409).json({
        success: false,
        error: 'Project code already exists',
      });
    }

    const boqFile = req.files?.boq?.[0];
    const kmzFile = req.files?.kmz?.[0];

    const boqCheck = validateBoqFile(boqFile);
    if (!boqCheck.valid) {
      await cleanupFiles(req);
      return res.status(400).json({ success: false, error: boqCheck.error });
    }

    const kmzCheck = validateKmzFile(kmzFile);
    if (!kmzCheck.valid) {
      await cleanupFiles(req);
      return res.status(400).json({ success: false, error: kmzCheck.error });
    }

    const result = await db.query(
      `INSERT INTO projects (
        project_code, project_name, project_type, customer, province, city,
        address, boq_proposed_length, total_project_value, validation_status,
        review_status, created_by, current_khs_version_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        project_code, project_name, project_type || null, customer || null,
        province || null, city || null, address || null,
        boq_proposed_length || null, 0, 'PENDING', 'PENDING_REVIEW', userId, null,
      ],
    );

    const project = result.rows[0];

    const boqStored = generateStoredFilename(boqFile.originalname);
    const kmzStored = generateStoredFilename(kmzFile.originalname);
    const boqPath = getUploadPath(boqStored);
    const kmzPath = getUploadPath(kmzStored);

    fs.copyFileSync(boqFile.path, boqPath);
    fs.copyFileSync(kmzFile.path, kmzPath);

    fs.unlinkSync(boqFile.path);
    fs.unlinkSync(kmzFile.path);

    const boqInfo = extractProjectInfoFromBoq(boqPath, boqFile.originalname);

    if (boqInfo.error) {
      console.warn(`BoQ parsing issue for project ${project.id}: ${boqInfo.error}`);
    }

    if (boqInfo.boqItems && boqInfo.boqItems.length > 0) {
      for (const item of boqInfo.boqItems) {
        await db.query(
          `INSERT INTO project_boq_items
             (project_id, product_no, product_desc, quantity, unit, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            project.id,
            item.product_no,
            item.product_desc,
            item.quantity,
            item.unit,
            item.unit_price,
            item.total_price,
          ],
        );
      }
    }

    if (boqInfo.totalValue && boqInfo.totalValue > 0) {
      await db.query(
        'UPDATE projects SET total_project_value = $1 WHERE id = $2',
        [boqInfo.totalValue, project.id],
      );
    }

    await db.query(
      `INSERT INTO project_files (
        project_id, file_type, original_filename, stored_filename,
        storage_path, mime_type, file_size, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8),
      ($1, $9, $10, $11, $12, $13, $14, $15)`,
      [
        project.id,
        'BOQ', boqFile.originalname, boqStored, boqPath, boqFile.mimetype, boqFile.size, userId,
        'KMZ', kmzFile.originalname, kmzStored, kmzPath, kmzFile.mimetype, kmzFile.size, userId,
      ],
    );

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project,
    });
  } catch (error) {
    await cleanupFiles(req);
    next(error);
  }
}

async function cleanupFiles(req) {
  if (req.files?.boq?.[0]?.path && fs.existsSync(req.files.boq[0].path)) {
    fs.unlinkSync(req.files.boq[0].path);
  }
  if (req.files?.kmz?.[0]?.path && fs.existsSync(req.files.kmz[0].path)) {
    fs.unlinkSync(req.files.kmz[0].path);
  }
}

async function getProject(req, res, next) {
  try {
    const result = await db.query(
      `SELECT p.*, u.username as creator
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = $1`,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const project = result.rows[0];

    if (req.user.role !== 'ADMIN' && project.created_by !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const filesResult = await db.query(
      'SELECT id, file_type, original_filename, mime_type, file_size, created_at FROM project_files WHERE project_id = $1',
      [req.params.id],
    );

    res.json({
      success: true,
      project,
      files: filesResult.rows,
    });
  } catch (error) {
    next(error);
  }
}

const reviewValidation = [
  body('review_status').isIn(['APPROVED', 'REVISION', 'REJECTED']).withMessage('Invalid review status'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
];

async function reviewProject(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Only admins can review projects' });
    }

    const { review_status, notes } = req.body;

    const projectResult = await db.query(
      'SELECT id, project_code, project_name, review_status FROM projects WHERE id = $1',
      [req.params.id],
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const project = projectResult.rows[0];

    if (project.review_status === 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: 'Project already approved',
      });
    }

    await db.query(
      'UPDATE projects SET review_status = $1, updated_at = NOW() WHERE id = $2',
      [review_status, req.params.id],
    );

    if (review_status === 'APPROVED') {
      await db.query(
        'UPDATE projects SET validation_status = $1 WHERE id = $2',
        ['VALIDATED', req.params.id],
      );
    }

    if (notes) {
      await db.query(
        'INSERT INTO project_reviews (project_id, admin_id, action, comment) VALUES ($1, $2, $3, $4)',
        [req.params.id, req.user.id, review_status === 'APPROVED' ? 'APPROVE' : review_status === 'REJECTED' ? 'REJECT' : 'REQUEST_REVISION', notes],
      );
    }

    await createNotification(
      project.created_by,
      'PROJECT_REVIEW',
      `Project ${review_status === 'APPROVED' ? 'Approved' : review_status === 'REJECTED' ? 'Rejected' : 'Requested Revision'}`,
      notes || `Your project "${project.project_name}" has been ${review_status === 'APPROVED' ? 'approved' : review_status === 'REJECTED' ? 'rejected' : 'requested for revision'}.`,
      'PROJECT',
      req.params.id,
    );

    const updatedProject = await db.query(
      'SELECT p.*, u.username as creator FROM projects p LEFT JOIN users u ON p.created_by = u.id WHERE p.id = $1',
      [req.params.id],
    );

    res.json({
      success: true,
      message: `Project ${review_status.toLowerCase()} successfully`,
      project: updatedProject.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

async function listProjects(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const offset = (page - 1) * limit;

    const isUser = req.user.role !== 'ADMIN';
    const whereClauses = [];
    const values = [];
    let paramCount = 1;

    if (isUser) {
      whereClauses.push(`p.created_by = $${paramCount}`);
      values.push(req.user.id);
      paramCount += 1;
    }

    if (req.query.project_type) {
      whereClauses.push(`p.project_type = $${paramCount}`);
      values.push(req.query.project_type);
      paramCount += 1;
    }

    if (req.query.review_status) {
      whereClauses.push(`p.review_status = $${paramCount}`);
      values.push(req.query.review_status);
      paramCount += 1;
    }

    if (req.query.search) {
      whereClauses.push(`(p.project_code ILIKE $${paramCount} OR p.project_name ILIKE $${paramCount} OR p.customer ILIKE $${paramCount})`);
      values.push(`%${req.query.search}%`);
      paramCount += 1;
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countResult = await db.query(`SELECT COUNT(*) FROM projects p ${whereSQL}`, values);
    const total = parseInt(countResult.rows[0].count, 10);

    values.push(limit, offset);
    const result = await db.query(
      `SELECT p.id, p.project_code, p.project_name, p.project_type, p.customer,
              p.province, p.city, p.boq_proposed_length, p.kmz_selected_length,
              p.total_project_value, p.validation_status, p.review_status,
              p.created_at, p.updated_at, u.username as creator
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       ${whereSQL}
       ORDER BY p.created_at DESC
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

async function listProjectTypes(req, res, next) {
  try {
    const result = await db.query(
      'SELECT code, name, description FROM project_types WHERE is_active = true ORDER BY name',
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
}

async function downloadFile(req, res, next) {
  try {
    const result = await db.query(
      'SELECT * FROM project_files WHERE project_id = $1 AND id = $2',
      [req.params.id, req.params.fileId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    const file = result.rows[0];
    const filePath = getUploadPath(file.stored_filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found on disk' });
    }

    res.download(filePath, file.original_filename);
  } catch (error) {
    next(error);
  }
}

async function getKmzGeometry(req, res, next) {
  try {

    const result = await db.query(
      'SELECT id, file_type, original_filename, stored_filename, storage_path FROM project_files WHERE project_id = $1 AND file_type = $2',
      [req.params.id, 'KMZ'],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No KMZ file found for this project' });
    }

    const kmzFile = result.rows[0];
    const filePath = getUploadPath(kmzFile.stored_filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'KMZ file not found on disk' });
    }

    const kmzResult = await parseKmz(filePath);

    res.json({
      success: true,
      objects: kmzResult.objects,
      totalObjects: kmzResult.totalObjects,
    });
  } catch (error) {
    next(error);
  }
}

async function getProjectBoqItems(req, res, next) {
  try {
    const result = await db.query(
      'SELECT id, product_no, product_desc, quantity, unit, unit_price, total_price FROM project_boq_items WHERE project_id = $1 ORDER BY product_no',
      [req.params.id],
    );

    const totalValue = result.rows.reduce(
      (sum, item) => sum + parseFloat(item.total_price || 0),
      0,
    );

    res.json({
      success: true,
      data: result.rows,
      summary: {
        totalItems: result.rows.length,
        totalValue: parseFloat(totalValue.toFixed(2)),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getProjectKmzLength(req, res, next) {
  try {
    const [projectResult, kmzFileResult] = await Promise.all([
      db.query('SELECT boq_proposed_length, kmz_selected_length, total_project_value FROM projects WHERE id = $1', [req.params.id]),
      db.query(
        'SELECT stored_filename FROM project_files WHERE project_id = $1 AND file_type = $2',
        [req.params.id, 'KMZ'],
      ),
    ]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const project = projectResult.rows[0];
    const proposedLength = project.boq_proposed_length;

    if (kmzFileResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No KMZ file found for this project' });
    }

    const kmzFilePath = getUploadPath(kmzFileResult.rows[0].stored_filename);
    if (!fs.existsSync(kmzFilePath)) {
      return res.status(404).json({ success: false, error: 'KMZ file not found on disk' });
    }

    const kmzResult = await parseKmz(kmzFilePath);
    const routeObjects = kmzResult.objects.filter((o) => o.type === 'LINESTRING');

    let totalRouteLength = 0;
    const routes = [];

    for (const obj of routeObjects) {
      const routeLength = obj.calculated_length || 0;
      totalRouteLength += routeLength;

      const classification = obj.route_classification || 'UNKNOWN';
      routes.push({
        name: obj.name,
        classification,
        length: routeLength,
      });
    }

    let lengthDifference = null;
    let lengthDifferencePercentage = null;
    let withinTolerance = null;

    if (proposedLength && totalRouteLength > 0) {
      lengthDifference = Math.abs(parseFloat(proposedLength) - totalRouteLength);
      lengthDifferencePercentage = (lengthDifference / parseFloat(proposedLength)) * 100;
      withinTolerance = lengthDifferencePercentage <= 5;
    }

    res.json({
      success: true,
      data: {
        totalRouteLength: parseFloat(totalRouteLength.toFixed(2)),
        routeCount: routeObjects.length,
        routes,
        proposedLength: proposedLength || null,
        lengthDifference: lengthDifference ? parseFloat(lengthDifference.toFixed(2)) : null,
        lengthDifferencePercentage: lengthDifferencePercentage ? parseFloat(lengthDifferencePercentage.toFixed(2)) : null,
        withinTolerance,
        storedKmzLength: project.kmz_selected_length || null,
        totalProjectValue: project.total_project_value || null,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getApprovedProjectsForGeomap(req, res, next) {
  try {
    const projectsResult = await db.query(
      `SELECT p.id, p.project_code, p.project_name, p.project_type, p.province, p.city,
              p.total_project_value, p.validation_status, p.review_status,
              p.created_at, p.updated_at
       FROM projects p
       WHERE p.review_status = 'APPROVED'
       ORDER BY p.created_at DESC`,
    );

    const projects = await Promise.all(
      projectsResult.rows.map(async (p) => {
        let latitude = null;
        let longitude = null;

        const kmzFileResult = await db.query(
          'SELECT stored_filename FROM project_files WHERE project_id = $1 AND file_type = $2',
          [p.id, 'KMZ'],
        );

        if (kmzFileResult.rows.length > 0) {
          const kmzFilePath = getUploadPath(kmzFileResult.rows[0].stored_filename);
          if (fs.existsSync(kmzFilePath)) {
            try {
              const kmzResult = await parseKmz(kmzFilePath);
              if (kmzResult.objects.length > 0) {
                const pointObj = kmzResult.objects.find(
                  (o) => o.type === 'POINT' && o.coordinates?.[0],
                );
                const firstObj = kmzResult.objects.find(
                  (o) => o.coordinates?.[0],
                );
                const coord = pointObj || firstObj;
                if (coord) {
                  latitude = coord.coordinates[0].lat;
                  longitude = coord.coordinates[0].lon;
                }
              }
            } catch (e) {
              console.warn(`Failed to parse KMZ for project ${p.id}:`, e.message);
            }
          }
        }

        return {
          id: p.id,
          project_code: p.project_code,
          project_name: p.project_name,
          project_type: p.project_type,
          province: p.province,
          city: p.city,
          total_project_value: p.total_project_value,
          validation_status: p.validation_status,
          review_status: p.review_status,
          latitude,
          longitude,
          created_at: p.created_at,
          updated_at: p.updated_at,
        };
      }),
    );

    const validProjects = projects.filter((p) => p.latitude && p.longitude);

    res.json({
      success: true,
      data: validProjects,
    });
  } catch (error) {
    next(error);
  }
}

async function getKhsComparison(req, res, next) {
  try {
    const boqItemsResult = await db.query(
      'SELECT product_no, product_desc, quantity, unit_price, total_price FROM project_boq_items WHERE project_id = $1 ORDER BY product_no',
      [req.params.id],
    );

    if (boqItemsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No BoQ items found for this project',
      });
    }

    const khsItemsResult = await db.query(
      "SELECT product_no, item_category, product_desc, item_price FROM khs_items WHERE is_active = true",
    );

    const comparisonResult = compareBoqWithKhs(
      boqItemsResult.rows,
      khsItemsResult.rows,
    );

    res.json({
      success: true,
      data: {
        comparisons: comparisonResult.comparisons,
        stats: comparisonResult.stats,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
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
  createProject,
  getProject,
  listProjects,
  listProjectTypes,
  downloadFile,
  createProjectValidation,
  listValidation,
};
