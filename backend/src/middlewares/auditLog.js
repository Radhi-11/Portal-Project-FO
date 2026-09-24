const db = require('../config/database');

function logAction(action, entityType) {
  return async (req, res, next) => {
    const originalSend = res.send;

    res.send = function (body) {
      const userId = req.user?.id || null;
      const userUsername = req.user?.username || null;

      (async () => {
        try {
          if (entityType === 'PROJECT' && req.params?.id) {
            const entityId = parseInt(req.params.id, 10);
            const newValues = req.method === 'POST' || req.method === 'PUT' ? body : null;
            await db.query(
              `INSERT INTO audit_logs
                (user_id, user_username, action, entity_type, entity_id, new_values, ip_address, user_agent)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                userId,
                userUsername,
                action,
                entityType,
                entityId,
                newValues,
                req.ip,
                req.get('User-Agent'),
              ],
            );
          } else if (entityType === 'KHS') {
            const entityId = req.params?.id ? parseInt(req.params.id, 10) : null;
            await db.query(
              `INSERT INTO audit_logs
                (user_id, user_username, action, entity_type, entity_id, new_values, ip_address, user_agent)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                userId,
                userUsername,
                action,
                entityType,
                entityId,
                req.method === 'POST' || req.method === 'PUT' ? body : null,
                req.ip,
                req.get('User-Agent'),
              ],
            );
          } else if (entityType === 'USER') {
            const entityId = req.params?.id ? parseInt(req.params.id, 10) : null;
            await db.query(
              `INSERT INTO audit_logs
                (user_id, user_username, action, entity_type, entity_id, new_values, ip_address, user_agent)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                userId,
                userUsername,
                action,
                entityType,
                entityId,
                req.method === 'POST' || req.method === 'PUT' ? body : null,
                req.ip,
                req.get('User-Agent'),
              ],
            );
          } else {
            await db.query(
              `INSERT INTO audit_logs
                (user_id, user_username, action, entity_type, entity_id, new_values, ip_address, user_agent)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                userId,
                userUsername,
                action,
                entityType,
                null,
                req.method === 'POST' || req.method === 'PUT' ? body : null,
                req.ip,
                req.get('User-Agent'),
              ],
            );
          }
        } catch (err) {
          console.error('Audit log error:', err.message);
        }
      })();

      return originalSend.call(this, body);
    };

    next();
  };
}

async function createNotification(userId, type, title, message, entityType, entityId) {
  try {
    await db.query(
      `INSERT INTO notifications
        (user_id, type, title, message, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, type, title, message, entityType, entityId],
    );
  } catch (err) {
    console.error('Notification creation error:', err.message);
  }
}

async function getNotifications(userId, limit = 20) {
  try {
    const result = await db.query(
      `SELECT id, type, title, message, entity_type, entity_id, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit],
    );
    return result.rows;
  } catch (err) {
    console.error('Get notifications error:', err.message);
    return [];
  }
}

async function getUnreadNotificationCount(userId) {
  try {
    const result = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId],
    );
    return parseInt(result.rows[0].count, 10);
  } catch (err) {
    console.error('Unread count error:', err.message);
    return 0;
  }
}

async function markNotificationsRead(userId) {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [userId],
    );
  } catch (err) {
    console.error('Mark notifications read error:', err.message);
  }
}

async function getAuditLogs(filters = {}) {
  try {
    const values = [];
    const conditions = [];
    let paramCount = 1;

    if (filters.userId) {
      conditions.push(`user_id = $${paramCount}`);
      values.push(filters.userId);
      paramCount += 1;
    }

    if (filters.entityType) {
      conditions.push(`entity_type = $${paramCount}`);
      values.push(filters.entityType);
      paramCount += 1;
    }

    if (filters.action) {
      conditions.push(`action = $${paramCount}`);
      values.push(filters.action);
      paramCount += 1;
    }

    if (filters.entityId) {
      conditions.push(`entity_id = $${paramCount}`);
      values.push(filters.entityId);
      paramCount += 1;
    }

    if (filters.dateFrom) {
      conditions.push(`created_at >= $${paramCount}`);
      values.push(filters.dateFrom);
      paramCount += 1;
    }

    if (filters.dateTo) {
      conditions.push(`created_at <= $${paramCount}`);
      values.push(filters.dateTo);
      paramCount += 1;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 50;
    values.push(limit);

    const result = await db.query(
      `SELECT al.id, al.user_id, al.user_username, al.action, al.entity_type, al.entity_id,
              al.old_values, al.new_values, al.ip_address, al.user_agent, al.created_at,
              u.full_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramCount}`,
      values,
    );

    return result.rows;
  } catch (err) {
    console.error('Get audit logs error:', err.message);
    return [];
  }
}

module.exports = {
  logAction,
  createNotification,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationsRead,
  getAuditLogs,
};
