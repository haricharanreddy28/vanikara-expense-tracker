const express = require('express');
const router = express.Router();
const { all, get, run } = require('../db');
const auth = require('../middleware/auth');
const { sendExpenseNotification } = require('../services/emailService');

// POST /api/expenses
router.post('/', auth, async (req, res, next) => {
  try {
    const { amount, reason, isCustomSplit, customSplits } = req.body;
    if (!amount || !reason) return res.status(400).json({ error: 'amount and reason are required' });
    if (amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });

    const directors = await all('SELECT id, name, share_percentage FROM users ORDER BY id');

    let splits;
    if (isCustomSplit && customSplits) {
      const total = customSplits.reduce((s, c) => s + parseFloat(c.percentage || 0), 0);
      if (Math.abs(total - 100) > 0.01)
        return res.status(400).json({ error: `Custom splits must total 100% (got ${total.toFixed(1)}%)` });
      splits = customSplits.map(c => {
        const user = directors.find(d => d.id === c.userId);
        return { userId: c.userId, name: user?.name, percentage: parseFloat(c.percentage), amount: (amount * parseFloat(c.percentage)) / 100 };
      });
    } else {
      splits = directors.map(d => ({
        userId: d.id, name: d.name, percentage: d.share_percentage, amount: (amount * d.share_percentage) / 100,
      }));
    }

    const expense = await get(
      'INSERT INTO expenses (amount, reason, added_by, is_custom_split) VALUES ($1,$2,$3,$4) RETURNING *',
      [amount, reason, req.user.id, isCustomSplit ? 1 : 0]
    );

    for (const s of splits) {
      await run(
        'INSERT INTO expense_splits (expense_id, user_id, percentage, amount) VALUES ($1,$2,$3,$4)',
        [expense.id, s.userId, s.percentage, parseFloat(s.amount.toFixed(2))]
      );
    }

    await run(
      "INSERT INTO audit_logs (action, user_id, details) VALUES ('expense_created', $1, $2)",
      [req.user.id, JSON.stringify({ expense_id: expense.id, amount, reason })]
    );

    const addedBy = await get('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
    const allUsers = await all('SELECT email FROM users');
    await sendExpenseNotification(allUsers.map(u => u.email), { amount, reason, addedBy: addedBy.name, splits });

    res.status(201).json({ ...expense, splits });
  } catch (err) { next(err); }
});

// GET /api/expenses
router.get('/', auth, async (req, res, next) => {
  try {
    const expenses = await all(`
      SELECT e.*, u.name as added_by_name
      FROM expenses e
      JOIN users u ON u.id = e.added_by
      ORDER BY e.created_at DESC
    `);

    const result = await Promise.all(expenses.map(async (e) => {
      const splits = await all(`
        SELECT es.*, u.name, u.email
        FROM expense_splits es
        JOIN users u ON u.id = es.user_id
        WHERE es.expense_id = $1
        ORDER BY es.id
      `, [e.id]);
      return { ...e, splits };
    }));

    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
