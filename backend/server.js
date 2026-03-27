require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve('./uploads')));

app.use('/api/auth',           require('./src/routes/auth'));
app.use('/api/users',          require('./src/routes/users'));
app.use('/api/expenses',       require('./src/routes/expenses'));
app.use('/api/payments',       require('./src/routes/payments'));
app.use('/api/dashboard',      require('./src/routes/dashboard'));
app.use('/api/share-requests', require('./src/routes/shareRequests'));
app.use('/api/documents',      require('./src/routes/documents'));
app.use('/api/audit-logs',     require('./src/routes/auditLogs'));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use(require('./src/middleware/errorHandler'));

const PORT = process.env.PORT || 5000;

// Initialize DB then start server
const { init } = require('./src/db');
init().then(() => {
  app.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));
}).catch((err) => {
  console.error('DB init failed:', err);
  process.exit(1);
});
