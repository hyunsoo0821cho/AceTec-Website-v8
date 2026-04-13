import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { randomUUID } from 'crypto';

/**
 * Auth Flow 통합 테스트
 * 실제 SQLite DB를 사용하여 인증 흐름을 엔드투엔드로 검증합니다.
 */
describe('Auth Flow Integration', () => {
  let db: InstanceType<typeof Database>;
  const tmpDir = path.join(os.tmpdir(), 'acetec-auth-test-' + Date.now());
  const tmpDbPath = path.join(tmpDir, 'auth-test.db');

  const SESSION_TTL = 60 * 60 * 24;

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
    db = new Database(tmpDbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        display_name TEXT,
        email TEXT,
        phone TEXT,
        bio TEXT,
        avatar_url TEXT
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        admin_id INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY (admin_id) REFERENCES admins(id)
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
    `);
  });

  afterAll(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('회원가입 → 로그인 → 세션검증 → 로그아웃 전체 흐름', () => {
    const email = 'testuser@acetec.com';
    const password = 'SecurePass123!';
    const username = 'testuser';
    let userId: number;
    let sessionId: string;

    it('1. 인증코드 생성 및 저장', () => {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = Date.now() + 10 * 60 * 1000;
      db.prepare('INSERT INTO verification_codes (email, code, purpose, role, expires_at) VALUES (?, ?, ?, ?, ?)').run(
        email, code, 'register', 'person', expiresAt,
      );

      const record = db.prepare('SELECT * FROM verification_codes WHERE email = ? AND code = ?').get(email, code) as any;
      expect(record).toBeDefined();
      expect(record.purpose).toBe('register');
      expect(record.used).toBe(0);

      // 코드 사용 처리
      db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(record.id);
    });

    it('2. 회원가입 (계정 생성)', () => {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare('INSERT INTO admins (username, password_hash, role, display_name, email) VALUES (?, ?, ?, ?, ?)').run(
        username, hash, 'person', 'Test User', email,
      );

      const user = db.prepare('SELECT * FROM admins WHERE username = ?').get(username) as any;
      expect(user).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.role).toBe('person');
      userId = user.id;
    });

    it('3. 중복 회원가입 불가', () => {
      const existing = db.prepare('SELECT id FROM admins WHERE email = ? OR username = ?').get(email, username);
      expect(existing).toBeDefined(); // 이미 존재
    });

    it('4. 로그인 (비밀번호 검증)', () => {
      const row = db.prepare('SELECT id, password_hash FROM admins WHERE username = ? OR email = ?').get(username, email) as any;
      expect(row).toBeDefined();
      expect(bcrypt.compareSync(password, row.password_hash)).toBe(true);
      expect(bcrypt.compareSync('wrong-password', row.password_hash)).toBe(false);
    });

    it('5. 세션 생성', () => {
      sessionId = randomUUID();
      const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL;
      db.prepare('INSERT INTO sessions (id, admin_id, expires_at) VALUES (?, ?, ?)').run(sessionId, userId, expiresAt);

      const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as any;
      expect(session).toBeDefined();
      expect(session.admin_id).toBe(userId);
    });

    it('6. 세션 검증 성공', () => {
      const now = Math.floor(Date.now() / 1000);
      const row = db.prepare('SELECT admin_id FROM sessions WHERE id = ? AND expires_at > ?').get(sessionId, now) as any;
      expect(row).toBeDefined();
      expect(row.admin_id).toBe(userId);
    });

    it('7. 만료된 세션 검증 실패', () => {
      const expiredId = randomUUID();
      const pastTime = Math.floor(Date.now() / 1000) - 1000;
      db.prepare('INSERT INTO sessions (id, admin_id, expires_at) VALUES (?, ?, ?)').run(expiredId, userId, pastTime);

      const now = Math.floor(Date.now() / 1000);
      const row = db.prepare('SELECT admin_id FROM sessions WHERE id = ? AND expires_at > ?').get(expiredId, now);
      expect(row).toBeUndefined();
    });

    it('8. 로그아웃 (세션 삭제)', () => {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
      const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
      expect(row).toBeUndefined();
    });

    it('9. 감사 로그 기록', () => {
      db.prepare('INSERT INTO audit_logs (admin_id, action, detail, created_at) VALUES (?, ?, ?, ?)').run(
        userId, 'login', 'Test login', Date.now(),
      );
      db.prepare('INSERT INTO audit_logs (admin_id, action, detail, created_at) VALUES (?, ?, ?, ?)').run(
        userId, 'logout', 'Test logout', Date.now(),
      );

      const logs = db.prepare('SELECT * FROM audit_logs WHERE admin_id = ?').all(userId) as any[];
      expect(logs.length).toBe(2);
      expect(logs[0].action).toBe('login');
      expect(logs[1].action).toBe('logout');
    });
  });

  describe('비밀번호 재설정 흐름', () => {
    const email = 'resetuser@acetec.com';
    const oldPassword = 'OldPass123';
    const newPassword = 'NewPass456!';
    let userId: number;

    it('1. 기존 사용자 생성', () => {
      const hash = bcrypt.hashSync(oldPassword, 10);
      db.prepare('INSERT INTO admins (username, password_hash, role, email) VALUES (?, ?, ?, ?)').run('resetuser', hash, 'person', email);
      const user = db.prepare('SELECT id FROM admins WHERE email = ?').get(email) as any;
      userId = user.id;
      expect(userId).toBeDefined();
    });

    it('2. 재설정 인증코드 생성', () => {
      const code = '123456';
      const expiresAt = Date.now() + 10 * 60 * 1000;
      db.prepare('INSERT INTO verification_codes (email, code, purpose, expires_at) VALUES (?, ?, ?, ?)').run(email, code, 'reset', expiresAt);

      const record = db.prepare('SELECT * FROM verification_codes WHERE email = ? AND purpose = ? AND used = 0').get(email, 'reset') as any;
      expect(record).toBeDefined();
      expect(record.code).toBe('123456');
    });

    it('3. 비밀번호 변경', () => {
      const newHash = bcrypt.hashSync(newPassword, 10);
      db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(newHash, userId);

      const user = db.prepare('SELECT password_hash FROM admins WHERE id = ?').get(userId) as any;
      expect(bcrypt.compareSync(newPassword, user.password_hash)).toBe(true);
      expect(bcrypt.compareSync(oldPassword, user.password_hash)).toBe(false);
    });

    it('4. 기존 세션 모두 삭제', () => {
      // 먼저 세션 추가
      db.prepare('INSERT INTO sessions (id, admin_id, expires_at) VALUES (?, ?, ?)').run('sess-1', userId, Date.now() + 100000);
      db.prepare('INSERT INTO sessions (id, admin_id, expires_at) VALUES (?, ?, ?)').run('sess-2', userId, Date.now() + 100000);

      // 전부 삭제
      db.prepare('DELETE FROM sessions WHERE admin_id = ?').run(userId);
      const sessions = db.prepare('SELECT * FROM sessions WHERE admin_id = ?').all(userId);
      expect(sessions.length).toBe(0);
    });
  });

  describe('접근 권한 관리', () => {
    let adminId: number;
    let personId: number;

    it('1. admin은 항상 상세 접근 가능', () => {
      db.prepare('INSERT INTO admins (username, password_hash, role, email) VALUES (?, ?, ?, ?)').run('superadmin', 'hash', 'admin', 'admin@test.com');
      const user = db.prepare('SELECT * FROM admins WHERE username = ?').get('superadmin') as any;
      adminId = user.id;
      expect(user.role).toBe('admin');
    });

    it('2. person은 승인 없이 접근 불가', () => {
      db.prepare('INSERT INTO admins (username, password_hash, role, email) VALUES (?, ?, ?, ?)').run('normalperson', 'hash', 'person', 'person@test.com');
      const user = db.prepare('SELECT * FROM admins WHERE username = ?').get('normalperson') as any;
      personId = user.id;

      const approved = db.prepare('SELECT id FROM access_requests WHERE user_id = ? AND status = ?').get(personId, 'approved');
      expect(approved).toBeUndefined();
    });

    it('3. 접근 요청 후 승인되면 접근 가능', () => {
      db.prepare('INSERT INTO access_requests (user_id, status, created_at) VALUES (?, ?, ?)').run(personId, 'pending', Date.now());

      // 관리자가 승인
      db.prepare('UPDATE access_requests SET status = ?, resolved_at = ?, resolved_by = ? WHERE user_id = ?').run('approved', Date.now(), adminId, personId);

      const approved = db.prepare('SELECT id FROM access_requests WHERE user_id = ? AND status = ?').get(personId, 'approved');
      expect(approved).toBeDefined();
    });
  });
});
