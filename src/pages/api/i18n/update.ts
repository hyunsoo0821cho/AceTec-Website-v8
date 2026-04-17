import type { APIRoute } from 'astro';
import { verifySession, getSessionIdFromCookie, getUserInfo } from '../../../lib/auth';
import fs from 'fs';
import path from 'path';

export const prerender = false;

const i18nDir = path.join(process.cwd(), 'src', 'i18n');

function setNestedValue(obj: Record<string, unknown>, keyPath: string, value: string): void {
  const parts = keyPath.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current[parts[i]] === undefined || current[parts[i]] === null || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

/** POST { lang: "ko", updates: { "home.heroTitle": "새 제목", ... } } */
export const POST: APIRoute = async ({ request }) => {
  const cookie = request.headers.get('cookie');
  const adminId = verifySession(getSessionIdFromCookie(cookie));
  if (!adminId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // 번역 파일 수정은 관리자 전용 — 일반 사용자 차단
  const user = getUserInfo(adminId);
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { lang, updates } = await request.json();
  if (!lang || typeof updates !== 'object') {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  // 보안: 허용된 언어만
  const allowed = ['ko', 'en', 'ja', 'zh-TW', 'ar', 'fr', 'de', 'es'];
  if (!allowed.includes(lang)) {
    return Response.json({ error: 'Unsupported language' }, { status: 400 });
  }

  const filePath = path.join(i18nDir, `${lang}.json`);
  if (!fs.existsSync(filePath)) {
    return Response.json({ error: 'Language file not found' }, { status: 404 });
  }

  // ko.json 번역 보호: nav/products/footer 핵심 키는 덮어쓰기 차단
  const PROTECTED_PREFIXES_KO = [
    'nav.solutions', 'nav.applications', 'nav.about', 'nav.history', 'nav.contact',
    'nav.login', 'nav.inquiry', 'nav.productsIntro',
    'products.military', 'products.railway', 'products.telecom', 'products.industrial',
    'products.sensor', 'products.hpc', 'products.radar', 'products.ipc', 'products.interconnect',
    'footer.seoulHQ', 'footer.daejeonBranch', 'footer.corpName', 'footer.ceoName',
  ];

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === 'string') {
      // ko.json 보호 키는 영어 값으로 덮어쓰기 차단
      if (lang === 'ko' && PROTECTED_PREFIXES_KO.includes(key)) {
        const hasKorean = /[\uAC00-\uD7AF]/.test(value);
        if (!hasKorean) continue; // 한국어가 없으면 스킵 (영어 덮어쓰기 방지)
      }
      setNestedValue(data, key, value);
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  return Response.json({ ok: true });
};
