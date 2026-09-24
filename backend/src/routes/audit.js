const express = require('express');
const { getAuditLogs, getNotifications, getUnreadNotificationCount, markNotificationsRead } = require('../middlewares/auditLog');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

router.get('/audit-logs', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const filters = {
      userId: req.query.userId ? parseInt(req.query.userId, 10) : null,
      entityType: req.query.entity_type,
      action: req.query.action,
      entityId: req.query.entity_id ? parseInt(req.query.entity_id, 10) : null,
      dateFrom: req.query.date_from,
      dateTo: req.query.date_to,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
    };

    const logs = await getAuditLogs(filters);

    res.json({
      success: true,
      data: logs,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/notifications', authenticate, async (req, res, next) => {
  try {
    const notifications = await getNotifications(req.user.id);
    res.json({
      success: true,
      data: notifications,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/notifications/unread-count', authenticate, async (req, res, next) => {
  try {
    const count = await getUnreadNotificationCount(req.user.id);
    res.json({
      success: true,
      count,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/notifications/read', authenticate, async (req, res, next) => {
  try {
    await markNotificationsRead(req.user.id);
    res.json({
      success: true,
      message: 'Notifications marked as read',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
