/**
 * i18n 시스템 — 클라이언트 사이드 다국어 지원
 * localStorage 기반 언어 전환, 브라우저 언어 자동 감지
 */

// 지원 언어 목록 (중국어 简体 제외)
export const LANGUAGES = [
  { code: 'ko', label: '한국어', dir: 'ltr' },
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ja', label: '日本語', dir: 'ltr' },
  { code: 'zh-TW', label: '繁體中文', dir: 'ltr' },
  { code: 'de', label: 'Deutsch', dir: 'ltr' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'es', label: 'Español', dir: 'ltr' },
  { code: 'pt', label: 'Português', dir: 'ltr' },
  { code: 'it', label: 'Italiano', dir: 'ltr' },
  { code: 'nl', label: 'Nederlands', dir: 'ltr' },
  { code: 'ru', label: 'Русский', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'th', label: 'ไทย', dir: 'ltr' },
  { code: 'vi', label: 'Tiếng Việt', dir: 'ltr' },
  { code: 'id', label: 'Bahasa Indonesia', dir: 'ltr' },
  { code: 'ms', label: 'Bahasa Melayu', dir: 'ltr' },
  { code: 'tr', label: 'Türkçe', dir: 'ltr' },
  { code: 'pl', label: 'Polski', dir: 'ltr' },
  { code: 'sv', label: 'Svenska', dir: 'ltr' },
  { code: 'hi', label: 'हिन्दी', dir: 'ltr' },
] as const;

export type LangCode = (typeof LANGUAGES)[number]['code'];

const STORAGE_KEY = 'acetec-lang';
const DEFAULT_LANG: LangCode = 'ko';

// All translation files loaded eagerly via static imports
import enData from './en.json';
import koData from './ko.json';
import jaData from './ja.json';
import zhTWData from './zh-TW.json';
import arData from './ar.json';
import frData from './fr.json';
import deData from './de.json';
import esData from './es.json';

const translations: Record<string, Record<string, unknown>> = {
  en: enData as Record<string, unknown>,
  ko: koData as Record<string, unknown>,
  ja: jaData as Record<string, unknown>,
  'zh-TW': zhTWData as Record<string, unknown>,
  ar: arData as Record<string, unknown>,
  fr: frData as Record<string, unknown>,
  de: deData as Record<string, unknown>,
  es: esData as Record<string, unknown>,
};

export function getCurrentLang(): LangCode {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && LANGUAGES.some((l) => l.code === saved)) return saved as LangCode;

  // Browser language detection
  const browserLang = navigator.language;
  // Map zh-TW, zh-Hant → zh-TW. Block zh-CN, zh-Hans → fallback to en
  if (browserLang.startsWith('zh')) {
    if (browserLang.includes('TW') || browserLang.includes('Hant')) return 'zh-TW';
    return DEFAULT_LANG; // Block simplified Chinese
  }
  const shortCode = browserLang.split('-')[0];
  const match = LANGUAGES.find((l) => l.code === shortCode);
  return match ? match.code : DEFAULT_LANG;
}

export function setLang(code: LangCode) {
  localStorage.setItem(STORAGE_KEY, code);
  applyTranslations(code);
}

export async function loadTranslation(code: LangCode): Promise<Record<string, unknown>> {
  if (translations[code]) return translations[code];
  // Fallback to English for unsupported languages
  return translations['en'] || {};
}

// Get nested value: t('nav.solutions') → '솔루션'
export function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : path;
}

// ============================================================
// 자동 번역 (Google Translate, localStorage 캐시)
// ============================================================
// v5 — button/label/summary 등 구조적 컨테이너 번역 차단 (2026-04-13)
const AUTO_CACHE_KEY = 'acetec-auto-translate-v5';
const KOREAN_RE = /[\uAC00-\uD7AF]/;
const ENGLISH_RE = /[a-zA-Z]{3,}/;

function getAutoCache(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(AUTO_CACHE_KEY) || '{}'); } catch { return {}; }
}
function saveAutoCache(c: Record<string, string>) {
  // 캐시 크기 제한 (500KB)
  const str = JSON.stringify(c);
  if (str.length < 500000) localStorage.setItem(AUTO_CACHE_KEY, str);
}

