const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(process.env.DATABASE_PATH || './src/db/expense.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new sqlite3.Database(dbPath);

// Promisified helpers
const run = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
    })
  );

const get = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))
  );

const all = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  );

const exec = (sql) =>
  new Promise((resolve, reject) =>
    db.exec(sql, (err) => (err ? reject(err) : resolve()))
  );

// Initialize schema & seed
const init = async () => {
  await exec('PRAGMA journal_mode = WAL;');
  await exec('PRAGMA foreign_keys = ON;');

  await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      share_percentage REAL NOT NULL DEFAULT 33.33,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      reason TEXT NOT NULL,
      added_by INTEGER NOT NULL REFERENCES users(id),
      date TEXT NOT NULL DEFAULT (date('now')),
      is_custom_split INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expense_splits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      percentage REAL NOT NULL,
      amount REAL NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'Pending'
    );

    CREATE TABLE IF NOT EXISTS share_change_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      old_config TEXT NOT NULL,
      new_config TEXT NOT NULL,
      requested_by INTEGER NOT NULL REFERENCES users(id),
      approvals TEXT NOT NULL DEFAULT '[]',
      rejections TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      type TEXT NOT NULL,
      uploaded_by INTEGER NOT NULL REFERENCES users(id),
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id),
      details TEXT NOT NULL DEFAULT '{}',
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const { cnt } = await get('SELECT COUNT(*) as cnt FROM users');
  if (cnt === 0) {
    const hash = (pw) => bcrypt.hashSync(pw, 10);
    await run('INSERT INTO users (name, email, password_hash, share_percentage) VALUES (?, ?, ?, ?)',
      ['Rajesh Kumar', 'rajesh@company.com', hash('password123'), 40]);
    await run('INSERT INTO users (name, email, password_hash, share_percentage) VALUES (?, ?, ?, ?)',
      ['Priya Sharma', 'priya@company.com', hash('password123'), 35]);
    await run('INSERT INTO users (name, email, password_hash, share_percentage) VALUES (?, ?, ?, ?)',
      ['Amit Verma', 'amit@company.com', hash('password123'), 25]);
    console.log('✅ Seeded 3 directors');
  }
};

module.exports = { db, run, get, all, exec, init };
