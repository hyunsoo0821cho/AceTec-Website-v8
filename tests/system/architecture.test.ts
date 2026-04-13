import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');

/**
 * 소프트웨어 아키텍처 테스트
 * 프로젝트 구조, 레이어 분리, 의존성 규칙을 검증합니다.
 */

describe('프로젝트 구조 검증', () => {
  const requiredDirs = [
    'src/components',
    'src/content',
    'src/layouts',
    'src/lib',
    'src/pages',
    'src/pages/api',
    'src/styles',
  ];

  for (const dir of requiredDirs) {
    it(`필수 디렉토리 존재: ${dir}`, () => {
      expect(fs.existsSync(path.join(ROOT, dir)), `Missing: ${dir}`).toBe(true);
    });
  }

  it('src/lib/ 에 핵심 모듈 존재', () => {
    const requiredModules = ['auth.ts', 'db.ts', 'chat.ts', 'rag.ts', 'vector-store.ts', 'rate-limiter.ts', 'sanitize.ts', 'image.ts', 'embeddings.ts', 'email.ts'];
    for (const mod of requiredModules) {
      expect(fs.existsSync(path.join(SRC, 'lib', mod)), `Missing module: ${mod}`).toBe(true);
    }
  });

  it('API 엔드포인트 구조 검증', () => {
    const apiDir = path.join(SRC, 'pages', 'api');
    const requiredEndpoints = ['chat.ts', 'contact.ts', 'health.ts'];
    for (const ep of requiredEndpoints) {
      expect(fs.existsSync(path.join(apiDir, ep)), `Missing API: ${ep}`).toBe(true);
    }
  });

  it('인증 API 엔드포인트 구조 검증', () => {
    const authDir = path.join(SRC, 'pages', 'api', 'auth');
    const requiredAuth = ['login.ts', 'logout.ts', 'register.ts', 'send-code.ts', 'reset-password.ts', 'me.ts'];
    for (const ep of requiredAuth) {
      expect(fs.existsSync(path.join(authDir, ep)), `Missing auth API: ${ep}`).toBe(true);
    }
  });
});

describe('레이어 분리 원칙', () => {
  function readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
  }

  it('lib/ 모듈은 pages/ 를 import하지 않음 (역방향 의존 금지)', () => {
    const libDir = path.join(SRC, 'lib');
    const libFiles = fs.readdirSync(libDir).filter(f => f.endsWith('.ts'));

    for (const file of libFiles) {
      const content = readFile(path.join(libDir, file));
      expect(content).not.toMatch(/from\s+['"]\.\.\/pages/);
      expect(content).not.toMatch(/from\s+['"]\.\.\/components/);
    }
  });

  it('lib/ 모듈은 서로 순환 의존하지 않음 (주요 순환 검사)', () => {
    // auth.ts → db.ts (OK, 단방향)
    // chat.ts → rag.ts → embeddings.ts, vector-store.ts (OK, 단방향)
    // db.ts는 다른 lib 모듈에 의존하지 않아야 함

    const dbContent = readFile(path.join(SRC, 'lib', 'db.ts'));
    // db.ts는 같은 lib의 다른 비즈니스 모듈을 import하면 안됨
    expect(dbContent).not.toMatch(/from\s+['"]\.\/auth/);
    expect(dbContent).not.toMatch(/from\s+['"]\.\/chat/);
    expect(dbContent).not.toMatch(/from\s+['"]\.\/rag/);
    expect(dbContent).not.toMatch(/from\s+['"]\.\/sanitize/);
  });

  it('sanitize.ts는 외부 의존성이 없음 (순수 함수)', () => {
    const content = readFile(path.join(SRC, 'lib', 'sanitize.ts'));
    expect(content).not.toMatch(/^import .+ from /m);
  });

  it('rate-limiter.ts는 외부 의존성이 없음 (순수 함수)', () => {
    const content = readFile(path.join(SRC, 'lib', 'rate-limiter.ts'));
    expect(content).not.toMatch(/^import .+ from /m);
  });
});

describe('설정 파일 존재 검증', () => {
  const configFiles = [
    'astro.config.mjs',
    'tsconfig.json',
    'package.json',
    'vitest.config.ts',
    'playwright.config.ts',
  ];

  for (const file of configFiles) {
    it(`설정 파일 존재: ${file}`, () => {
      expect(fs.existsSync(path.join(ROOT, file)), `Missing config: ${file}`).toBe(true);
    });
  }
});

describe('콘텐츠 컬렉션 검증', () => {
  it('products 디렉토리에 6개 카테고리 JSON 존재', () => {
    const productsDir = path.join(SRC, 'content', 'products');
    const categories = ['military', 'railway', 'industrial', 'telecom', 'sensor', 'hpc'];

    for (const cat of categories) {
      const filePath = path.join(productsDir, `${cat}.json`);
      expect(fs.existsSync(filePath), `Missing: ${cat}.json`).toBe(true);

      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(content.category).toBe(cat);
      expect(content.title).toBeTruthy();
    }
  });

  it('pages 디렉토리에 CMS 콘텐츠 JSON 존재', () => {
    const pagesDir = path.join(SRC, 'content', 'pages');
    expect(fs.existsSync(pagesDir)).toBe(true);
    const files = fs.readdirSync(pagesDir);
    expect(files.length).toBeGreaterThan(0);
  });
});

describe('스타일 시스템 검증', () => {
  it('디자인 토큰 파일 존재', () => {
    expect(fs.existsSync(path.join(SRC, 'styles', 'tokens.css'))).toBe(true);
  });

  it('글로벌 스타일 파일 존재', () => {
    expect(fs.existsSync(path.join(SRC, 'styles', 'global.css'))).toBe(true);
  });

  it('폰트 스타일 파일 존재', () => {
    expect(fs.existsSync(path.join(SRC, 'styles', 'fonts.css'))).toBe(true);
  });

  it('디자인 토큰에 핵심 CSS 변수 정의', () => {
    const tokens = fs.readFileSync(path.join(SRC, 'styles', 'tokens.css'), 'utf-8');
    expect(tokens).toContain('--');
    expect(tokens).toContain(':root');
  });
});

describe('마크업/레이아웃 검증', () => {
  it('Base 레이아웃 존재', () => {
    expect(fs.existsSync(path.join(SRC, 'layouts', 'Base.astro'))).toBe(true);
  });

  it('Base 레이아웃에 필수 요소 포함', () => {
    const layout = fs.readFileSync(path.join(SRC, 'layouts', 'Base.astro'), 'utf-8');
    expect(layout).toContain('Header');
    expect(layout).toContain('Footer');
    expect(layout).toContain('<html');
    expect(layout).toContain('<head');
    expect(layout).toContain('<body');
  });
});
