const express = require('express');
const router = express.Router();
const { get, all } = require('../db');
const auth = require('../middleware/auth');

// GET /api/dashboard
router.get('/', auth, async (req, res, next) => {
  try {
    const expenses = await all(`
      SELECT e.amount, es.user_id, es.amount as split_amount, es.payment_status, u.name
      FROM expenses e
      JOIN expense_splits es ON es.expense_id = e.id
      JOIN users u ON u.id = es.user_id
    `);

    const totalExpenses = await get('SELECT COUNT(*) as cnt, COALESCE(SUM(amount),0) as total FROM expenses');

    const directors = await all('SELECT id, name, share_percentage FROM users ORDER BY id');
    const breakdown = directors.map(d => {
      const rows = expenses.filter(r => r.user_id === d.id);
      const totalOwed = rows.reduce((s, r) => s + parseFloat(r.split_amount), 0);
      const totalPaid = rows.filter(r => r.payment_status === 'Paid').reduce((s, r) => s + parseFloat(r.split_amount), 0);
      return { id: d.id, name: d.name, share_percentage: d.share_percentage, totalOwed, totalPaid, totalPending: totalOwed - totalPaid };
    });

    const allSplits = expenses;
    const totalPaid = allSplits.filter(r => r.payment_status === 'Paid').reduce((s, r) => s + parseFloat(r.split_amount), 0);
    const totalAmount = parseFloat(totalExpenses.total || 0);

    res.json({
      totalExpenses: parseInt(totalExpenses.cnt || 0),
      totalAmount,
      totalPaid,
      totalPending: totalAmount - totalPaid,
      breakdown,
    });
  } catch (err) { next(err); }
});

module.exports = router;
