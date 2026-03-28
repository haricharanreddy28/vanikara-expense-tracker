const express = require('express');
const router = express.Router();
const { get, run } = require('../db');
const auth = require('../middleware/auth');

// PUT /api/payments/:expenseId/:userId — mark as Paid
router.put('/:expenseId/:userId', auth, async (req, res, next) => {
  try {
    const { expenseId, userId } = req.params;
    await run(
      "UPDATE expense_splits SET payment_status = 'Paid' WHERE expense_id = $1 AND user_id = $2",
      [expenseId, userId]
    );
    await run(
      "INSERT INTO audit_logs (action, user_id, details) VALUES ('payment_marked', $1, $2)",
      [req.user.id, JSON.stringify({ expense_id: parseInt(expenseId), for_user_id: parseInt(userId), status: 'Paid' })]
    );
    res.json({ message: 'Marked as Paid' });
  } catch (err) { next(err); }
});

// PUT /api/payments/:expenseId/:userId/unpaid — revert to Pending
router.put('/:expenseId/:userId/unpaid', auth, async (req, res, next) => {
  try {
    const { expenseId, userId } = req.params;
    await run(
      "UPDATE expense_splits SET payment_status = 'Pending' WHERE expense_id = $1 AND user_id = $2",
      [expenseId, userId]
    );
    await run(
      "INSERT INTO audit_logs (action, user_id, details) VALUES ('payment_reverted', $1, $2)",
      [req.user.id, JSON.stringify({ expense_id: parseInt(expenseId), for_user_id: parseInt(userId), status: 'Pending' })]
    );
    res.json({ message: 'Reverted to Pending' });
  } catch (err) { next(err); }
});

module.exports = router;
