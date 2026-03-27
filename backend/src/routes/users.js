const express = require('express');
const router = express.Router();
const { all, get } = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res, next) => {
  try {
    const users = await all('SELECT id, name, email, share_percentage, created_at FROM users');
    res.json(users);
  } catch (err) { next(err); }
});

router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await get('SELECT id, name, email, share_percentage FROM users WHERE id = ?', [req.user.id]);
    res.json(user);
  } catch (err) { next(err); }
});

module.exports = router;