async function googleTranslate(texts: string[], targetLang: string): Promise<string[]> {
  return gTranslate(texts, 'ko', targetLang);
}

/** 단일 배치 번역 */
async function translateBatch(batch: string[], srcLang: string, targetLang: string): Promise<string[]> {
  const query = batch.map((t) => `q=${encodeURIComponent(t)}`).join('&');
  try {
    const url = `https://translate.googleapis.com/translate_a/t?client=gtx&sl=${srcLang}&tl=${targetLang}&${query}`;
    const res = await fetch(url);
    const data = await res.json();
    if (Array.isArray(data)) {
      if (batch.length === 1) {
        return [typeof data[0] === 'string' ? data[0] : data[0][0] || batch[0]];
      }
      return batch.map((t, j) => {
        const item = data[j];
        return typeof item === 'string' ? item : item?.[0] || t;
      });
    }
  } catch { /* fallback below */ }
  return [...batch];
}

/** Google Translate 범용 — 모든 배치를 병렬로 요청 (첫 클릭 지연 최소화) */
async function gTranslate(texts: string[], srcLang: string, targetLang: string): Promise<string[]> {
  if (texts.length === 0) return [];
  const BATCH_SIZE = 50;
  const batches: string[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    batches.push(texts.slice(i, i + BATCH_SIZE));
  }
  const batchResults = await Promise.all(batches.map((b) => translateBatch(b, srcLang, targetLang)));
  return batchResults.flat();
}

// 현재 번역 언어 (탭 전환 시 히스토리 재번역용)
let _currentAutoLang = 'en';

/** 원문 언어 감지 (ko / en / null) */
function detectSrcLang(text: string): 'ko' | 'en' | null {
  if (KOREAN_RE.test(text)) return 'ko';
  if (ENGLISH_RE.test(text)) return 'en';
  return null;
}

/** 번역 대상 요소에 원문/소스언어 마커를 기록하고, 소스언어로 복원한 뒤 반환 */
function ensureMarked(el: HTMLElement, text: string): { src: 'ko' | 'en'; original: string } | null {
  let src = el.getAttribute('data-i18n-src') as 'ko' | 'en' | null;
  let original = el.getAttribute('data-i18n-original');
  if (!src || !original) {
    const detected = detectSrcLang(text);
    if (!detected) return null;
    src = detected;
    original = text;
    el.setAttribute('data-i18n-src', src);
    el.setAttribute('data-i18n-original', original);
  }
  return { src, original };
}

