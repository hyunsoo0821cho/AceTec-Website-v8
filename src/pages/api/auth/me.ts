import type { APIRoute } from 'astro';
import { verifySession, getSessionIdFromCookie, getUserInfo } from '../../../lib/auth';
import { sanitizeString } from '../../../lib/sanitize';
import getDb from '../../../lib/db';

export const prerender = false;

/** GET — 현재 로그인 사용자 정보 반환 (비로그인 시 200 `{ user: null }` — 콘솔 401 노이즈 제거) */
export const GET: APIRoute = async ({ request }) => {
  const cookie = request.headers.get('cookie');
  const sessionId = verifySession(getSessionIdFromCookie(cookie));
  if (!sessionId) return Response.json({ user: null });

  const userInfo = getUserInfo(sessionId);
  if (!userInfo) return Response.json({ user: null });

  const db = getDb();
  const user = db.prepare('SELECT id, username, display_name, email, role, phone, bio, avatar_url FROM admins WHERE id = ?').get(userInfo.id) as any;
  if (!user) return Response.json({ user: null });

  return Response.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name || '',
    email: user.email || '',
    role: user.role || '',
    phone: user.phone || '',
    bio: user.bio || '',
    avatarUrl: user.avatar_url || '',
  });
};

/** PUT — 프로필 수정 */
export const PUT: APIRoute = async ({ request }) => {
  const cookie = request.headers.get('cookie');
  const sessionId = verifySession(getSessionIdFromCookie(cookie));
  if (!sessionId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const userInfo = getUserInfo(sessionId);
  if (!userInfo) return Response.json({ error: 'User not found' }, { status: 404 });

  const body = await request.json();
  const displayName = sanitizeString((body.displayName || '').trim(), 50);
  const phone = sanitizeString((body.phone || '').trim(), 30);
  const bio = sanitizeString((body.bio || '').trim(), 300);

  const db = getDb();
  db.prepare('UPDATE admins SET display_name = ?, phone = ?, bio = ? WHERE id = ?').run(
    displayName, phone, bio, userInfo.id
  );

  return Response.json({ ok: true });
};
