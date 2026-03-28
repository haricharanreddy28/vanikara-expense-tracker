const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.resolve('./uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.doc', '.docx', '.xls', '.xlsx'];
    allowed.includes(path.extname(file.originalname).toLowerCase()) ? cb(null, true) : cb(new Error('File type not allowed'));
  },
});

router.post('/', auth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { type } = req.body;
    if (!['company', 'director', 'letter'].includes(type))
      return res.status(400).json({ error: 'type must be: company, director, or letter' });

    const doc = await get(
      'INSERT INTO documents (filename, original_name, file_path, type, uploaded_by) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.file.filename, req.file.originalname, req.file.path, type, req.user.id]
    );
    await run(
      "INSERT INTO audit_logs (action, user_id, details) VALUES ('document_uploaded', $1, $2)",
      [req.user.id, JSON.stringify({ document_id: doc.id, name: req.file.originalname, type })]
    );
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

router.get('/', auth, async (req, res, next) => {
  try {
    const { type } = req.query;
    let sql = `SELECT d.*, u.name as uploaded_by_name FROM documents d JOIN users u ON u.id = d.uploaded_by`;
    const params = [];
    if (type) { sql += ' WHERE d.type = $1'; params.push(type); }
    sql += ' ORDER BY d.uploaded_at DESC';
    res.json(await all(sql, params));
  } catch (err) { next(err); }
});

router.get('/:id/download', auth, async (req, res, next) => {
  try {
    const doc = await get('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (!fs.existsSync(doc.file_path)) return res.status(404).json({ error: 'File not found on disk' });
    res.download(doc.file_path, doc.original_name);
  } catch (err) { next(err); }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    const doc = await get('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (fs.existsSync(doc.file_path)) fs.unlinkSync(doc.file_path);
    await run('DELETE FROM documents WHERE id = $1', [req.params.id]);
    await run(
      "INSERT INTO audit_logs (action, user_id, details) VALUES ('document_deleted', $1, $2)",
      [req.user.id, JSON.stringify({ document_id: parseInt(req.params.id) })]
    );
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
