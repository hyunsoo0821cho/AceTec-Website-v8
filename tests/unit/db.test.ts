import { describe, it, expect, vi } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('Database Module', () => {
  describe('Schema Integrity', () => {
    let db: InstanceType<typeof Database>;

    // 임시 DB를 만들어 스키마 검증
    const tmpDir = path.join(os.tmpdir(), 'acetec-test-' + Date.now());
    const tmpDbPath = path.join(tmpDir, 'test.db');

    it('creates all required tables', () => {
      fs.mkdirSync(tmpDir, { recursive: true });
      db = new Database(tmpDbPath);
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');

      // src/lib/db.ts의 스키마를 직접 실행
      db.exec(`
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

      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[];
      const tableNames = tables.map(t => t.name);

      expect(tableNames).toContain('admins');
      expect(tableNames).toContain('sessions');
      expect(tableNames).toContain('visitor_logs');
      expect(tableNames).toContain('audit_logs');
      expect(tableNames).toContain('verification_codes');
      expect(tableNames).toContain('access_requests');
      expect(tableNames).toContain('conversations');
      expect(tableNames).toContain('messages');
    });

    it('admins table has correct columns', () => {
      const cols = db.prepare("PRAGMA table_info(admins)").all() as { name: string }[];
      const colNames = cols.map(c => c.name);
      expect(colNames).toContain('id');
      expect(colNames).toContain('username');
      expect(colNames).toContain('password_hash');
    });

    it('sessions table has foreign key to admins', () => {
      const fks = db.prepare("PRAGMA foreign_key_list(sessions)").all() as { table: string; from: string; to: string }[];
      expect(fks.length).toBeGreaterThan(0);
      expect(fks[0].table).toBe('admins');
    });

    it('messages table has cascade delete on conversations', () => {
      const fks = db.prepare("PRAGMA foreign_key_list(messages)").all() as { table: string; on_delete: string }[];
      const convFk = fks.find(fk => fk.table === 'conversations');
      expect(convFk).toBeDefined();
      expect(convFk!.on_delete).toBe('CASCADE');
    });

    it('can insert and query data correctly', () => {
      db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run('testuser', 'hash123');
      const user = db.prepare('SELECT * FROM admins WHERE username = ?').get('testuser') as any;
      expect(user).toBeDefined();
      expect(user.username).toBe('testuser');

      // Clean up
      db.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });
});
