import type { APIRoute } from 'astro';
import getDb from '../../lib/db';
import { verifySession, getSessionIdFromCookie, getUserInfo, hasDetailAccess } from '../../lib/auth';

export const prerender = false;

/** 페이지 이름 -> 한국어 표시 이름 매핑 */
const PAGE_LABELS: Record<string, string> = {
  military: '군수항공분야',
  railway: '철도분야',
  industrial: '자동화분야',
  telecom: '정보통신분야',
  sensor: '모델링 & 시뮬레이션 분야',
  hpc: '슈퍼컴퓨팅시스템분야',
  ipc: '산업용컴퓨터분야',
  radar: '레이더',
  interconnect: '초고속 데이터 인터커넥트',
  catalog: '전체 제품 카탈로그',
};

/** POST: 비admin 사용자가 특정 페이지 설명 열람 권한 요청 */
export const POST: APIRoute = async ({ request }) => {
  const cookie = request.headers.get('cookie');
  const adminId = verifySession(getSessionIdFromCookie(cookie));
  if (!adminId) {
    return Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const page = (body as any).page || 'all';

  const user = getUserInfo(adminId);
  if (!user) {
    return Response.json({ error: '사용자 정보를 찾을 수 없습니다' }, { status: 400 });
  }
  if (user.role === 'admin') {
    return Response.json({ error: '관리자는 이미 열람 권한이 있습니다' }, { status: 400 });
  }
  if (hasDetailAccess(adminId, page)) {
    return Response.json({ error: '이미 해당 페이지의 열람 권한이 승인되었습니다' }, { status: 400 });
  }

  // 이미 해당 페이지에 대기 중인 요청이 있는지 확인
  const existing = getDb().prepare(
    "SELECT id FROM access_requests WHERE user_id = ? AND status = 'pending' AND page = ?"
  ).get(adminId, page);

  if (existing) {
    return Response.json({ error: '이미 해당 페이지에 대한 요청이 접수되어 있습니다. 관리자 승인을 기다려주세요.' }, { status: 409 });
  }

  const pageLabel = PAGE_LABELS[page] || page;

  getDb().prepare(
    'INSERT INTO access_requests (user_id, status, created_at, page) VALUES (?, ?, ?, ?)'
  ).run(adminId, 'pending', Date.now(), page);

  getDb().prepare(
    'INSERT INTO audit_logs (admin_id, action, detail, created_at) VALUES (?, ?, ?, ?)'
  ).run(adminId, 'access_request', `${user.username} (${user.role}) [${pageLabel}] 열람 요청`, Date.now());

  return Response.json({ ok: true, message: `[${pageLabel}] 요청이 접수되었습니다. 관리자 승인을 기다려주세요.` });
};
