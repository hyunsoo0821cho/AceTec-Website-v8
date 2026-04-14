import type { APIRoute } from 'astro';
import { verifyPassword, createSession, sessionCookie, getUserInfo, isAccountLocked, recordFailedLogin, resetFailedLogin } from '../../../lib/auth';
import getDb from '../../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  const contentType = request.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let username = '';
  let password = '';

  if (isJson) {
    const body = await request.json();
    username = body.username || body.email || '';
    password = body.password || '';
  } else {
    const form = await request.formData();
    username = form.get('username')?.toString() ?? '';
    password = form.get('password')?.toString() ?? '';
  }

  if (!username || !password) {
    if (isJson) {
      return Response.json({ error: '이메일과 비밀번호를 입력해주세요' }, { status: 400 });
    }
    return new Response(null, {
      status: 302,
      headers: { Location: '/login?error=missing' },
    });
  }

  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const ua = request.headers.get('user-agent') || 'unknown';

  // 계정 잠금 확인 (브루트포스 방어)
  if (isAccountLocked(username)) {
    getDb().prepare('INSERT INTO audit_logs (action, detail, created_at) VALUES (?, ?, ?)').run(
      'login_locked', `Locked account login attempt: ${username} | IP: ${ip}`, Date.now()
    );
    const msg = '계정이 일시적으로 잠겼습니다. 30분 후 다시 시도하세요';
    if (isJson) return Response.json({ error: msg }, { status: 423 });
    return new Response(null, { status: 302, headers: { Location: '/login?error=locked' } });
  }

  const adminId = verifyPassword(username, password);
  if (!adminId) {
    // 실패 카운트 증가 + 감사 로그
    const lockInfo = recordFailedLogin(username);
    getDb().prepare('INSERT INTO audit_logs (action, detail, created_at) VALUES (?, ?, ?)').run(
      'login_failed',
      `Failed login: ${username} | attempts=${lockInfo.attempts}${lockInfo.locked ? ' | LOCKED 30min' : ''} | IP: ${ip} | ${ua.substring(0, 120)}`,
      Date.now()
    );
    if (isJson) {
      return Response.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, { status: 401 });
    }
    return new Response(null, {
      status: 302,
      headers: { Location: '/login?error=invalid' },
    });
  }

  // pending 계정은 로그인 차단 (관리자 승인 전)
  const loginUser = getUserInfo(adminId);
  if (loginUser && loginUser.role === 'pending') {
    const msg = '계정 승인 대기 중입니다. 관리자 승인 후 로그인 가능합니다';
    if (isJson) return Response.json({ error: msg }, { status: 403 });
    return new Response(null, { status: 302, headers: { Location: '/login?error=pending' } });
  }

  // 로그인 성공 → 실패 카운트 초기화
  resetFailedLogin(adminId);

  const sid = createSession(adminId);

  // Audit log: 로그인 기록 (ip/ua는 이미 위에서 정의됨)
  const userInfo = getUserInfo(adminId);
  const displayName = userInfo?.display_name || username;
  const role = userInfo?.role || '';
  getDb().prepare('INSERT INTO audit_logs (admin_id, action, detail, created_at) VALUES (?, ?, ?, ?)').run(
    adminId, 'login', `${displayName} (${role}) 로그인 | IP: ${ip} | ${ua.substring(0, 120)}`, Date.now()
  );

  if (isJson) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': sessionCookie(sid),
      },
    });
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': sessionCookie(sid),
    },
  });
};
