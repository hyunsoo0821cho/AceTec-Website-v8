import type { APIRoute } from 'astro';
import { verifySession, getSessionIdFromCookie, getUserInfo, deleteSession, clearCookie } from '../../../lib/auth';
import getDb from '../../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  const cookie = request.headers.get('cookie');
  const sid = getSessionIdFromCookie(cookie);
  const adminId = verifySession(sid);
  if (adminId) {
    const userInfo = getUserInfo(adminId);
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const displayName = userInfo?.display_name || userInfo?.username || 'unknown';
    const role = userInfo?.role || '';
    getDb().prepare('INSERT INTO audit_logs (admin_id, action, detail, created_at) VALUES (?, ?, ?, ?)').run(
      userInfo?.id || 0, 'logout', `${displayName} (${role}) 로그아웃 | IP: ${ip}`, Date.now()
    );
    // 서버 측 세션 삭제 (쿠키 제거만으로는 탈취된 세션이 24시간 유효)
    if (sid) deleteSession(sid);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': clearCookie(),
    },
  });
};
