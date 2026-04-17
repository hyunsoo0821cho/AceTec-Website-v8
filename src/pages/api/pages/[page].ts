import type { APIRoute } from 'astro';
import { verifySession, getSessionIdFromCookie, getUserInfo } from '../../../lib/auth';
import fs from 'fs';
import path from 'path';

export const prerender = false;

/** 관리자(role='admin') 여부를 검증하고 sessionId 또는 null 을 반환. */
function requireAdmin(cookie: string | null): number | null {
  const adminId = verifySession(getSessionIdFromCookie(cookie));
  if (!adminId) return null;
  const user = getUserInfo(adminId);
  return user && user.role === 'admin' ? adminId : null;
}

const root = process.cwd();
const pagesDir = path.join(root, 'src', 'content', 'pages');
const productsDir = path.join(root, 'src', 'content', 'products');
const historyDir = path.join(root, 'src', 'content', 'history');

function resolveFile(page: string): string | null {
  const pagesAllowed = ['home', 'about', 'solutions', 'contact', 'footer', 'applications', 'catalog', 'megamenu'];
  if (pagesAllowed.includes(page)) {
    const fp = path.join(pagesDir, page + '.json');
    return fs.existsSync(fp) ? fp : null;
  }
  if (page === 'history') {
    const fp = path.join(historyDir, 'timeline.json');
    return fs.existsSync(fp) ? fp : null;
  }
  if (page.startsWith('products-')) {
    const cat = page.replace('products-', '');
    const fp = path.join(productsDir, cat + '.json');
    return fs.existsSync(fp) ? fp : null;
  }
  return null;
}

export const GET: APIRoute = async ({ params, request }) => {
  const cookie = request.headers.get('cookie');
  // 읽기: 로그인한 사용자면 허용 (CMS 편집 UI용). 쓰기는 별도 admin 체크.
  if (!verifySession(getSessionIdFromCookie(cookie))) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const fp = resolveFile(params.page ?? '');
  if (!fp) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(JSON.parse(fs.readFileSync(fp, 'utf-8')));
};

export const PUT: APIRoute = async ({ params, request }) => {
  const cookie = request.headers.get('cookie');
  // CMS 쓰기는 관리자 전용 — 일반 사용자 콘텐츠 변조 차단
  if (!requireAdmin(cookie)) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const fp = resolveFile(params.page ?? '');
  if (!fp) return Response.json({ error: 'Not found' }, { status: 404 });
  const body = await request.json();
  fs.writeFileSync(fp, JSON.stringify(body, null, 2) + '\n');
  return Response.json({ ok: true });
};
