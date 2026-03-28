const express = require('express');
const router = express.Router();
const { get, run, all } = require('../db');

// GET /api/setup/status — check if initial setup is complete
router.get('/status', async (req, res, next) => {
  try {
    const result = await get('SELECT COUNT(*) as cnt FROM users');
    const count = parseInt(result?.cnt || result?.count || 0);
    res.json({ needsSetup: count === 0 });
  } catch (err) { next(err); }
});

// POST /api/setup — create 3 directors (only when no users exist)
router.post('/', async (req, res, next) => {
  try {
    const { directors } = req.body;
    // directors: [{name, email, password, share_percentage, is_admin}]

    if (!Array.isArray(directors) || directors.length === 0)
      return res.status(400).json({ error: 'directors array is required' });

    // Block if already set up
    const existing = await get('SELECT COUNT(*) as cnt FROM users');
    const count = parseInt(existing?.cnt || existing?.count || 0);
    if (count > 0)
      return res.status(400).json({ error: 'Application is already set up' });

    // Validate
    const total = directors.reduce((s, d) => s + parseFloat(d.share_percentage || 0), 0);
    if (Math.abs(total - 100) > 0.01)
      return res.status(400).json({ error: `Share percentages must total 100% (currently ${total.toFixed(1)}%)` });

    for (const d of directors) {
      if (!d.name || !d.email || !d.password)
        return res.status(400).json({ error: `Name, email and password required for all directors` });
      if (d.password.length < 6)
        return res.status(400).json({ error: `Password must be at least 6 characters for ${d.name}` });
    }

    const bcrypt = require('bcryptjs');
    const created = [];
    for (let i = 0; i < directors.length; i++) {
      const d = directors[i];
      const hash = bcrypt.hashSync(d.password, 10);
      const user = await get(
        'INSERT INTO users (name, email, password_hash, share_percentage, is_admin) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, share_percentage, is_admin',
        [d.name.trim(), d.email.toLowerCase().trim(), hash, parseFloat(d.share_percentage), i === 0 ? 1 : (d.is_admin ? 1 : 0)]
      );
      created.push(user);
    }

    await run(
      "INSERT INTO audit_logs (action, user_id, details) VALUES ('setup_completed', $1, $2)",
      [created[0].id, JSON.stringify({ directors_created: created.length })]
    );

    res.status(201).json({ message: 'Setup complete', directors: created });
  } catch (err) { next(err); }
});

module.exports = router;
