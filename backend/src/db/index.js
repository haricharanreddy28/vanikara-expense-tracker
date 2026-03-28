const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },   // always on — required by Supabase
  max: 3,                                // low for free tier (Supabase allows 15 pooler connections)
  min: 0,
  connectionTimeoutMillis: 10000,        // fail fast if can't connect in 10s
  idleTimeoutMillis: 30000,
  statement_timeout: 30000,
});

// Promisified helpers matching the sqlite3 API surface
const run = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return { lastInsertRowid: result.rows[0]?.id, changes: result.rowCount, rows: result.rows };
};

const get = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
};

const all = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return result.rows;
};

// Initialize schema (idempotent)
const init = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      share_percentage REAL NOT NULL DEFAULT 33.33,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      amount REAL NOT NULL,
      reason TEXT NOT NULL,
      added_by INTEGER NOT NULL REFERENCES users(id),
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      is_custom_split INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS expense_splits (
      id SERIAL PRIMARY KEY,
      expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      percentage REAL NOT NULL,
      amount REAL NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'Pending'
    );

    CREATE TABLE IF NOT EXISTS share_change_requests (
      id SERIAL PRIMARY KEY,
      old_config JSONB NOT NULL,
      new_config JSONB NOT NULL,
      requested_by INTEGER NOT NULL REFERENCES users(id),
      approvals JSONB NOT NULL DEFAULT '[]',
      rejections JSONB NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      type TEXT NOT NULL,
      uploaded_by INTEGER NOT NULL REFERENCES users(id),
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      action TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id),
      details JSONB NOT NULL DEFAULT '{}',
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('✅ Database schema initialized');
};

module.exports = { pool, run, get, all, init };
