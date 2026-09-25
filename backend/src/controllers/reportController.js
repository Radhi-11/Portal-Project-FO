const { query } = require('express-validator');
const db = require('../config/database');

const reportsValidation = [
  query('province').optional().isString(),
  query('city').optional().isString(),
  query('project_type').optional().isString(),
  query('review_status').optional().isString(),
  query('year').optional().isInt({ min: 2000, max: 2100 }),
  query('month').optional().isInt({ min: 1, max: 12 }),
];

async function getProjectReports(req, res, next) {
  try {
    const {
      province,
      city,
      project_type,
      review_status,
      year,
      month,
    } = req.query;

    const whereClauses = [];
    const values = [];
    let paramCount = 1;

    if (province) {
      whereClauses.push(`province = $${paramCount}`);
      values.push(province);
      paramCount += 1;
    }

    if (city) {
      whereClauses.push(`city = $${paramCount}`);
      values.push(city);
      paramCount += 1;
    }

    if (project_type) {
      whereClauses.push(`project_type = $${paramCount}`);
      values.push(project_type);
      paramCount += 1;
    }

    if (review_status) {
      whereClauses.push(`review_status = $${paramCount}`);
      values.push(review_status);
      paramCount += 1;
    }

    if (year) {
      whereClauses.push(`EXTRACT(YEAR FROM created_at) = $${paramCount}`);
      values.push(parseInt(year, 10));
      paramCount += 1;
    }

    if (month) {
      whereClauses.push(`EXTRACT(MONTH FROM created_at) = $${paramCount}`);
      values.push(parseInt(month, 10));
      paramCount += 1;
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const totalProjectsResult = await db.query(
      `SELECT COUNT(*) as count FROM projects ${whereSQL}`,
      values,
    );
    const totalProjects = parseInt(totalProjectsResult.rows[0].count, 10);

    const totalValueResult = await db.query(
      `SELECT COALESCE(SUM(total_project_value), 0) as sum FROM projects ${whereSQL}`,
      values,
    );
    const totalValue = parseFloat(totalValueResult.rows[0].sum);

    const statusDistributionResult = await db.query(
      `SELECT review_status, COUNT(*) as count
       FROM projects
       ${whereSQL}
       GROUP BY review_status
       ORDER BY count DESC`,
      values,
    );
    const statusDistribution = statusDistributionResult.rows.map((r) => ({
      status: r.review_status,
      count: parseInt(r.count, 10),
    }));

    const provinceDistributionResult = await db.query(
      `SELECT province, COUNT(*) as count, COALESCE(SUM(total_project_value), 0) as total_value
        FROM projects
        ${whereSQL}
        GROUP BY province
        ORDER BY count DESC`,
      values,
    );
    const provinceDistribution = provinceDistributionResult.rows.map((r) => ({
      province: r.province || 'Unknown',
      count: parseInt(r.count, 10),
      total_value: parseFloat(r.total_value),
    }));

    const cityDistributionResult = await db.query(
      `SELECT city, COUNT(*) as count, COALESCE(SUM(total_project_value), 0) as total_value
        FROM projects
        ${whereSQL}
        GROUP BY city
        ORDER BY count DESC`,
      values,
    );
    const cityDistribution = cityDistributionResult.rows.map((r) => ({
      city: r.city || 'Unknown',
      count: parseInt(r.count, 10),
      total_value: parseFloat(r.total_value),
    }));

    const monthlyTrendResult = await db.query(
      `SELECT
         EXTRACT(YEAR FROM created_at) as year,
         EXTRACT(MONTH FROM created_at) as month,
         COUNT(*) as count,
         COALESCE(SUM(total_project_value), 0) as total_value
       FROM projects
       ${whereSQL}
       GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
       ORDER BY year DESC, month DESC`,
      values,
    );
    const monthlyTrend = monthlyTrendResult.rows.map((r) => ({
      year: parseInt(r.year, 10),
      month: parseInt(r.month, 10),
      count: parseInt(r.count, 10),
      total_value: parseFloat(r.total_value),
    }));

    const projectsResult = await db.query(
      `SELECT p.id, p.project_name, p.project_type,
              p.province, p.city, p.boq_proposed_length,
              p.kmz_selected_length, p.total_project_value, p.validation_status,
              p.review_status, p.created_at, u.username as creator
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       ${whereSQL}
       ORDER BY p.created_at DESC`,
      values,
    );

    const uniqueProvinces = await db.query(
      `SELECT DISTINCT province FROM projects WHERE province IS NOT NULL ORDER BY province`,
    );
    const uniqueCities = await db.query(
      `SELECT DISTINCT city FROM projects WHERE city IS NOT NULL ORDER BY city`,
    );
    const uniqueTypes = await db.query(
      `SELECT DISTINCT project_type FROM projects WHERE project_type IS NOT NULL ORDER BY project_type`,
    );

    res.json({
      success: true,
      data: {
        summary: {
          total_projects: totalProjects,
          total_value: totalValue,
          provinces_count: provinceDistribution.length,
          cities_count: cityDistribution.length,
        },
        status_distribution: statusDistribution,
        province_distribution: provinceDistribution,
        city_distribution: cityDistribution,
        monthly_trend: monthlyTrend,
        projects: projectsResult.rows,
        filters: {
          provinces: uniqueProvinces.rows.map((r) => r.province),
          cities: uniqueCities.rows.map((r) => r.city),
          project_types: uniqueTypes.rows.map((r) => r.project_type),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  reportsValidation,
  getProjectReports,
};
