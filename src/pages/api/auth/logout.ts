import type { APIRoute } from 'astro';
import { verifySession, getSessionIdFromCookie, getUserInfo, clearCookie } from '../../../lib/auth';
import getDb from '../../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  // 로그아웃 전 사용자 정보 기록
  const cookie = request.headers.get('cookie');
  const sessionId = verifySession(getSessionIdFromCookie(cookie));
  if (sessionId) {
    const userInfo = getUserInfo(sessionId);
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const displayName = userInfo?.display_name || userInfo?.username || 'unknown';
    const role = userInfo?.role || '';
    getDb().prepare('INSERT INTO audit_logs (admin_id, action, detail, created_at) VALUES (?, ?, ?, ?)').run(
      userInfo?.id || 0, 'logout', `${displayName} (${role}) 로그아웃 | IP: ${ip}`, Date.now()
    );
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': clearCookie(),
    },
  });
};
