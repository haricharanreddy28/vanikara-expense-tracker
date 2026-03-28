const express = require('express');
const router = express.Router();
const { all, get, run } = require('../db');
const auth = require('../middleware/auth');

// GET /api/audit-logs
router.get('/', auth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      all(`
        SELECT al.*, u.name as user_name
        FROM audit_logs al
        LEFT JOIN users u ON u.id = al.user_id
        ORDER BY al.timestamp DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      get('SELECT COUNT(*) as cnt FROM audit_logs'),
    ]);

    res.json({
      logs: logs.map(l => ({
        ...l,
        details: typeof l.details === 'string' ? JSON.parse(l.details) : l.details,
      })),
      total: parseInt(total.cnt || 0),
      page,
      pages: Math.ceil(parseInt(total.cnt || 0) / limit),
    });
  } catch (err) { next(err); }
});

module.exports = router;
