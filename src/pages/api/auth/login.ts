import type { APIRoute } from 'astro';
import { verifyPassword, createSession, sessionCookie, getUserInfo } from '../../../lib/auth';
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

  const adminId = verifyPassword(username, password);
  if (!adminId) {
    if (isJson) {
      return Response.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, { status: 401 });
    }
    return new Response(null, {
      status: 302,
      headers: { Location: '/login?error=invalid' },
    });
  }

  const sid = createSession(adminId);

  // Audit log: 로그인 기록
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const ua = request.headers.get('user-agent') || 'unknown';
  const userInfo = getUserInfo(sid);
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
