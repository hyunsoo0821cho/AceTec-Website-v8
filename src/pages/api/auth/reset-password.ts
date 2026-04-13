import type { APIRoute } from 'astro';
import getDb from '../../../lib/db';
import bcrypt from 'bcryptjs';
import { validatePassword } from '../../../lib/password-policy';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { email, code, newPassword } = body;

  if (!email || !code || !newPassword) {
    return Response.json({ error: 'All fields required' }, { status: 400 });
  }

  const pwCheck = validatePassword(newPassword);
  if (!pwCheck.ok) {
    return Response.json({ error: pwCheck.error }, { status: 400 });
  }

  // 인증 코드 확인
  const record = getDb().prepare(
    'SELECT * FROM verification_codes WHERE email = ? AND code = ? AND purpose = ? AND used = 0 AND expires_at > ?'
  ).get(email, code, 'reset', Date.now()) as any;

  if (!record) {
    return Response.json({ error: '인증 코드가 유효하지 않거나 만료되었습니다' }, { status: 400 });
  }

  // 코드 사용 처리
  getDb().prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(record.id);

  // 사용자 찾기 (email 또는 username으로)
  const user = getDb().prepare('SELECT id, username FROM admins WHERE email = ? OR username = ?').get(email, email.split('@')[0]) as any;
  if (!user) {
    return Response.json({ error: '계정을 찾을 수 없습니다' }, { status: 404 });
  }

  // 비밀번호 변경
  const hash = bcrypt.hashSync(newPassword, 10);
  getDb().prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, user.id);

  // 기존 세션 모두 삭제
  getDb().prepare('DELETE FROM sessions WHERE admin_id = ?').run(user.id);

  // 감사 로그
  getDb().prepare('INSERT INTO audit_logs (action, detail, created_at) VALUES (?, ?, ?)').run(
    'password_reset', `Password reset: ${user.username}`, Date.now()
  );

  return Response.json({ ok: true, message: '비밀번호가 변경되었습니다' });
};
