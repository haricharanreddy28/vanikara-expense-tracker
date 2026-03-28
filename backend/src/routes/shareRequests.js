const express = require('express');
const router = express.Router();
const { get, run, all } = require('../db');
const auth = require('../middleware/auth');

// GET /api/share-requests
router.get('/', auth, async (req, res, next) => {
  try {
    const requests = await all(`
      SELECT sr.*, u.name as requested_by_name
      FROM share_change_requests sr
      JOIN users u ON u.id = sr.requested_by
      ORDER BY sr.created_at DESC
    `);
    res.json(requests.map(r => ({
      ...r,
      approvals: Array.isArray(r.approvals) ? r.approvals : JSON.parse(r.approvals || '[]'),
      rejections: Array.isArray(r.rejections) ? r.rejections : JSON.parse(r.rejections || '[]'),
      new_config: Array.isArray(r.new_config) ? r.new_config : JSON.parse(r.new_config || '[]'),
      old_config: Array.isArray(r.old_config) ? r.old_config : JSON.parse(r.old_config || '[]'),
    })));
  } catch (err) { next(err); }
});

// POST /api/share-requests
router.post('/', auth, async (req, res, next) => {
  try {
    const { newShares } = req.body;
    if (!newShares || !Array.isArray(newShares)) return res.status(400).json({ error: 'newShares array required' });

    const total = newShares.reduce((s, x) => s + parseFloat(x.percentage || 0), 0);
    if (Math.abs(total - 100) > 0.01)
      return res.status(400).json({ error: `Shares must total 100% (got ${total.toFixed(1)}%)` });

    const pending = await get("SELECT id FROM share_change_requests WHERE status = 'pending'");
    if (pending) return res.status(400).json({ error: 'A pending request already exists' });

    const directors = await all('SELECT id, name, share_percentage FROM users ORDER BY id');
    const oldConfig = directors.map(d => ({ userId: d.id, name: d.name, percentage: d.share_percentage }));

    const request = await get(
      `INSERT INTO share_change_requests (old_config, new_config, requested_by, approvals, rejections)
       VALUES ($1, $2, $3, '[]', '[]') RETURNING *`,
      [JSON.stringify(oldConfig), JSON.stringify(newShares), req.user.id]
    );

    await run(
      "INSERT INTO audit_logs (action, user_id, details) VALUES ('share_change_requested', $1, $2)",
      [req.user.id, JSON.stringify({ request_id: request.id })]
    );

    res.status(201).json(request);
  } catch (err) { next(err); }
});

// POST /api/share-requests/:id/approve
router.post('/:id/approve', auth, async (req, res, next) => {
  try {
    const request = await get('SELECT * FROM share_change_requests WHERE id = $1', [req.params.id]);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request is already resolved' });

    const approvals = Array.isArray(request.approvals) ? request.approvals : JSON.parse(request.approvals || '[]');
    const rejections = Array.isArray(request.rejections) ? request.rejections : JSON.parse(request.rejections || '[]');

    if (approvals.includes(req.user.id)) return res.status(400).json({ error: 'You already approved this request' });
    if (rejections.includes(req.user.id)) return res.status(400).json({ error: 'You already rejected this request' });

    approvals.push(req.user.id);

    if (approvals.length >= 2) {
      // Apply changes
      const newConfig = Array.isArray(request.new_config) ? request.new_config : JSON.parse(request.new_config);
      for (const nc of newConfig) {
        await run('UPDATE users SET share_percentage = $1 WHERE id = $2', [nc.percentage, nc.userId]);
      }
      await run(
        "UPDATE share_change_requests SET status = 'approved', approvals = $1, resolved_at = NOW() WHERE id = $2",
        [JSON.stringify(approvals), req.params.id]
      );
      await run(
        "INSERT INTO audit_logs (action, user_id, details) VALUES ('share_change_approved', $1, $2)",
        [req.user.id, JSON.stringify({ request_id: parseInt(req.params.id) })]
      );
      return res.json({ message: 'Request approved and shares updated! (2/2 approvals reached)' });
    }

    await run(
      'UPDATE share_change_requests SET approvals = $1 WHERE id = $2',
      [JSON.stringify(approvals), req.params.id]
    );
    await run(
      "INSERT INTO audit_logs (action, user_id, details) VALUES ('share_change_approved', $1, $2)",
      [req.user.id, JSON.stringify({ request_id: parseInt(req.params.id), approvals: approvals.length })]
    );
    res.json({ message: `Approval recorded (${approvals.length}/2 needed)` });
  } catch (err) { next(err); }
});

// POST /api/share-requests/:id/reject
router.post('/:id/reject', auth, async (req, res, next) => {
  try {
    const request = await get('SELECT * FROM share_change_requests WHERE id = $1', [req.params.id]);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request is already resolved' });

    const rejections = Array.isArray(request.rejections) ? request.rejections : JSON.parse(request.rejections || '[]');
    rejections.push(req.user.id);

    await run(
      "UPDATE share_change_requests SET status = 'rejected', rejections = $1, resolved_at = NOW() WHERE id = $2",
      [JSON.stringify(rejections), req.params.id]
    );
    await run(
      "INSERT INTO audit_logs (action, user_id, details) VALUES ('share_change_rejected', $1, $2)",
      [req.user.id, JSON.stringify({ request_id: parseInt(req.params.id) })]
    );
    res.json({ message: 'Request rejected' });
  } catch (err) { next(err); }
});

module.exports = router;
