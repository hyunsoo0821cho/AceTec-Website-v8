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

// Apply translations to all elements with data-i18n attribute
export async function applyTranslations(code?: LangCode) {
  const lang = code || getCurrentLang();
  const data = await loadTranslation(lang);
  const langInfo = LANGUAGES.find((l) => l.code === lang);

  // Update all data-i18n elements
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n')!;
    const value = getNestedValue(data as Record<string, unknown>, key);
    if (value !== key) {
      // Check if it's an input placeholder
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

  // Toggle lang-* class visibility (for catalog and inline bilingual content)
  const allLangCodes = ['ko', 'en', 'ja', 'ar', 'fr', 'de', 'es', 'zh-TW'];
  allLangCodes.forEach((code) => {
    document.querySelectorAll<HTMLElement>(`.lang-${code}`).forEach((el) => {
      el.style.display = code === lang ? '' : 'none';
    });
  });

  // Update HTML dir for RTL
  document.documentElement.dir = langInfo?.dir || 'ltr';
  document.documentElement.lang = lang;

  // Update lang selector display (언어 코드 대문자로 표시: KO, EN, JA …)
  const langDisplay = document.getElementById('currentLangLabel');
  if (langDisplay) langDisplay.textContent = lang.toUpperCase();
}
