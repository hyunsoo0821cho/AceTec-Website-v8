import type { APIRoute } from 'astro';
import { verifySession, getSessionIdFromCookie } from '../../../lib/auth';
import getDb from '../../../lib/db';
import bcrypt from 'bcryptjs';
import { maskAdminRow, type AdminRow } from '../../../lib/pii-mask';

export const prerender = false;

function auth(request: Request) {
  const cookie = request.headers.get('cookie');
  return verifySession(getSessionIdFromCookie(cookie));
}

// 사용자 목록(마스킹) / 단일 상세(언마스킹 + 감사 로그)
// GET                  → 전체 목록 (이메일·전화 마스킹)
// GET ?id=X            → ID X 상세 (언마스킹 + audit_logs 기록)
// GET ?unmask=1        → 전체 목록 언마스킹 (편집 화면 등, audit_logs 기록)
export const GET: APIRoute = async ({ request }) => {
  const adminId = auth(request);
  if (!adminId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const detailId = url.searchParams.get('id');
  const unmask = url.searchParams.get('unmask') === '1';
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  if (detailId) {
    const row = getDb().prepare('SELECT id, username, role, display_name, email, phone, bio, avatar_url FROM admins WHERE id = ?').get(detailId) as AdminRow | undefined;
    if (!row) return Response.json({ error: 'Not found' }, { status: 404 });
    getDb().prepare('INSERT INTO audit_logs (admin_id, action, detail, created_at) VALUES (?, ?, ?, ?)').run(
      adminId, 'pii_unmask_read', `target_user_id=${detailId} | IP: ${ip}`, Date.now()
    );
    return Response.json(row);
  }

  const rows = getDb().prepare('SELECT id, username, role, display_name, email, phone, bio, avatar_url FROM admins ORDER BY id').all() as AdminRow[];
  if (unmask) {
    getDb().prepare('INSERT INTO audit_logs (admin_id, action, detail, created_at) VALUES (?, ?, ?, ?)').run(
      adminId, 'pii_unmask_list', `count=${rows.length} | IP: ${ip}`, Date.now()
    );
    return Response.json(rows);
  }
  return Response.json(rows.map((r) => maskAdminRow(r)));
};

// 사용자 생성
export const POST: APIRoute = async ({ request }) => {
  if (!auth(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const { username, password, role, display_name } = body;
  if (!username || !password) return Response.json({ error: 'Username and password required' }, { status: 400 });
  const hash = bcrypt.hashSync(password, 10);
  try {
    getDb().prepare('INSERT INTO admins (username, password_hash, role, display_name) VALUES (?, ?, ?, ?)').run(username, hash, role || 'customer', display_name || '');
    // 감사 로그
    getDb().prepare('INSERT INTO audit_logs (action, detail, created_at) VALUES (?, ?, ?)').run('user_create', `Created user: ${username} (${role || 'customer'})`, Date.now());
    return Response.json({ ok: true });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return Response.json({ error: 'Username already exists' }, { status: 409 });
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
};

// 사용자 수정
export const PUT: APIRoute = async ({ request }) => {
  if (!auth(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const { id, username, password, role, display_name, phone, bio } = body;
  if (!id) return Response.json({ error: 'ID required' }, { status: 400 });
  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    getDb().prepare('UPDATE admins SET username = ?, password_hash = ?, role = ?, display_name = ?, phone = ?, bio = ? WHERE id = ?').run(username, hash, role, display_name || '', phone || '', bio || '', id);
  } else {
    getDb().prepare('UPDATE admins SET username = ?, role = ?, display_name = ?, phone = ?, bio = ? WHERE id = ?').run(username, role, display_name || '', phone || '', bio || '', id);
  }
  getDb().prepare('INSERT INTO audit_logs (action, detail, created_at) VALUES (?, ?, ?)').run('user_update', `Updated user #${id}: ${username}`, Date.now());
  return Response.json({ ok: true });
};

// 사용자 삭제
export const DELETE: APIRoute = async ({ request }) => {
  if (!auth(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return Response.json({ error: 'ID required' }, { status: 400 });
  // 세션도 삭제
  getDb().prepare('DELETE FROM sessions WHERE admin_id = ?').run(id);
  const user = getDb().prepare('SELECT username FROM admins WHERE id = ?').get(id) as any;
  getDb().prepare('DELETE FROM admins WHERE id = ?').run(id);
  getDb().prepare('INSERT INTO audit_logs (action, detail, created_at) VALUES (?, ?, ?)').run('user_delete', `Deleted user: ${user?.username || id}`, Date.now());
  return Response.json({ ok: true });
};
