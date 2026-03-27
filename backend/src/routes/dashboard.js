const express = require('express');
const router = express.Router();
const { get, all } = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res, next) => {
  try {
    const totals = await get(`
      SELECT
        COUNT(DISTINCT e.id) AS total_expenses,
        COALESCE(SUM(e.amount), 0) AS total_amount,
        COALESCE(SUM(CASE WHEN es.payment_status = 'Paid' THEN es.amount ELSE 0 END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN es.payment_status = 'Pending' THEN es.amount ELSE 0 END), 0) AS total_pending
      FROM expenses e
      LEFT JOIN expense_splits es ON es.expense_id = e.id
    `);

    const perDirector = await all(`
      SELECT
        u.id, u.name, u.email, u.share_percentage,
        COALESCE(SUM(es.amount), 0) AS total_owed,
        COALESCE(SUM(CASE WHEN es.payment_status = 'Paid' THEN es.amount ELSE 0 END), 0) AS paid,
        COALESCE(SUM(CASE WHEN es.payment_status = 'Pending' THEN es.amount ELSE 0 END), 0) AS pending
      FROM users u
      LEFT JOIN expense_splits es ON es.user_id = u.id
      GROUP BY u.id
    `);

    res.json({ totals, perDirector });
  } catch (err) { next(err); }
});

module.exports = router;
