import 'bcryptjs';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const root = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..");
const dataDir = path.join(root, "data");
const dbPath = path.join(dataDir, "acetec.db");
let _db = null;
function getDb() {
  if (_db) return _db;
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  _db = new Database(dbPath);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
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
  `);
  return _db;
}

const COOKIE_NAME = "sid";
function verifySession(sessionId) {
  if (!sessionId) return null;
  const now = Math.floor(Date.now() / 1e3);
  const row = getDb().prepare("SELECT admin_id FROM sessions WHERE id = ? AND expires_at > ?").get(sessionId, now);
  if (!row) return null;
  return row.admin_id;
}
function getSessionIdFromCookie(cookieHeader) {
  if (!cookieHeader) return void 0;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match?.[1];
}

export { getSessionIdFromCookie as g, verifySession as v };
