const express = require('express');
const router = express.Router();
const { run, get } = require('../db');
const auth = require('../middleware/auth');

router.put('/:expenseId/:userId', auth, async (req, res, next) => {
  try {
    const { expenseId, userId } = req.params;
    const split = await get('SELECT * FROM expense_splits WHERE expense_id = ? AND user_id = ?', [expenseId, userId]);
    if (!split) return res.status(404).json({ error: 'Split not found' });
    if (split.payment_status === 'Paid') return res.status(400).json({ error: 'Already marked as Paid' });

    await run("UPDATE expense_splits SET payment_status = 'Paid' WHERE expense_id = ? AND user_id = ?", [expenseId, userId]);
    await run("INSERT INTO audit_logs (action, user_id, details) VALUES ('payment_marked', ?, ?)",
      [req.user.id, JSON.stringify({ expense_id: parseInt(expenseId), for_user_id: parseInt(userId) })]);
    res.json({ message: 'Marked as Paid' });
  } catch (err) { next(err); }
});

router.put('/:expenseId/:userId/unpaid', auth, async (req, res, next) => {
  try {
    const { expenseId, userId } = req.params;
    await run("UPDATE expense_splits SET payment_status = 'Pending' WHERE expense_id = ? AND user_id = ?", [expenseId, userId]);
    res.json({ message: 'Reverted to Pending' });
  } catch (err) { next(err); }
});

module.exports = router;
