import type { APIRoute } from 'astro';
import { verifySession, getSessionIdFromCookie } from '../../../lib/auth';
import getDb from '../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const cookie = request.headers.get('cookie');
  if (!verifySession(getSessionIdFromCookie(cookie))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const dayMs = 86400000;
  const todayStart = now - (now % dayMs); // UTC 기준 오늘 0시
  const monthStart = todayStart - 30 * dayMs;
  const yearStart = todayStart - 365 * dayMs;

  const db = getDb();

  // 방문자 수 (고유 IP 기준)
  const daily = (db.prepare('SELECT COUNT(DISTINCT ip) as cnt FROM visitor_logs WHERE created_at >= ?').get(todayStart) as any)?.cnt || 0;
  const monthly = (db.prepare('SELECT COUNT(DISTINCT ip) as cnt FROM visitor_logs WHERE created_at >= ?').get(monthStart) as any)?.cnt || 0;
  const yearly = (db.prepare('SELECT COUNT(DISTINCT ip) as cnt FROM visitor_logs WHERE created_at >= ?').get(yearStart) as any)?.cnt || 0;

  // 총 페이지뷰
  const dailyViews = (db.prepare('SELECT COUNT(*) as cnt FROM visitor_logs WHERE created_at >= ?').get(todayStart) as any)?.cnt || 0;
  const monthlyViews = (db.prepare('SELECT COUNT(*) as cnt FROM visitor_logs WHERE created_at >= ?').get(monthStart) as any)?.cnt || 0;

  // 최근 감사 로그
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 30').all();

  // 계정 수 by role
  const roleCounts = db.prepare("SELECT role, COUNT(*) as cnt FROM admins GROUP BY role").all();

  return Response.json({
    visitors: { daily, monthly, yearly },
    pageViews: { daily: dailyViews, monthly: monthlyViews },
    logs,
    roleCounts,
  });
};
