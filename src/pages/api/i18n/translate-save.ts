import type { APIRoute } from 'astro';
import { verifySession, getSessionIdFromCookie } from '../../../lib/auth';
import fs from 'fs';
import path from 'path';

export const prerender = false;

const i18nDir = path.join(process.cwd(), 'src', 'i18n');
const TARGETS = ['en', 'ja', 'zh-TW', 'ar', 'fr', 'de', 'es'] as const;

function setNested(obj: Record<string, unknown>, keyPath: string, value: string): void {
  const parts = keyPath.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (current[k] === undefined || current[k] === null || typeof current[k] !== 'object') {
      current[k] = {};
    }
    current = current[k] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

async function gTranslate(texts: string[], target: string): Promise<string[]> {
  if (texts.length === 0) return [];
  const BATCH = 40;
  const out: string[] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const query = batch.map((t) => `q=${encodeURIComponent(t)}`).join('&');
    const url = `https://translate.googleapis.com/translate_a/t?client=gtx&sl=ko&tl=${target}&${query}`;
    try {
      const res = await fetch(url);
      const data = (await res.json()) as unknown;
      if (Array.isArray(data)) {
        if (batch.length === 1) {
          const first = (data as unknown[])[0];
          out.push(typeof first === 'string' ? first : ((first as unknown[])?.[0] as string) || batch[0]);
        } else {
          batch.forEach((t, j) => {
            const item = (data as unknown[])[j];
            out.push(typeof item === 'string' ? item : ((item as unknown[])?.[0] as string) || t);
          });
        }
      } else {
        out.push(...batch);
      }
    } catch {
      out.push(...batch);
    }
    if (i + BATCH < texts.length) await new Promise((r) => setTimeout(r, 150));
  }
  return out;
}

/**
 * POST { updates: { "catalog.title": "새 제목", ... } }
 * 1) ko.json 에 저장
 * 2) 나머지 6개 언어로 Google Translate 번역하여 각 언어 JSON 에 저장
 * 기술파트너(partners.*) 키는 번역 스킵 — 사용자 요구사항
 */
export const POST: APIRoute = async ({ request }) => {
  const cookie = request.headers.get('cookie');
  if (!verifySession(getSessionIdFromCookie(cookie))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { updates?: Record<string, string> } | null;
  const updates = body?.updates;
  if (!updates || typeof updates !== 'object') {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  const SKIP_PREFIXES = ['partners.', 'lang.'];
  const keys = Object.keys(updates).filter((k) => !SKIP_PREFIXES.some((p) => k.startsWith(p)));
  if (keys.length === 0) return Response.json({ ok: true, translated: 0 });

  // 1) ko.json 저장
  const koPath = path.join(i18nDir, 'ko.json');
  const koData = JSON.parse(fs.readFileSync(koPath, 'utf-8')) as Record<string, unknown>;
  for (const key of keys) {
    const v = updates[key];
    if (typeof v === 'string') setNested(koData, key, v);
  }
  fs.writeFileSync(koPath, JSON.stringify(koData, null, 2) + '\n');

  // 2) 나머지 언어: 번역 후 저장 (병렬)
  const koTexts = keys.map((k) => updates[k]);
  await Promise.all(
    TARGETS.map(async (lang) => {
      const langPath = path.join(i18nDir, `${lang}.json`);
      if (!fs.existsSync(langPath)) return;
      const translated = await gTranslate(koTexts, lang);
      const data = JSON.parse(fs.readFileSync(langPath, 'utf-8')) as Record<string, unknown>;
      keys.forEach((k, i) => {
        const t = translated[i];
        if (typeof t === 'string' && t.length > 0) setNested(data, k, t);
      });
      fs.writeFileSync(langPath, JSON.stringify(data, null, 2) + '\n');
    }),
  );

  return Response.json({ ok: true, translated: keys.length });
};
