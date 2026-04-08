import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import getDb from './db';

const SESSION_TTL = 60 * 60 * 24;
const COOKIE_NAME = 'sid';

export function verifyPassword(username: string, password: string): number | null {
  const row = getDb().prepare('SELECT id, password_hash FROM admins WHERE username = ?').get(username) as
    | { id: number; password_hash: string }
    | undefined;
  if (!row) return null;
  if (!bcrypt.compareSync(password, row.password_hash)) return null;
  return row.id;
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
  return `${COOKIE_NAME}=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL}`;
}

export function clearCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export function getSessionIdFromCookie(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match?.[1];
}
