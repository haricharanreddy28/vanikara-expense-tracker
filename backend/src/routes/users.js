const express = require('express');
const router = express.Router();
const { all, get, run } = require('../db');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// GET /api/users
router.get('/', auth, async (req, res, next) => {
  try {
    const users = await all('SELECT id, name, email, share_percentage, is_admin, created_at FROM users ORDER BY id');
    res.json(users);
  } catch (err) { next(err); }
});

// GET /api/users/me
router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await get('SELECT id, name, email, share_percentage, is_admin FROM users WHERE id = $1', [req.user.id]);
    res.json(user);
  } catch (err) { next(err); }
});

const adminOnly = async (req, res, next) => {
  try {
    const user = await get('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (!user || !user.is_admin) return res.status(403).json({ error: 'Admin access required' });
    next();
  } catch (err) { next(err); }
};

// PUT /api/users/:id — update profile (admin only)
router.put('/:id', auth, adminOnly, async (req, res, next) => {
  try {
    const { name, email, share_percentage, is_admin } = req.body;
    const user = await get('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (email && email !== user.email) {
      const existing = await get('SELECT id FROM users WHERE email = $1 AND id != $2', [email, req.params.id]);
      if (existing) return res.status(400).json({ error: 'Email already in use by another director' });
    }

    if (share_percentage !== undefined) {
      const val = parseFloat(share_percentage);
      if (isNaN(val) || val < 0 || val > 100)
        return res.status(400).json({ error: 'Share percentage must be 0–100' });
    }

    await run(
      `UPDATE users SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        share_percentage = COALESCE($3, share_percentage),
        is_admin = COALESCE($4, is_admin)
       WHERE id = $5`,
      [name || null, email || null, share_percentage ?? null, is_admin ?? null, req.params.id]
    );

    await run(
      "INSERT INTO audit_logs (action, user_id, details) VALUES ('profile_updated', $1, $2)",
      [req.user.id, JSON.stringify({ updated_user_id: parseInt(req.params.id), fields: Object.keys(req.body) })]
    );

    const updated = await get('SELECT id, name, email, share_percentage, is_admin FROM users WHERE id = $1', [req.params.id]);
    res.json(updated);
  } catch (err) { next(err); }
});

// PUT /api/users/:id/password
router.put('/:id/password', auth, adminOnly, async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const hash = bcrypt.hashSync(password, 10);
    await run('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.params.id]);
    await run(
      "INSERT INTO audit_logs (action, user_id, details) VALUES ('password_changed', $1, $2)",
      [req.user.id, JSON.stringify({ for_user_id: parseInt(req.params.id) })]
    );
    res.json({ message: 'Password updated successfully' });
  } catch (err) { next(err); }
});

// PUT /api/users/:id/toggle-admin
router.put('/:id/toggle-admin', auth, adminOnly, async (req, res, next) => {
  try {
    const user = await get('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const newVal = user.is_admin ? 0 : 1;
    await run('UPDATE users SET is_admin = $1 WHERE id = $2', [newVal, req.params.id]);
    res.json({ message: `Admin status ${newVal ? 'granted' : 'revoked'}`, is_admin: newVal });
  } catch (err) { next(err); }
});

module.exports = router;
