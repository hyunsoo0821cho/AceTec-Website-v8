import type { APIRoute } from 'astro';
import getDb from '../../../lib/db';
import { generateCode, sendVerificationEmail } from '../../../lib/email';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { email, purpose, role } = body;

  if (!email || !purpose) {
    return Response.json({ error: 'Email and purpose required' }, { status: 400 });
  }

  if (!['register', 'reset'].includes(purpose)) {
    return Response.json({ error: 'Invalid purpose' }, { status: 400 });
  }

  // 회원가입 시 중복 체크
  if (purpose === 'register') {
    const existing = getDb().prepare('SELECT id FROM admins WHERE email = ? OR username = ?').get(email, email.split('@')[0]);
    if (existing) {
      return Response.json({ error: '이미 등록된 이메일입니다' }, { status: 409 });
    }
  }

  // 비밀번호 재설정 시 계정 존재 확인
  if (purpose === 'reset') {
    const user = getDb().prepare('SELECT id FROM admins WHERE email = ? OR username = ?').get(email, email.split('@')[0]);
    if (!user) {
      return Response.json({ error: '등록되지 않은 이메일입니다' }, { status: 404 });
    }
  }

  // 이전 미사용 코드 만료 처리
  getDb().prepare('UPDATE verification_codes SET used = 1 WHERE email = ? AND purpose = ? AND used = 0').run(email, purpose);

  // 새 코드 생성 (10분 유효)
  const code = generateCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  getDb().prepare('INSERT INTO verification_codes (email, code, purpose, role, expires_at) VALUES (?, ?, ?, ?, ?)').run(email, code, purpose, role || null, expiresAt);

  // 이메일 발송
  const sent = await sendVerificationEmail(email, code, purpose);

  // SMTP 미설정 시 코드를 응답에 포함 (개발용)
  const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
  if (smtpConfigured) {
    return Response.json({ ok: true, message: '인증 코드가 이메일로 발송되었습니다' });
  } else {
    return Response.json({ ok: true, message: '인증 코드가 생성되었습니다', devCode: code });
  }
};
