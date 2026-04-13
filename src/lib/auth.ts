import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import getDb from './db';

const SESSION_TTL = 60 * 60 * 24;
const COOKIE_NAME = 'sid';
// HTTPS 배포 시 SESSION_SECURE=1 로 Secure 플래그 활성화. 기본은 off (내부 HTTP 호환).
const SECURE_FLAG = process.env.SESSION_SECURE === '1' ? ' Secure;' : '';
// 로그인 잠금 정책: 5회 실패 시 30분 잠금
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000;

export function verifyPassword(usernameOrEmail: string, password: string): number | null {
  const row = getDb().prepare('SELECT id, password_hash FROM admins WHERE username = ? OR email = ?').get(usernameOrEmail, usernameOrEmail) as
    | { id: number; password_hash: string }
    | undefined;
  if (!row) return null;
  if (!bcrypt.compareSync(password, row.password_hash)) return null;
  return row.id;
}

export function getUserInfo(adminId: number): { id: number; username: string; role: string; display_name: string; email: string } | null {
  const row = getDb().prepare('SELECT id, username, role, display_name, email FROM admins WHERE id = ?').get(adminId) as
    | { id: number; username: string; role: string; display_name: string; email: string }
    | undefined;
  return row ?? null;
}

/** admin은 항상 true. 그 외 역할은 access_requests에서 해당 page가 approved 상태가 있어야 true */
export function hasDetailAccess(adminId: number, page?: string): boolean {
  const user = getUserInfo(adminId);
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!page) {
    // page 미지정 시 어떤 페이지든 approved가 있으면 true (하위 호환)
    const approved = getDb().prepare(
      'SELECT id FROM access_requests WHERE user_id = ? AND status = ?'
    ).get(adminId, 'approved');
    return !!approved;
  }
  // 특정 페이지에 대해 approved 확인
  const approved = getDb().prepare(
    "SELECT id FROM access_requests WHERE user_id = ? AND status = 'approved' AND page = ?"
  ).get(adminId, page);
  return !!approved;
}

export function createSession(adminId: number): string {
  const id = randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL;
  getDb().prepare('INSERT INTO sessions (id, admin_id, expires_at) VALUES (?, ?, ?)').run(id, adminId, expiresAt);
  return id;
}

export function verifySession(sessionId: string | undefined): number | null {
  if (!sessionId) return null;
  const now = Math.floor(Date.now() / 1000);
  const row = getDb().prepare('SELECT admin_id FROM sessions WHERE id = ? AND expires_at > ?').get(sessionId, now) as
    | { admin_id: number }
    | undefined;
  if (!row) return null;
  return row.admin_id;
}

export function deleteSession(sessionId: string) {
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

export function sessionCookie(sessionId: string): string {
  return `${COOKIE_NAME}=${sessionId}; HttpOnly;${SECURE_FLAG} SameSite=Strict; Path=/; Max-Age=${SESSION_TTL}`;
}

export function clearCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly;${SECURE_FLAG} SameSite=Strict; Path=/; Max-Age=0`;
}

// ==== 로그인 잠금 (무차별 대입 방어) ====
export function getAccountLockInfo(usernameOrEmail: string): { id: number; lockedUntil: number } | null {
  const row = getDb().prepare(
    'SELECT id, lock_until FROM admins WHERE username = ? OR email = ?'
  ).get(usernameOrEmail, usernameOrEmail) as { id: number; lock_until: number | null } | undefined;
  if (!row) return null;
  return { id: row.id, lockedUntil: row.lock_until ?? 0 };
}

export function isAccountLocked(usernameOrEmail: string): boolean {
  const info = getAccountLockInfo(usernameOrEmail);
  if (!info) return false;
  return info.lockedUntil > Date.now();
}

export function recordFailedLogin(usernameOrEmail: string): { locked: boolean; attempts: number } {
  const info = getAccountLockInfo(usernameOrEmail);
  if (!info) return { locked: false, attempts: 0 };
  const row = getDb().prepare('SELECT failed_attempts FROM admins WHERE id = ?').get(info.id) as
    | { failed_attempts: number | null } | undefined;
  const attempts = (row?.failed_attempts ?? 0) + 1;
  const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
  const lockUntil = shouldLock ? Date.now() + LOCK_DURATION_MS : 0;
  getDb().prepare('UPDATE admins SET failed_attempts = ?, lock_until = ? WHERE id = ?')
    .run(attempts, lockUntil, info.id);
  return { locked: shouldLock, attempts };
}

export function resetFailedLogin(adminId: number) {
  getDb().prepare('UPDATE admins SET failed_attempts = 0, lock_until = 0 WHERE id = ?').run(adminId);
}

export function getSessionIdFromCookie(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match?.[1];
}
