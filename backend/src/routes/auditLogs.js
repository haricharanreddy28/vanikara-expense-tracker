const express = require('express');
const router = express.Router();
const { all, get } = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const logs = await all(`
      SELECT al.*, u.name as user_name FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.timestamp DESC LIMIT ? OFFSET ?
    `, [limit, offset]);

    const { cnt: total } = await get('SELECT COUNT(*) as cnt FROM audit_logs');

    res.json({
      logs: logs.map((l) => ({ ...l, details: JSON.parse(l.details) })),
      total, page, pages: Math.ceil(total / limit),
    });
  } catch (err) { next(err); }
});

module.exports = router;
