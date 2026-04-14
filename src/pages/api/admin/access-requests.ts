import type { APIRoute } from 'astro';
import getDb from '../../../lib/db';
import { verifySession, getSessionIdFromCookie, getUserInfo } from '../../../lib/auth';

export const prerender = false;

/** GET: 관리자 — 접근 요청 목록 조회 */
export const GET: APIRoute = async ({ request }) => {
  const cookie = request.headers.get('cookie');
  const adminId = verifySession(getSessionIdFromCookie(cookie));
  if (!adminId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getUserInfo(adminId);
  if (!admin || admin.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const requests = getDb().prepare(`
    SELECT ar.id, ar.status, ar.created_at, ar.resolved_at, ar.page,
           a.username, a.display_name, a.email, a.role as user_role
    FROM access_requests ar
    JOIN admins a ON ar.user_id = a.id
    ORDER BY ar.created_at DESC
    LIMIT 50
  `).all();

  return Response.json(requests);
};

/** POST: 관리자 — 요청 승인/거절 */
export const POST: APIRoute = async ({ request }) => {
  const cookie = request.headers.get('cookie');
  const adminId = verifySession(getSessionIdFromCookie(cookie));
  if (!adminId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getUserInfo(adminId);
  if (!admin || admin.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { requestId, action } = await request.json();

  if (!requestId || !['approve', 'reject'].includes(action)) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const req = getDb().prepare(
    'SELECT ar.*, a.username FROM access_requests ar JOIN admins a ON ar.user_id = a.id WHERE ar.id = ? AND ar.status = ?'
  ).get(requestId, 'pending') as { id: number; user_id: number; status: string; page: string; username: string } | undefined;

  if (!req) {
    return Response.json({ error: '요청을 찾을 수 없거나 이미 처리되었습니다' }, { status: 404 });
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';

  getDb().prepare(
    'UPDATE access_requests SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?'
  ).run(newStatus, Date.now(), adminId, requestId);

  // 승인 시 — 역할은 변경하지 않고 approved 상태만 유지 (hasDetailAccess로 확인)

  const pageLabel = (req as any).page || 'all';
  getDb().prepare(
    'INSERT INTO audit_logs (admin_id, action, detail, created_at) VALUES (?, ?, ?, ?)'
  ).run(adminId, `access_${action}`, `${req.username} [${pageLabel}] 열람 요청 ${action === 'approve' ? '승인' : '거절'}`, Date.now());

  return Response.json({ ok: true, message: action === 'approve' ? '승인되었습니다' : '거절되었습니다' });
};

/** DELETE: 관리자 — 요청 거절(삭제) 또는 승인된 권한 회수 */
export const DELETE: APIRoute = async ({ request }) => {
  const cookie = request.headers.get('cookie');
  const adminId = verifySession(getSessionIdFromCookie(cookie));
  if (!adminId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getUserInfo(adminId);
  if (!admin || admin.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { requestId, action } = await request.json();
  if (!requestId) return Response.json({ error: 'Invalid request' }, { status: 400 });

  const req = getDb().prepare(
    'SELECT ar.*, a.username FROM access_requests ar JOIN admins a ON ar.user_id = a.id WHERE ar.id = ?'
  ).get(requestId) as { id: number; username: string; page: string; status: string } | undefined;

  if (!req) return Response.json({ error: '요청을 찾을 수 없습니다' }, { status: 404 });

  getDb().prepare('DELETE FROM access_requests WHERE id = ?').run(requestId);

  const label = action === 'revoke' ? '권한 회수' : '거절(삭제)';
  getDb().prepare(
    'INSERT INTO audit_logs (admin_id, action, detail, created_at) VALUES (?, ?, ?, ?)'
  ).run(adminId, `access_${action || 'delete'}`, `${req.username} [${req.page || 'all'}] ${label}`, Date.now());

  return Response.json({ ok: true, message: label + ' 완료' });
};
