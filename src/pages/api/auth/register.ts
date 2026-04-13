import type { APIRoute } from 'astro';
import getDb from '../../../lib/db';
import bcrypt from 'bcryptjs';
import { validatePassword } from '../../../lib/password-policy';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { email, code, password, displayName, phone } = body;

  if (!email || !code || !password) {
    return Response.json({ error: 'All fields required' }, { status: 400 });
  }

  const pwCheck = validatePassword(password);
  if (!pwCheck.ok) {
    return Response.json({ error: pwCheck.error }, { status: 400 });
  }

  // 인증 코드 확인
  const record = getDb().prepare(
    'SELECT * FROM verification_codes WHERE email = ? AND code = ? AND purpose = ? AND used = 0 AND expires_at > ?'
  ).get(email, code, 'register', Date.now()) as any;

  if (!record) {
    return Response.json({ error: '인증 코드가 유효하지 않거나 만료되었습니다' }, { status: 400 });
  }

  // 코드 사용 처리
  getDb().prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(record.id);

  // 중복 체크
  const username = email.split('@')[0];
  const existing = getDb().prepare('SELECT id FROM admins WHERE email = ? OR username = ?').get(email, username);
  if (existing) {
    return Response.json({ error: '이미 등록된 계정입니다' }, { status: 409 });
  }

  // 계정 생성
  const hash = bcrypt.hashSync(password, 10);
  const role = record.role || 'person';

  getDb().prepare(
    'INSERT INTO admins (username, password_hash, role, display_name, email, phone) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(username, hash, role, displayName || username, email, phone || '');

  // 감사 로그
  getDb().prepare('INSERT INTO audit_logs (action, detail, created_at) VALUES (?, ?, ?)').run(
    'user_register', `Self-registered: ${username} (${role})`, Date.now()
  );

  return Response.json({ ok: true, message: '회원가입이 완료되었습니다' });
};