async function autoTranslatePage(lang: string) {
  _currentAutoLang = lang;
  const cache = getAutoCache();
  const cachePrefix = `${lang}:`;

  const generalSelector = 'h1,h2,h3,h4,h5,h6,p,a,span,li,td,th,button,label,strong,small,div';

  // 소스언어별 수집 버킷
  const bucket: Record<'ko' | 'en', { elements: HTMLElement[]; texts: string[] }> = {
    ko: { elements: [], texts: [] },
    en: { elements: [], texts: [] },
  };

  // ── 1) 일반 UI 텍스트 수집 ──
  document.querySelectorAll<HTMLElement>(generalSelector).forEach((el) => {
    if (el.hasAttribute('data-i18n')) return;
    if (el.closest('[data-i18n]') && el !== el.closest('[data-i18n]')) return;
    if (el.querySelector('h1,h2,h3,h4,h5,h6,p,a,span,li,div')) return;
    // form control을 포함한 컨테이너는 절대 번역 대상 X (textContent 쓰면 input이 지워짐)
    if (el.querySelector('input,textarea,select,form,iframe,video,audio,img,svg,picture')) return;
    // 블록 컨테이너 + button/label/summary 에 자식 요소가 있으면 번역하지 않음 (자식 wipe 방지)
    if (['DIV', 'SECTION', 'ARTICLE', 'MAIN', 'HEADER', 'FOOTER', 'ASIDE', 'NAV', 'FORM', 'BUTTON', 'LABEL', 'SUMMARY'].includes(el.tagName) && el.children.length > 0) return;
    // 숨겨진 요소 스킵 — 단, 접이식 컨테이너(메가메뉴/제품 Details/아코디언/솔루션 분야탭)는 미리 번역
    if (el.offsetParent === null && !el.closest('.mega-menu') && !el.closest('.p-features') && !el.closest('.ch-body') && !el.closest('.p-price') && !el.closest('.s-panel')) return;
    if (el.closest('.admin-add-btn') || el.closest('.admin-delete-btn')) return;
    // translate="no" 속성이 있는 요소 또는 그 자식은 번역 제외 (제품명 등 영문 고정)
    if (el.getAttribute('translate') === 'no' || el.closest('[translate="no"]')) return;
    // 관리자 툴바/편집 UI는 원문 그대로 (Save/Dashboard 등 영문 용어 유지)
    if (el.closest('.admin-bar') || el.closest('.admin-btn') || el.closest('#adminBar')) return;
    if (el.hasAttribute('data-edit')) return;
    if (el.closest('.h-entry')) return; // 히스토리는 별도 수집

    const currentText = (el.textContent || '').trim();
    if (!currentText || currentText.length < 2 || currentText.length > 500) return;

    // 원본이 이미 마킹되어 있으면 그 원본을 기준으로, 아니면 현재 텍스트로 판단
    const existingOriginal = el.getAttribute('data-i18n-original');
    const textForDetection = existingOriginal || currentText;
    const marked = ensureMarked(el, textForDetection);
    if (!marked) return;

    collectElement(el, marked, lang, cache, cachePrefix, bucket);
  });

  // ── 2) 접이식 컨테이너 내부 텍스트 수집 (아코디언/Details/ref-block — 숨김 상태 포함) ──
  document.querySelectorAll<HTMLElement>('.ch-body h4, .ch-body h5, .ch-body p, .ch-body li, .ch-body span.lesson-t, .p-features li, .p-price, .ref-block h5, .ref-block li, .s-panel a, .s-panel li, .s-panel p, .s-panel span').forEach((el) => {
    if (el.hasAttribute('data-i18n')) return;
    if (el.hasAttribute('data-edit')) return;
    if (el.closest('[translate="no"]')) return;
    if (el.querySelector('h1,h2,h3,h4,h5,h6,p,a,span,li,div')) return;
    const currentText = (el.textContent || '').trim();
    if (!currentText || currentText.length < 2 || currentText.length > 500) return;
    const existingOriginal = el.getAttribute('data-i18n-original');
    const textForDetection = existingOriginal || currentText;
    const marked = ensureMarked(el, textForDetection);
    if (!marked) return;
    collectElement(el, marked, lang, cache, cachePrefix, bucket);
  });

  // ── 3) 히스토리 패널 엔트리 수집 ──
  document.querySelectorAll<HTMLElement>('.history-panel .h-entry p').forEach((el) => {
    const currentText = (el.textContent || '').trim();
    if (!currentText || currentText.length < 3) return;
    const existingOriginal = el.getAttribute('data-i18n-original');
    const textForDetection = existingOriginal || currentText;
    const marked = ensureMarked(el, textForDetection);
    if (!marked) return;
    collectElement(el, marked, lang, cache, cachePrefix, bucket);
  });

  // ── 4) 소스언어별로 배치 번역 — ko/en 병렬 처리 ──
  await Promise.all(
    (['ko', 'en'] as const).map(async (src) => {
      const { elements, texts } = bucket[src];
      if (texts.length === 0) return;
      const unique = [...new Set(texts)];
      const translated = await gTranslate(unique, src, lang);
      const map: Record<string, string> = {};
      unique.forEach((t, i) => {
        const tr = translated[i] || t;
        map[t] = tr;
        if (tr !== t) cache[cachePrefix + t] = tr;
      });
      elements.forEach((el, i) => {
        const original = texts[i];
        const tr = map[original];
        if (tr && tr !== original) el.textContent = tr;
      });
    }),
  );

  saveAutoCache(cache);
}

