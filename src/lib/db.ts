import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'acetec.db');

let _db: InstanceType<typeof Database> | null = null;

function getDb(): InstanceType<typeof Database> {
  if (_db) return _db;

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      admin_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES admins(id)
    );

    -- role 컬럼 추가 (기존 테이블 호환)
    CREATE TABLE IF NOT EXISTS visitor_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT,
      path TEXT,
      user_agent TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      action TEXT NOT NULL,
      detail TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      purpose TEXT NOT NULL,
      role TEXT,
      expires_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'New Chat',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      sources TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);

  // admins 테이블에 role 컬럼 추가 (기존 DB 호환)
  try {
    _db.exec(`ALTER TABLE admins ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'`);
  } catch { /* 이미 존재하면 무시 */ }

  // admins 테이블에 display_name 컬럼 추가
  try {
    _db.exec(`ALTER TABLE admins ADD COLUMN display_name TEXT`);
  } catch { /* 이미 존재하면 무시 */ }

  // admins 테이블에 email 컬럼 추가
  try {
    _db.exec(`ALTER TABLE admins ADD COLUMN email TEXT`);
  } catch { /* 이미 존재하면 무시 */ }

  return _db;
}

export default getDb;
