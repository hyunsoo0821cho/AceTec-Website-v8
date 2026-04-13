import type { APIRoute } from 'astro';
import { verifySession, getSessionIdFromCookie, getUserInfo } from '../../../lib/auth';
import fs from 'fs';
import path from 'path';

export const prerender = false;

const root = process.cwd();

export const POST: APIRoute = async ({ request }) => {
  const cookie = request.headers.get('cookie');
  const sessionId = verifySession(getSessionIdFromCookie(cookie));
  if (!sessionId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const info = getUserInfo(sessionId);
  if (!info || info.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { title, subtitle, description } = body;
  if (!title) return Response.json({ error: 'Title required' }, { status: 400 });

  // slug 생성: 한글/영문 → kebab-case
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || `solution-${Date.now()}`;

  const productFile = path.join(root, 'src', 'content', 'products', `${slug}.json`);
  if (fs.existsSync(productFile)) {
    return Response.json({ error: 'Category already exists' }, { status: 409 });
  }

  // 제품 JSON 생성
  const productData = {
    category: slug,
    title: title,
    pageTitle: `${title} - AceTec`,
    description: description || '',
    items: [],
    sections: [
      {
        title: 'Products',
        products: [],
      },
    ],
  };
  fs.writeFileSync(productFile, JSON.stringify(productData, null, 2) + '\n');

  // home.json solutionCards에 추가
  const homeFile = path.join(root, 'src', 'content', 'pages', 'home.json');
  const home = JSON.parse(fs.readFileSync(homeFile, 'utf-8'));
  home.solutionCards.push({
    title: title,
    subtitle: subtitle || '',
    description: description || '',
    image: '',
    href: `/products/${slug}`,
    subcategories: [],
  });
  fs.writeFileSync(homeFile, JSON.stringify(home, null, 2) + '\n');

  // solutions.json solutionCards에도 추가
  const solFile = path.join(root, 'src', 'content', 'pages', 'solutions.json');
  if (fs.existsSync(solFile)) {
    const sol = JSON.parse(fs.readFileSync(solFile, 'utf-8'));
    if (Array.isArray(sol.solutionCards)) {
      sol.solutionCards.push({
        title: title,
        subtitle: subtitle || '',
        description: description || '',
        image: '',
        href: `/products/${slug}`,
        subcategories: [],
      });
      fs.writeFileSync(solFile, JSON.stringify(sol, null, 2) + '\n');
    }
  }

  // pages API 화이트리스트에는 products- prefix로 자동 대응

  return Response.json({ ok: true, slug, href: `/products/${slug}` });
};