/** 단일 요소를 버킷에 수집 (원본-타겟 동일이면 원본 복원, 캐시 있으면 즉시 치환) */
function collectElement(
  el: HTMLElement,
  marked: { src: 'ko' | 'en'; original: string },
  lang: string,
  cache: Record<string, string>,
  cachePrefix: string,
  bucket: Record<'ko' | 'en', { elements: HTMLElement[]; texts: string[] }>,
) {
  // 타겟 == 소스 → 원본 복원
  if (lang === marked.src) {
    if (el.textContent !== marked.original) el.textContent = marked.original;
    return;
  }
  // 캐시 적중 → 즉시 치환
  const cacheKey = cachePrefix + marked.original;
  if (cache[cacheKey]) {
    if (el.textContent !== cache[cacheKey]) el.textContent = cache[cacheKey];
    return;
  }
  // 네트워크 번역 대기 버킷
  bucket[marked.src].elements.push(el);
  bucket[marked.src].texts.push(marked.original);
}

/** 히스토리 엔트리 번역 (autoTranslatePage의 서브셋, 탭 전환 시 사용) */
async function translateHistoryEntries(lang: string, cache: Record<string, string>, cachePrefix: string) {
  const bucket: Record<'ko' | 'en', { elements: HTMLElement[]; texts: string[] }> = {
    ko: { elements: [], texts: [] },
    en: { elements: [], texts: [] },
  };
  document.querySelectorAll<HTMLElement>('.history-panel .h-entry p').forEach((el) => {
    const currentText = (el.textContent || '').trim();
    if (!currentText || currentText.length < 3) return;
    const existingOriginal = el.getAttribute('data-i18n-original');
    const marked = ensureMarked(el, existingOriginal || currentText);
    if (!marked) return;
    collectElement(el, marked, lang, cache, cachePrefix, bucket);
  });

  await Promise.all(
    (['ko', 'en'] as const).map(async (src) => {
      const { elements, texts } = bucket[src];
      if (texts.length === 0) return;
      const unique = [...new Set(texts)];
      const translated = await gTranslate(unique, src, lang);
      const map: Record<string, string> = {};
      unique.forEach((t, i) => {
        const tr = translated[i] || t;
        map[t] = tr;
        if (tr !== t) cache[cachePrefix + t] = tr;
      });
      elements.forEach((el, i) => {
        const original = texts[i];
        const tr = map[original];
        if (tr && tr !== original) el.textContent = tr;
      });
    }),
  );
}

/** 히스토리 탭 전환 시 새 패널도 번역 (history.astro에서 호출) */
(window as any).__translateHistoryPanel = async function () {
  const lang = _currentAutoLang;
  // 한국어/영어 전환도 처리 (영어→한국어 등 소스언어와 타겟언어가 다른 경우 번역 필요)
  const cache = getAutoCache();
  const cachePrefix = `${lang}:`;
  await translateHistoryEntries(lang, cache, cachePrefix);
  saveAutoCache(cache);
};

// ============================================================
// Apply translations to all elements with data-i18n attribute
// ============================================================
export async function applyTranslations(code?: LangCode) {
  const lang = code || getCurrentLang();
  const data = await loadTranslation(lang);
  const langInfo = LANGUAGES.find((l) => l.code === lang);

  // Update all data-i18n elements
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n')!;
    const value = getNestedValue(data as Record<string, unknown>, key);
    if (value !== key) {
      if (el.hasAttribute('data-i18n-attr')) {
        const attr = el.getAttribute('data-i18n-attr')!;
        el.setAttribute(attr, value);
      } else if (el.hasAttribute('data-i18n-html')) {
        el.innerHTML = value;
      } else {
        el.textContent = value;
      }
    }
  });

  // Toggle lang-* class visibility
  const allLangCodes = ['ko', 'en', 'ja', 'ar', 'fr', 'de', 'es', 'zh-TW'];
  allLangCodes.forEach((code) => {
    document.querySelectorAll<HTMLElement>(`.lang-${code}`).forEach((el) => {
      el.style.display = code === lang ? '' : 'none';
    });
  });

  // Update HTML dir for RTL
  document.documentElement.dir = langInfo?.dir || 'ltr';
  document.documentElement.lang = lang;

  // Update lang selector display
  const langDisplay = document.getElementById('currentLangLabel');
  if (langDisplay) langDisplay.textContent = lang.toUpperCase();

  // 자동 번역: data-i18n이 없는 한국어 콘텐츠 자동 번역
  await autoTranslatePage(lang);
}
