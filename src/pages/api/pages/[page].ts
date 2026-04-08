import type { APIRoute } from 'astro';
import { verifySession, getSessionIdFromCookie } from '../../../lib/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const prerender = false;

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
  if (!verifySession(getSessionIdFromCookie(cookie))) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const fp = resolveFile(params.page ?? '');
  if (!fp) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(JSON.parse(fs.readFileSync(fp, 'utf-8')));
};

export const PUT: APIRoute = async ({ params, request }) => {
  const cookie = request.headers.get('cookie');
  if (!verifySession(getSessionIdFromCookie(cookie))) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const fp = resolveFile(params.page ?? '');
  if (!fp) return Response.json({ error: 'Not found' }, { status: 404 });
  const body = await request.json();
  fs.writeFileSync(fp, JSON.stringify(body, null, 2) + '\n');
  return Response.json({ ok: true });
};
