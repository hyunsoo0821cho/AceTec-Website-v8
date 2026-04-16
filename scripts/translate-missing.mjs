/**
 * i18n 미번역 키 일괄 번역 스크립트
 * en.json과 값이 동일한 항목을 Google Translate로 번역
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = resolve(__dirname, '../src/i18n');

function flatten(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'object' && v !== null) {
      Object.assign(result, flatten(v, prefix + k + '.'));
    } else {
      result[prefix + k] = String(v);
    }
  }
  return result;
}

function setNested(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

// Product model name pattern (skip these)
const MODEL_RE = /^[A-Z0-9\-().\/\s]{2,}$/;
const SKIP_PREFIXES = ['lang.', 'ps.'];  // ps product names handled separately

function shouldTranslate(key, enValue) {
  // Skip empty or very short
  if (!enValue || enValue.length <= 2) return false;
  // Skip product model names (all uppercase/numbers)
  if (MODEL_RE.test(enValue.trim())) return false;
  // Skip product name keys (like ps.telecom.s0p0n) but translate section titles (ps.telecom.s0)
  if (/^ps\.\w+\.s\d+p\d+n$/.test(key)) return false;
  // Skip language names
  if (key.startsWith('lang.')) return false;
  return true;
}

async function translateBatch(texts, targetLang) {
  const BATCH_SIZE = 40;
  const results = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const query = batch.map(t => `q=${encodeURIComponent(t)}`).join('&');
    const url = `https://translate.googleapis.com/translate_a/t?client=gtx&sl=en&tl=${targetLang}&${query}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        if (batch.length === 1) {
          results.push(typeof data[0] === 'string' ? data[0] : data[0][0] || batch[0]);
        } else {
          batch.forEach((t, j) => {
            const item = data[j];
            results.push(typeof item === 'string' ? item : item?.[0] || t);
          });
        }
      } else {
        results.push(...batch);
      }
    } catch (e) {
      console.error(`  Batch ${i} failed:`, e.message);
      results.push(...batch);
    }
    // Small delay between batches
    if (i + BATCH_SIZE < texts.length) await new Promise(r => setTimeout(r, 200));
  }
  return results;
}

async function processLanguage(langCode) {
  const koData = JSON.parse(readFileSync(resolve(I18N_DIR, 'ko.json'), 'utf8'));
  const enData = JSON.parse(readFileSync(resolve(I18N_DIR, 'en.json'), 'utf8'));
  const langFile = resolve(I18N_DIR, `${langCode}.json`);
  const langData = JSON.parse(readFileSync(langFile, 'utf8'));

  const koFlat = flatten(koData);
  const enFlat = flatten(enData);
  const langFlat = flatten(langData);

  const toTranslate = [];

  // 1) en.json에 있지만 대상 언어에 동일값(미번역)인 키
  for (const [key, enValue] of Object.entries(enFlat)) {
    if (langFlat[key] === enValue && shouldTranslate(key, enValue)) {
      toTranslate.push({ key, text: enValue, src: 'en' });
    }
  }

  // 2) ko.json에만 있고 en/대상 언어에 없는 키 (새로 추가된 제품 등)
  for (const [key, koValue] of Object.entries(koFlat)) {
    if (!enFlat[key] && !langFlat[key] && shouldTranslate(key, koValue)) {
      toTranslate.push({ key, text: koValue, src: 'ko' });
      // en.json에도 추가 (영어 번역)
      if (langCode === 'de') { // 첫 번째 언어 처리 시 한번만 en.json에 추가
        setNested(enData, key, koValue); // 임시로 한국어 넣고 아래서 영어로 번역
      }
    }
  }

  if (toTranslate.length === 0) {
    console.log(`[${langCode}] 번역할 키 없음 ✅`);
    return;
  }
  console.log(`[${langCode}] ${toTranslate.length}개 키 번역 중...`);

  // 소스 언어별로 분리 후 번역
  const koItems = toTranslate.filter(t => t.src === 'ko');
  const enItems = toTranslate.filter(t => t.src === 'en');

  let changed = 0;

  // en→target 번역
  if (enItems.length > 0) {
    const translated = await translateBatch(enItems.map(t => t.text), langCode);
    enItems.forEach((item, i) => {
      if (translated[i] && translated[i] !== item.text) {
        setNested(langData, item.key, translated[i]);
        changed++;
      }
    });
  }

  // ko→target 번역 (새 키)
  if (koItems.length > 0) {
    const translated = await translateBatch(koItems.map(t => t.text), langCode);
    koItems.forEach((item, i) => {
      if (translated[i] && translated[i] !== item.text) {
        setNested(langData, item.key, translated[i]);
        changed++;
      }
    });

    // ko→en 번역도 (en.json에 새 키 추가)
    if (langCode === 'de') {
      const enTranslated = await translateBatch(koItems.map(t => t.text), 'en');
      koItems.forEach((item, i) => {
        if (enTranslated[i]) setNested(enData, item.key, enTranslated[i]);
      });
      writeFileSync(resolve(I18N_DIR, 'en.json'), JSON.stringify(enData, null, 2) + '\n', 'utf8');
      console.log(`[en] ${koItems.length}개 신규 키 ko→en 번역 추가`);
    }
  }

  writeFileSync(langFile, JSON.stringify(langData, null, 2) + '\n', 'utf8');
  console.log(`[${langCode}] ${changed}/${toTranslate.length}개 번역 완료`);
}

// Also translate ja, ar
const LANGS = ['de', 'fr', 'es', 'ja', 'ar'];
for (const lang of LANGS) {
  await processLanguage(lang);
}
console.log('\n전체 완료!');
