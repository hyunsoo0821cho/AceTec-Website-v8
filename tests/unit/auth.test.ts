import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock better-sqlite3 before importing auth
const mockGet = vi.fn();
const mockRun = vi.fn();
const mockPrepare = vi.fn(() => ({ get: mockGet, run: mockRun }));
const mockPragma = vi.fn();
const mockExec = vi.fn();

vi.mock('../../src/lib/db', () => ({
  default: () => ({
    prepare: mockPrepare,
    pragma: mockPragma,
    exec: mockExec,
  }),
}));

import {
  verifyPassword,
  getUserInfo,
  hasDetailAccess,
  createSession,
  verifySession,
  deleteSession,
  sessionCookie,
  clearCookie,
  getSessionIdFromCookie,
} from '../../src/lib/auth';

describe('Auth Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyPassword', () => {
    it('returns null for non-existent user', () => {
      mockGet.mockReturnValue(undefined);
      expect(verifyPassword('unknown', 'pass')).toBeNull();
    });

    it('returns null for wrong password', () => {
      // bcryptjs.compareSync will fail for non-matching hash
      mockGet.mockReturnValue({ id: 1, password_hash: '$2a$10$invalidhashhere' });
      expect(verifyPassword('admin', 'wrongpass')).toBeNull();
    });

    it('returns admin id for correct password', async () => {
      const bcrypt = await import('bcryptjs');
      const hash = bcrypt.hashSync('correct123', 10);
      mockGet.mockReturnValue({ id: 42, password_hash: hash });
      expect(verifyPassword('admin', 'correct123')).toBe(42);
    });
  });

  describe('getUserInfo', () => {
    it('returns null for non-existent user', () => {
      mockGet.mockReturnValue(undefined);
      expect(getUserInfo(999)).toBeNull();
    });

    it('returns user info for valid id', () => {
      const user = { id: 1, username: 'admin', role: 'admin', display_name: 'Admin', email: 'admin@test.com' };
      mockGet.mockReturnValue(user);
      expect(getUserInfo(1)).toEqual(user);
    });
  });

  describe('hasDetailAccess', () => {
    it('returns false for non-existent user', () => {
      mockGet.mockReturnValue(undefined);
      expect(hasDetailAccess(999)).toBe(false);
    });

    it('returns true for admin role', () => {
      // First call: getUserInfo
      mockGet.mockReturnValueOnce({ id: 1, username: 'admin', role: 'admin', display_name: 'Admin', email: 'a@b.com' });
      expect(hasDetailAccess(1)).toBe(true);
    });

    it('returns true for non-admin with approved access', () => {
      // getUserInfo returns non-admin
      mockGet.mockReturnValueOnce({ id: 2, username: 'user', role: 'person', display_name: 'User', email: 'u@b.com' });
      // access_requests query returns approved
      mockGet.mockReturnValueOnce({ id: 1 });
      expect(hasDetailAccess(2)).toBe(true);
    });

    it('returns false for non-admin without approved access', () => {
      mockGet.mockReturnValueOnce({ id: 2, username: 'user', role: 'person', display_name: 'User', email: 'u@b.com' });
      mockGet.mockReturnValueOnce(undefined);
      expect(hasDetailAccess(2)).toBe(false);
    });
  });

  describe('createSession', () => {
    it('returns a UUID string', () => {
      const sid = createSession(1);
      expect(sid).toBeTruthy();
      expect(typeof sid).toBe('string');
      // UUID format
      expect(sid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('calls db insert with correct args', () => {
      const sid = createSession(42);
      expect(mockPrepare).toHaveBeenCalledWith('INSERT INTO sessions (id, admin_id, expires_at) VALUES (?, ?, ?)');
      expect(mockRun).toHaveBeenCalledWith(sid, 42, expect.any(Number));
    });
  });

  describe('verifySession', () => {
    it('returns null for undefined sessionId', () => {
      expect(verifySession(undefined)).toBeNull();
    });

    it('returns null for expired/invalid session', () => {
      mockGet.mockReturnValue(undefined);
      expect(verifySession('invalid-id')).toBeNull();
    });

    it('returns admin_id for valid session', () => {
      mockGet.mockReturnValue({ admin_id: 5 });
      expect(verifySession('valid-id')).toBe(5);
    });
  });

  describe('deleteSession', () => {
    it('calls db delete', () => {
      deleteSession('some-id');
      expect(mockPrepare).toHaveBeenCalledWith('DELETE FROM sessions WHERE id = ?');
      expect(mockRun).toHaveBeenCalledWith('some-id');
    });
  });

  describe('sessionCookie', () => {
    it('returns proper cookie string', () => {
      const cookie = sessionCookie('test-session');
      expect(cookie).toContain('sid=test-session');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Path=/');
      expect(cookie).toContain('Max-Age=86400');
    });
  });

  describe('clearCookie', () => {
    it('returns cookie with Max-Age=0', () => {
      const cookie = clearCookie();
      expect(cookie).toContain('sid=');
      expect(cookie).toContain('Max-Age=0');
    });
  });

  describe('getSessionIdFromCookie', () => {
    it('returns undefined for null header', () => {
      expect(getSessionIdFromCookie(null)).toBeUndefined();
    });

    it('extracts session id from cookie header', () => {
      expect(getSessionIdFromCookie('sid=abc123')).toBe('abc123');
    });

    it('extracts session id from multiple cookies', () => {
      expect(getSessionIdFromCookie('other=value; sid=my-session-id; another=test')).toBe('my-session-id');
    });

    it('returns undefined when sid not present', () => {
      expect(getSessionIdFromCookie('other=value; token=abc')).toBeUndefined();
    });
  });
});
