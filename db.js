const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'jobs.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    source TEXT NOT NULL,
    source_url TEXT UNIQUE NOT NULL,
    apply_url TEXT,
    description TEXT,
    salary TEXT,
    posted_at TEXT,
    first_seen_at TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS fetch_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT,
    fetched_at TEXT,
    jobs_found INTEGER,
    jobs_added INTEGER,
    status TEXT,
    error TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
  CREATE INDEX IF NOT EXISTS idx_jobs_first_seen ON jobs(first_seen_at);
`);

module.exports = db;
