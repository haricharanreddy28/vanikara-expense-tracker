const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');
const auth = require('../middleware/auth');
const { sendShareChangeRequest } = require('../services/emailService');

const REQUIRED_APPROVALS = 2;

router.post('/', auth, async (req, res, next) => {
  try {
    const { newShares } = req.body;
    if (!Array.isArray(newShares)) return res.status(400).json({ error: 'newShares array required' });

    const total = newShares.reduce((s, x) => s + parseFloat(x.percentage), 0);
    if (Math.abs(total - 100) > 0.01) return res.status(400).json({ error: 'Shares must sum to 100%' });

    const pending = await get("SELECT id FROM share_change_requests WHERE status = 'pending'");
    if (pending) return res.status(400).json({ error: 'A pending request already exists' });

    const directors = await all('SELECT id, name, email, share_percentage FROM users');
    const oldConfig = directors.map((d) => ({ userId: d.id, name: d.name, percentage: d.share_percentage }));
    const newConfig = newShares.map((ns) => {
      const d = directors.find((x) => x.id === ns.userId);
      if (!d) throw Object.assign(new Error(`Director ${ns.userId} not found`), { status: 400 });
      return { userId: d.id, name: d.name, percentage: parseFloat(ns.percentage) };
    });

    const { lastInsertRowid: requestId } = await run(`
      INSERT INTO share_change_requests (old_config, new_config, requested_by, approvals, rejections, status)
      VALUES (?, ?, ?, '[]', '[]', 'pending')`,
      [JSON.stringify(oldConfig), JSON.stringify(newConfig), req.user.id]
    );

    await run("INSERT INTO audit_logs (action, user_id, details) VALUES ('share_change_requested', ?, ?)",
      [req.user.id, JSON.stringify({ request_id: requestId })]);

    sendShareChangeRequest({
      directors,
      oldShares: oldConfig.map((o) => ({ name: o.name, percentage: o.percentage })),
      newShares: newConfig.map((n) => ({ name: n.name, percentage: n.percentage })),
      requestedBy: req.user.name, requestId,
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    }).catch(console.error);

    res.status(201).json({ id: requestId, message: 'Share change request submitted' });
  } catch (err) { next(err); }
});

router.get('/', auth, async (req, res, next) => {
  try {
    const requests = await all(`
      SELECT scr.*, u.name as requested_by_name FROM share_change_requests scr
      JOIN users u ON u.id = scr.requested_by ORDER BY scr.created_at DESC
    `);
    res.json(requests.map((r) => ({
      ...r,
      old_config: JSON.parse(r.old_config),
      new_config: JSON.parse(r.new_config),
      approvals: JSON.parse(r.approvals),
      rejections: JSON.parse(r.rejections),
    })));
  } catch (err) { next(err); }
});

router.post('/:id/approve', auth, async (req, res, next) => {
  try {
    const request = await get('SELECT * FROM share_change_requests WHERE id = ?', [req.params.id]);
    if (!request) return res.status(404).json({ error: 'Not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Not pending' });

    const approvals = JSON.parse(request.approvals);
    if (approvals.includes(req.user.id)) return res.status(400).json({ error: 'Already approved' });
    approvals.push(req.user.id);

    if (approvals.length >= REQUIRED_APPROVALS) {
      const newConfig = JSON.parse(request.new_config);
      for (const nc of newConfig) {
        await run('UPDATE users SET share_percentage = ? WHERE id = ?', [nc.percentage, nc.userId]);
      }
      await run(`UPDATE share_change_requests SET approvals = ?, status = 'approved', resolved_at = datetime('now') WHERE id = ?`,
        [JSON.stringify(approvals), request.id]);
      await run("INSERT INTO audit_logs (action, user_id, details) VALUES ('share_change_approved', ?, ?)",
        [req.user.id, JSON.stringify({ request_id: request.id, applied: true })]);
      return res.json({ message: 'Approved and shares updated', status: 'approved' });
    }

    await run('UPDATE share_change_requests SET approvals = ? WHERE id = ?', [JSON.stringify(approvals), request.id]);
    await run("INSERT INTO audit_logs (action, user_id, details) VALUES ('share_change_approved', ?, ?)",
      [req.user.id, JSON.stringify({ request_id: request.id, approvals_count: approvals.length })]);
    res.json({ message: `Approval recorded (${approvals.length}/${REQUIRED_APPROVALS})`, approvals });
  } catch (err) { next(err); }
});

router.post('/:id/reject', auth, async (req, res, next) => {
  try {
    const request = await get('SELECT * FROM share_change_requests WHERE id = ?', [req.params.id]);
    if (!request) return res.status(404).json({ error: 'Not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Not pending' });

    const rejections = JSON.parse(request.rejections);
    if (rejections.includes(req.user.id)) return res.status(400).json({ error: 'Already rejected' });
    rejections.push(req.user.id);

    await run(`UPDATE share_change_requests SET rejections = ?, status = 'rejected', resolved_at = datetime('now') WHERE id = ?`,
      [JSON.stringify(rejections), request.id]);
    await run("INSERT INTO audit_logs (action, user_id, details) VALUES ('share_change_rejected', ?, ?)",
      [req.user.id, JSON.stringify({ request_id: request.id })]);
    res.json({ message: 'Rejected', status: 'rejected' });
  } catch (err) { next(err); }
});

module.exports = router;
