import type { APIRoute } from 'astro';
import { verifySession, getSessionIdFromCookie, getUserInfo } from '../../../lib/auth';
import getDb from '../../../lib/db';

export const prerender = false;

export const DELETE: APIRoute = async ({ request }) => {
  const cookie = request.headers.get('cookie');
  const sessionId = verifySession(getSessionIdFromCookie(cookie));
  if (!sessionId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const userInfo = getUserInfo(sessionId);
  if (!userInfo || userInfo.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const db = getDb();
  db.prepare('DELETE FROM audit_logs').run();
  db.prepare('INSERT INTO audit_logs (admin_id, action, detail, created_at) VALUES (?, ?, ?, ?)').run(
    userInfo.id, 'logs_clear', `${userInfo.display_name || userInfo.username} 로그 초기화`, Date.now()
  );

  return Response.json({ ok: true });
};
