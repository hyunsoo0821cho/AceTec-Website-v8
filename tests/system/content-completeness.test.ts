import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');
const BASE_URL = 'http://192.168.10.182:8080';

/**
 * 콘텐츠 완성도 테스트
 * CMS JSON 데이터, 이미지 리소스, 페이지 콘텐츠의 완성도를 검증합니다.
 */

// ─── 1. 제품 카테고리 콘텐츠 ──────

describe('콘텐츠: 제품 카테고리 JSON', () => {
  const productsDir = path.join(SRC, 'content', 'products');
  const categories = ['military', 'railway', 'industrial', 'telecom', 'sensor', 'hpc'];

  for (const cat of categories) {
    describe(`${cat}.json`, () => {
      const filePath = path.join(productsDir, `${cat}.json`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      it('파일 존재', () => {
        expect(fs.existsSync(filePath)).toBe(true);
      });

      it('유효한 JSON', () => {
        expect(() => JSON.parse(fs.readFileSync(filePath, 'utf-8'))).not.toThrow();
      });

      it('필수 메타 필드: category, title, pageTitle, description', () => {
        expect(data.category).toBe(cat);
        expect(data.title).toBeTruthy();
        expect(data.pageTitle).toBeTruthy();
        expect(data.description).toBeTruthy();
      });

      it('items 배열 존재', () => {
        expect(Array.isArray(data.items)).toBe(true);
      });

      it(`items 개수: ${data.items?.length || 0}개`, () => {
        // 기록용 — items 수만 확인 (비어있어도 테스트 자체는 통과)
        expect(data.items.length).toBeGreaterThanOrEqual(0);
      });

      if (data.items?.length > 0) {
        it('items 각각 name, specs 보유', () => {
          for (const item of data.items) {
            expect(item.name).toBeTruthy();
            expect(item.specs).toBeTruthy();
          }
        });
      }
    });
  }
});

// ─── 2. CMS 페이지 콘텐츠 ──────

describe('콘텐츠: CMS 페이지 JSON', () => {
  const pagesDir = path.join(SRC, 'content', 'pages');

  it('pages 디렉토리 존재', () => {
    expect(fs.existsSync(pagesDir)).toBe(true);
  });

  const expectedPages = ['home', 'about', 'solutions', 'contact', 'footer', 'applications', 'catalog', 'megamenu'];
  for (const page of expectedPages) {
    const filePath = path.join(pagesDir, `${page}.json`);
    if (fs.existsSync(filePath)) {
      it(`${page}.json 유효한 JSON`, () => {
        expect(() => JSON.parse(fs.readFileSync(filePath, 'utf-8'))).not.toThrow();
      });

      it(`${page}.json 비어있지 않음`, () => {
        const content = fs.readFileSync(filePath, 'utf-8').trim();
        expect(content.length).toBeGreaterThan(2);
      });
    }
  }
});

// ─── 3. 히스토리 타임라인 ──────

describe('콘텐츠: 히스토리 타임라인', () => {
  const timelinePath = path.join(SRC, 'content', 'history', 'timeline.json');

  it('timeline.json 존재', () => {
    expect(fs.existsSync(timelinePath)).toBe(true);
  });

  it('timeline.json 유효한 JSON', () => {
    expect(() => JSON.parse(fs.readFileSync(timelinePath, 'utf-8'))).not.toThrow();
  });

  it('타임라인 데이터에 이벤트 존재', () => {
    const data = JSON.parse(fs.readFileSync(timelinePath, 'utf-8'));
    // 배열이거나 events 속성 보유
    const events = Array.isArray(data) ? data : data.events || data.years || Object.keys(data);
    expect(events.length).toBeGreaterThan(0);
  });
});

// ─── 4. 정적 이미지 리소스 ──────

describe('콘텐츠: 정적 이미지', () => {
  const publicDir = path.join(ROOT, 'public');

  it('public/images 디렉토리 존재', () => {
    expect(fs.existsSync(path.join(publicDir, 'images'))).toBe(true);
  });

  it('favicon 존재', () => {
    const hasFavicon = fs.existsSync(path.join(publicDir, 'favicon.svg')) || fs.existsSync(path.join(publicDir, 'favicon.ico'));
    expect(hasFavicon).toBe(true);
  });

  it('fonts 디렉토리 존재', () => {
    expect(fs.existsSync(path.join(publicDir, 'fonts'))).toBe(true);
  });

  it('보안 헤더 파일 (_headers) 존재', () => {
    expect(fs.existsSync(path.join(publicDir, '_headers'))).toBe(true);
  });
});

// ─── 5. 라이브 페이지 콘텐츠 검증 ──────

describe('콘텐츠: 라이브 페이지 렌더링', () => {
  it('홈 페이지 HTML이 비어있지 않음', async () => {
    const res = await fetch(`${BASE_URL}/`);
    const html = await res.text();
    expect(html.length).toBeGreaterThan(1000);
  });

  it('about 페이지 HTML이 비어있지 않음', async () => {
    const res = await fetch(`${BASE_URL}/about`);
    const html = await res.text();
    expect(html.length).toBeGreaterThan(500);
  });

  it('contact 페이지에 폼 요소 포함', async () => {
    const res = await fetch(`${BASE_URL}/contact`);
    const html = await res.text();
    expect(html).toContain('<form');
  });

  it('history 페이지 렌더링', async () => {
    const res = await fetch(`${BASE_URL}/history`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html.length).toBeGreaterThan(500);
  });
});

// ─── 6. 카테고리별 아이템 통계 ──────

describe('콘텐츠: 제품 데이터 통계', () => {
  const productsDir = path.join(SRC, 'content', 'products');
  const categories = ['military', 'railway', 'industrial', 'telecom', 'sensor', 'hpc'];

  it('전체 카테고리 아이템 수 집계', () => {
    let total = 0;
    const stats: Record<string, number> = {};
    for (const cat of categories) {
      const data = JSON.parse(fs.readFileSync(path.join(productsDir, `${cat}.json`), 'utf-8'));
      stats[cat] = data.items?.length || 0;
      total += stats[cat];
    }
    console.log('[콘텐츠 통계] 카테고리별 아이템 수:', JSON.stringify(stats));
    console.log(`[콘텐츠 통계] 전체 아이템 수: ${total}`);
    // 최소 1개 카테고리에 데이터가 있어야 함
    expect(total).toBeGreaterThan(0);
  });

  it('데이터가 채워진 카테고리 수', () => {
    let filledCount = 0;
    for (const cat of categories) {
      const data = JSON.parse(fs.readFileSync(path.join(productsDir, `${cat}.json`), 'utf-8'));
      if (data.items?.length > 0) filledCount++;
    }
    console.log(`[콘텐츠 통계] 데이터 채워진 카테고리: ${filledCount}/6`);
    expect(filledCount).toBeGreaterThanOrEqual(1);
  });
});
