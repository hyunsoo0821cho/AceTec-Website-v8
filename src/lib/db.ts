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
  _db.pragma('busy_timeout = 5000');

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

    CREATE TABLE IF NOT EXISTS access_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      resolved_at INTEGER,
      resolved_by INTEGER,
      FOREIGN KEY (user_id) REFERENCES admins(id),
      FOREIGN KEY (resolved_by) REFERENCES admins(id)
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

  // 프로필 컬럼 추가
  try { _db.exec(`ALTER TABLE admins ADD COLUMN phone TEXT`); } catch {}
  try { _db.exec(`ALTER TABLE admins ADD COLUMN bio TEXT`); } catch {}
  try { _db.exec(`ALTER TABLE admins ADD COLUMN avatar_url TEXT`); } catch {}

  // access_requests에 page 컬럼 추가 (페이지별 열람 권한)
  try { _db.exec(`ALTER TABLE access_requests ADD COLUMN page TEXT NOT NULL DEFAULT 'all'`); } catch {}

  // 로그인 잠금 (무차별 대입 방어)
  try { _db.exec(`ALTER TABLE admins ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { _db.exec(`ALTER TABLE admins ADD COLUMN lock_until INTEGER NOT NULL DEFAULT 0`); } catch {}

  // email 유니크 인덱스 (중복 이메일 방지, NULL/빈값 제외)
  try { _db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_email ON admins(email) WHERE email IS NOT NULL AND email != ''`); } catch {}

  // 성능 인덱스
  try { _db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_admin ON sessions(admin_id)`); } catch {}
  try { _db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`); } catch {}
  try { _db.exec(`CREATE INDEX IF NOT EXISTS idx_visitor_logs_created ON visitor_logs(created_at)`); } catch {}
  try { _db.exec(`CREATE INDEX IF NOT EXISTS idx_verify_email ON verification_codes(email, purpose, used)`); } catch {}
  try { _db.exec(`CREATE INDEX IF NOT EXISTS idx_conversations_visitor ON conversations(visitor_id)`); } catch {}
  try { _db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id)`); } catch {}

  return _db;
}

export default getDb;
