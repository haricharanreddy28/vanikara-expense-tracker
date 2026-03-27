const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');
const auth = require('../middleware/auth');
const { sendExpenseNotification } = require('../services/emailService');

// POST /api/expenses
router.post('/', auth, async (req, res, next) => {
  try {
    const { amount, reason, isCustomSplit, customSplits } = req.body;
    if (!amount || !reason) return res.status(400).json({ error: 'Amount and reason are required' });
    if (amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });

    const directors = await all('SELECT id, name, email, share_percentage FROM users');

    let splits;
    if (isCustomSplit) {
      if (!customSplits || customSplits.length !== directors.length)
        return res.status(400).json({ error: 'Custom splits must cover all directors' });
      const total = customSplits.reduce((s, c) => s + parseFloat(c.percentage), 0);
      if (Math.abs(total - 100) > 0.01)
        return res.status(400).json({ error: 'Custom splits must sum to 100%' });
      splits = directors.map((d) => {
        const cs = customSplits.find((c) => c.userId === d.id);
        if (!cs) throw Object.assign(new Error(`No split for director ${d.id}`), { status: 400 });
        return { ...d, percentage: parseFloat(cs.percentage), amount: (amount * parseFloat(cs.percentage)) / 100 };
      });
    } else {
      splits = directors.map((d) => ({
        ...d,
        percentage: d.share_percentage,
        amount: (amount * d.share_percentage) / 100,
      }));
    }

    const today = new Date().toISOString().split('T')[0];
    const { lastInsertRowid: expenseId } = await run(
      'INSERT INTO expenses (amount, reason, added_by, date, is_custom_split) VALUES (?, ?, ?, ?, ?)',
      [amount, reason, req.user.id, today, isCustomSplit ? 1 : 0]
    );

    for (const s of splits) {
      await run(
        'INSERT INTO expense_splits (expense_id, user_id, percentage, amount, payment_status) VALUES (?, ?, ?, ?, ?)',
        [expenseId, s.id, s.percentage, s.amount, 'Pending']
      );
    }

    await run(
      "INSERT INTO audit_logs (action, user_id, details) VALUES ('expense_created', ?, ?)",
      [req.user.id, JSON.stringify({ expense_id: expenseId, amount, reason })]
    );

    sendExpenseNotification({
      reason, totalAmount: amount, addedBy: req.user.name, date: today,
      splits: splits.map((s) => ({ name: s.name, email: s.email, percentage: s.percentage, amount: s.amount })),
    }).catch(console.error);

    const expense = await get('SELECT * FROM expenses WHERE id = ?', [expenseId]);
    const expenseSplits = await all(`
      SELECT es.*, u.name, u.email FROM expense_splits es
      JOIN users u ON u.id = es.user_id WHERE es.expense_id = ?
    `, [expenseId]);

    res.status(201).json({ ...expense, splits: expenseSplits });
  } catch (err) { next(err); }
});

// GET /api/expenses
router.get('/', auth, async (req, res, next) => {
  try {
    const expenses = await all(`
      SELECT e.*, u.name as added_by_name FROM expenses e
      JOIN users u ON u.id = e.added_by ORDER BY e.created_at DESC
    `);
    const splits = await all(`
      SELECT es.*, u.name, u.email FROM expense_splits es JOIN users u ON u.id = es.user_id
    `);
    res.json(expenses.map((e) => ({ ...e, splits: splits.filter((s) => s.expense_id === e.id) })));
  } catch (err) { next(err); }
});

// GET /api/expenses/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const expense = await get(`
      SELECT e.*, u.name as added_by_name FROM expenses e
      JOIN users u ON u.id = e.added_by WHERE e.id = ?
    `, [req.params.id]);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    const splits = await all(`
      SELECT es.*, u.name, u.email FROM expense_splits es
      JOIN users u ON u.id = es.user_id WHERE es.expense_id = ?
    `, [req.params.id]);
    res.json({ ...expense, splits });
  } catch (err) { next(err); }
});

module.exports = router;
