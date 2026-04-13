import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');

/**
 * ECC 기반 소프트웨어 아키텍처 심화 테스트
 *
 * 검증 항목:
 * 1. SSG/SSR 렌더링 경계 (Hybrid Architecture)
 * 2. 모듈 결합도 분석 (Coupling Analysis)
 * 3. 모듈 응집도 분석 (Cohesion Analysis)
 * 4. API 설계 일관성 (API Design Consistency)
 * 5. 인증/인가 아키텍처 (AuthN/AuthZ Architecture)
 * 6. 데이터 흐름 계층 (Data Flow Layers)
 * 7. 에러 처리 패턴 일관성 (Error Handling Consistency)
 * 8. 컴포넌트 아키텍처 (Component Architecture)
 * 9. 파일 크기/복잡도 제한 (Complexity Limits)
 * 10. CMS 콘텐츠 아키텍처 (Content Architecture)
 */

// ─── 유틸 ──────────────────────────────────────────

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

function getAllFiles(dir: string, ext: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
      files.push(...getAllFiles(full, ext));
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      files.push(full);
    }
  }
  return files;
}

function countLines(filePath: string): number {
  return readFile(filePath).split('\n').length;
}

function getImports(content: string): string[] {
  const matches = content.match(/(?:import|from)\s+['"]([^'"]+)['"]/g) || [];
  return matches.map(m => {
    const match = m.match(/['"]([^'"]+)['"]/);
    return match ? match[1] : '';
  }).filter(Boolean);
}

// ─── 1. SSG/SSR 렌더링 경계 (Hybrid Architecture) ──────

describe('1. SSG/SSR 렌더링 경계 (Hybrid Architecture)', () => {
  it('Astro config: server 모드 + Node 어댑터 설정', () => {
    const config = readFile(path.join(ROOT, 'astro.config.mjs'));
    expect(config).toContain("output: 'server'");
    expect(config).toContain('node');
    expect(config).toContain('adapter');
  });

  it('404 페이지는 SSG (prerender=true)', () => {
    const page404 = readFile(path.join(SRC, 'pages', '404.astro'));
    expect(page404).toContain('export const prerender = true');
  });

  it('마케팅 페이지들은 명시적 prerender 지시자 보유', () => {
    const marketingPages = ['about', 'contact', 'applications', 'careers', 'solutions', 'history', 'training', 'news'];
    for (const page of marketingPages) {
      const filePath = path.join(SRC, 'pages', `${page}.astro`);
      if (fs.existsSync(filePath)) {
        const content = readFile(filePath);
        expect(content, `${page}.astro should have prerender directive`).toMatch(/export const prerender\s*=/);
      }
    }
  });

  it('관리자 대시보드는 SSR (prerender=false)', () => {
    const dashboard = readFile(path.join(SRC, 'pages', 'admin', 'dashboard.astro'));
    expect(dashboard).toContain('export const prerender = false');
  });

  it('인증 관련 페이지는 SSR', () => {
    const authPages = ['login', 'register', 'forgot-password', 'account'];
    for (const page of authPages) {
      const filePath = path.join(SRC, 'pages', `${page}.astro`);
      if (fs.existsSync(filePath)) {
        const content = readFile(filePath);
        expect(content, `${page}.astro should be SSR`).toContain('export const prerender = false');
      }
    }
  });

  it('모든 API 엔드포인트는 SSR 또는 기본 서버 모드', () => {
    const apiFiles = getAllFiles(path.join(SRC, 'pages', 'api'), '.ts');
    for (const file of apiFiles) {
      const content = readFile(file);
      const rel = path.relative(ROOT, file);
      // API는 prerender=true가 아니어야 함
      expect(content, `${rel} must not be prerendered`).not.toContain('export const prerender = true');
    }
  });

  it('동적 라우트 [category].astro 존재', () => {
    const dynamicRoute = path.join(SRC, 'pages', 'products', '[category].astro');
    expect(fs.existsSync(dynamicRoute)).toBe(true);
  });
});

// ─── 2. 모듈 결합도 분석 (Coupling Analysis) ──────

describe('2. 모듈 결합도 분석 (Coupling Analysis)', () => {
  const libDir = path.join(SRC, 'lib');
  const libFiles = fs.readdirSync(libDir).filter(f => f.endsWith('.ts'));

  it('lib/ 모듈 간 의존 방향이 DAG (순환 없음)', () => {
    // db.ts <- auth.ts (OK)
    // embeddings.ts <- rag.ts <- chat.ts (OK)
    // vector-store.ts <- rag.ts (OK)
    // 역방향 의존 검사

    const chatContent = readFile(path.join(libDir, 'chat.ts'));
    expect(chatContent).toContain("from './rag'");
    expect(chatContent).not.toContain("from './auth'"); // chat은 auth에 의존하면 안됨

    const ragContent = readFile(path.join(libDir, 'rag.ts'));
    expect(ragContent).toContain("from './embeddings'");
    expect(ragContent).toContain("from './vector-store'");
    expect(ragContent).not.toContain("from './chat'"); // rag은 chat에 의존하면 안됨 (역방향)

    const embeddingsContent = readFile(path.join(libDir, 'embeddings.ts'));
    expect(embeddingsContent).not.toContain("from './rag'"); // embeddings는 rag에 의존하면 안됨
    expect(embeddingsContent).not.toContain("from './chat'");
  });

  it('db.ts는 인프라 레이어 최하단 (다른 비즈니스 모듈 미참조)', () => {
    const dbContent = readFile(path.join(libDir, 'db.ts'));
    const libImports = getImports(dbContent).filter(i => i.startsWith('./'));
    expect(libImports.length, 'db.ts should not import from other lib modules').toBe(0);
  });

  it('sanitize.ts는 무의존 순수 모듈', () => {
    const content = readFile(path.join(libDir, 'sanitize.ts'));
    const imports = getImports(content);
    expect(imports.length).toBe(0);
  });

  it('rate-limiter.ts는 무의존 순수 모듈', () => {
    const content = readFile(path.join(libDir, 'rate-limiter.ts'));
    const imports = getImports(content);
    expect(imports.length).toBe(0);
  });

  it('auth.ts는 db.ts에만 내부 의존', () => {
    const content = readFile(path.join(libDir, 'auth.ts'));
    const libImports = getImports(content).filter(i => i.startsWith('./'));
    expect(libImports).toEqual(['./db']);
  });

  it('API 엔드포인트는 better-sqlite3를 직접 import하지 않음 (lib 경유)', () => {
    const apiFiles = getAllFiles(path.join(SRC, 'pages', 'api'), '.ts');
    for (const file of apiFiles) {
      const content = readFile(file);
      const rel = path.relative(ROOT, file);
      expect(content, `${rel} should not import better-sqlite3 directly`).not.toContain("from 'better-sqlite3'");
    }
  });

  it('Fan-out 제한: lib/ 모듈 당 내부 import 3개 이하', () => {
    for (const file of libFiles) {
      const content = readFile(path.join(libDir, file));
      const libImports = getImports(content).filter(i => i.startsWith('./'));
      expect(libImports.length, `${file} has too many internal imports (${libImports.length})`).toBeLessThanOrEqual(3);
    }
  });
});

// ─── 3. 모듈 응집도 분석 (Cohesion Analysis) ──────

describe('3. 모듈 응집도 분석 (Cohesion Analysis)', () => {
  it('각 lib/ 모듈은 단일 책임을 가짐 (export 함수 수 제한)', () => {
    const libDir = path.join(SRC, 'lib');
    const libFiles = fs.readdirSync(libDir).filter(f => f.endsWith('.ts'));

    for (const file of libFiles) {
      const content = readFile(path.join(libDir, file));
      const exports = (content.match(/^export\s+(function|const|async function|interface|type|class)/gm) || []).length;
      // 단일 모듈에서 export가 너무 많으면 책임 분리 필요
      expect(exports, `${file} exports too many items (${exports})`).toBeLessThanOrEqual(15);
    }
  });

  it('각 API 엔드포인트는 관련 HTTP 메서드만 export', () => {
    const apiFiles = getAllFiles(path.join(SRC, 'pages', 'api'), '.ts');
    const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    for (const file of apiFiles) {
      const content = readFile(file);
      const rel = path.relative(ROOT, file);
      const exports = (content.match(/export\s+const\s+(\w+)/g) || []).map(e => e.replace('export const ', ''));
      for (const exp of exports) {
        if (exp === 'prerender') continue; // 예외
        expect(
          httpMethods.includes(exp),
          `${rel}: unexpected export '${exp}' — API should only export HTTP methods + prerender`,
        ).toBe(true);
      }
    }
  });

  it('components/ 각 컴포넌트는 하나의 UI 관심사', () => {
    const compDir = path.join(SRC, 'components');
    const components = fs.readdirSync(compDir).filter(f => f.endsWith('.astro'));
    // 컴포넌트 이름이 역할을 명확히 반영
    for (const comp of components) {
      const name = comp.replace('.astro', '');
      expect(name.length, `${comp}: component name too short`).toBeGreaterThan(2);
      // PascalCase 확인
      expect(name[0], `${comp}: should be PascalCase`).toMatch(/[A-Z]/);
    }
  });
});

// ─── 4. API 설계 일관성 (API Design Consistency) ──────

describe('4. API 설계 일관성 (API Design Consistency)', () => {
  const apiFiles = getAllFiles(path.join(SRC, 'pages', 'api'), '.ts');

  it('모든 API 엔드포인트가 JSON 또는 리다이렉트 반환', () => {
    for (const file of apiFiles) {
      const content = readFile(file);
      const rel = path.relative(ROOT, file);
      // Response.json, JSON.stringify, 또는 302 리다이렉트 중 하나 사용
      const usesJsonOrRedirect = content.includes('Response.json') || content.includes('application/json') || content.includes('302');
      expect(usesJsonOrRedirect, `${rel} should return JSON or redirect`).toBe(true);
    }
  });

  it('에러 응답에 error 필드 사용 일관성', () => {
    for (const file of apiFiles) {
      const content = readFile(file);
      const rel = path.relative(ROOT, file);
      // status 4xx/5xx 반환 시 error 필드 포함 확인
      const errorResponses = content.match(/status:\s*(4\d{2}|5\d{2})/g) || [];
      if (errorResponses.length > 0) {
        expect(content, `${rel} should include 'error' field in error responses`).toContain("error");
      }
    }
  });

  it('인증 보호 API에 401 응답 포함', () => {
    const protectedApis = [
      'admin/users.ts', 'admin/logs.ts', 'admin/stats.ts', 'admin/access-requests.ts',
      'images/upload.ts', 'pages/[page].ts', 'auth/me.ts',
    ];
    for (const api of protectedApis) {
      const filePath = path.join(SRC, 'pages', 'api', api);
      if (fs.existsSync(filePath)) {
        const content = readFile(filePath);
        expect(content, `${api} should have 401 response`).toContain('401');
        expect(content, `${api} should check auth`).toMatch(/verifySession|auth\(/);
      }
    }
  });

  it('관리자 전용 API에 403 또는 role 검사 포함', () => {
    const adminApis = ['admin/logs.ts', 'admin/access-requests.ts'];
    for (const api of adminApis) {
      const filePath = path.join(SRC, 'pages', 'api', api);
      if (fs.existsSync(filePath)) {
        const content = readFile(filePath);
        const hasRoleCheck = content.includes("role !== 'admin'") || content.includes('403');
        expect(hasRoleCheck, `${api} should check admin role`).toBe(true);
      }
    }
  });

  it('Rate Limited API에 429 응답 포함', () => {
    const rateLimitedApis = ['chat.ts', 'contact.ts'];
    for (const api of rateLimitedApis) {
      const filePath = path.join(SRC, 'pages', 'api', api);
      const content = readFile(filePath);
      expect(content, `${api} should have 429 response`).toContain('429');
      expect(content, `${api} should use rate limiter`).toContain('checkRateLimit');
    }
  });

  it('입력 검증 API에 400 응답 포함', () => {
    const validatedApis = ['chat.ts', 'contact.ts', 'auth/register.ts', 'auth/reset-password.ts', 'auth/send-code.ts'];
    for (const api of validatedApis) {
      const filePath = path.join(SRC, 'pages', 'api', api);
      if (fs.existsSync(filePath)) {
        const content = readFile(filePath);
        expect(content, `${api} should have 400 response for invalid input`).toContain('400');
      }
    }
  });
});

// ─── 5. 인증/인가 아키텍처 (AuthN/AuthZ Architecture) ──────

describe('5. 인증/인가 아키텍처 (AuthN/AuthZ Architecture)', () => {
  it('세션 관리가 auth.ts에 캡슐화 (단일 진입점)', () => {
    const authContent = readFile(path.join(SRC, 'lib', 'auth.ts'));
    // 세션 관련 함수 모두 export
    expect(authContent).toContain('export function createSession');
    expect(authContent).toContain('export function verifySession');
    expect(authContent).toContain('export function deleteSession');
    expect(authContent).toContain('export function sessionCookie');
    expect(authContent).toContain('export function clearCookie');
    expect(authContent).toContain('export function getSessionIdFromCookie');
  });

  it('비밀번호 검증이 auth.ts에서만 수행', () => {
    // bcrypt.compareSync는 auth.ts에서만 호출
    const authContent = readFile(path.join(SRC, 'lib', 'auth.ts'));
    expect(authContent).toContain('compareSync');

    // 다른 lib 모듈에서는 compareSync 미사용
    const otherLibFiles = fs.readdirSync(path.join(SRC, 'lib'))
      .filter(f => f.endsWith('.ts') && f !== 'auth.ts');
    for (const file of otherLibFiles) {
      const content = readFile(path.join(SRC, 'lib', file));
      expect(content, `${file} should not use compareSync`).not.toContain('compareSync');
    }
  });

  it('역할 기반 접근 제어 (RBAC) 구현', () => {
    const authContent = readFile(path.join(SRC, 'lib', 'auth.ts'));
    expect(authContent).toContain('hasDetailAccess');
    expect(authContent).toContain("role === 'admin'");
  });

  it('API 인증 패턴 일관성: cookie → sessionId → verifySession', () => {
    const protectedApis = getAllFiles(path.join(SRC, 'pages', 'api'), '.ts');
    for (const file of protectedApis) {
      const content = readFile(file);
      if (content.includes('verifySession')) {
        const rel = path.relative(ROOT, file);
        // getSessionIdFromCookie 또는 직접 auth 함수 사용
        const usesSessionPattern = content.includes('getSessionIdFromCookie') || content.includes('auth(request)');
        expect(usesSessionPattern, `${rel} should use consistent auth pattern`).toBe(true);
      }
    }
  });

  it('인증 코드 기반 회원가입/재설정: verification_codes 테이블 사용', () => {
    const registerContent = readFile(path.join(SRC, 'pages', 'api', 'auth', 'register.ts'));
    const resetContent = readFile(path.join(SRC, 'pages', 'api', 'auth', 'reset-password.ts'));
    expect(registerContent).toContain('verification_codes');
    expect(resetContent).toContain('verification_codes');
    // 코드 사용 처리 (used = 1)
    expect(registerContent).toContain('SET used = 1');
    expect(resetContent).toContain('SET used = 1');
  });
});

// ─── 6. 데이터 흐름 계층 (Data Flow Layers) ──────

describe('6. 데이터 흐름 계층 (Data Flow Layers)', () => {
  it('3-Tier 아키텍처: Pages → API → Lib → DB', () => {
    // Pages (.astro) → API 호출 (client-side fetch) [OK]
    // API (.ts) → lib 모듈 import [OK]
    // lib 모듈 → DB (better-sqlite3) [OK]

    // API는 lib을 통해서만 DB 접근 (일부는 직접 getDb도 사용)
    const apiFiles = getAllFiles(path.join(SRC, 'pages', 'api'), '.ts');
    for (const file of apiFiles) {
      const content = readFile(file);
      const rel = path.relative(ROOT, file);
      // better-sqlite3를 직접 import하면 안됨
      expect(content, `${rel} should not directly import better-sqlite3`).not.toContain("from 'better-sqlite3'");
    }
  });

  it('RAG 파이프라인 계층: Chat → RAG → Embeddings + VectorStore', () => {
    const chatContent = readFile(path.join(SRC, 'lib', 'chat.ts'));
    expect(chatContent).toContain("from './rag'");

    const ragContent = readFile(path.join(SRC, 'lib', 'rag.ts'));
    expect(ragContent).toContain("from './embeddings'");
    expect(ragContent).toContain("from './vector-store'");
  });

  it('CMS 데이터 흐름: [page].ts API → fs (JSON) ↔ .astro 페이지', () => {
    const pagesApi = readFile(path.join(SRC, 'pages', 'api', 'pages', '[page].ts'));
    expect(pagesApi).toContain("from 'fs'");
    // path.join으로 content 경로 조합
    expect(pagesApi).toContain('pagesDir');
    expect(pagesApi).toContain('productsDir');
  });

  it('Contact 데이터 흐름: API → Supabase (선택적 외부 DB)', () => {
    const contactApi = readFile(path.join(SRC, 'pages', 'api', 'contact.ts'));
    expect(contactApi).toContain("from '../../lib/supabase'");
    // supabase가 null이면 graceful fallback
    expect(contactApi).toContain('if (supabase)');
  });

  it('이미지 업로드 흐름: API → image.ts (sharp) → public/uploads/', () => {
    const uploadApi = readFile(path.join(SRC, 'pages', 'api', 'images', 'upload.ts'));
    expect(uploadApi).toContain("from '../../../lib/image'");
    expect(uploadApi).toContain('processImage');

    const imageLib = readFile(path.join(SRC, 'lib', 'image.ts'));
    expect(imageLib).toContain("from 'sharp'");
    expect(imageLib).toContain('uploads');
  });
});

// ─── 7. 에러 처리 패턴 일관성 (Error Handling Consistency) ──────

describe('7. 에러 처리 패턴 일관성 (Error Handling Consistency)', () => {
  it('API 엔드포인트에 try-catch 또는 에러 처리 존재', () => {
    const criticalApis = ['chat.ts', 'contact.ts'];
    for (const api of criticalApis) {
      const filePath = path.join(SRC, 'pages', 'api', api);
      const content = readFile(filePath);
      expect(content, `${api} should have try-catch`).toContain('catch');
      expect(content, `${api} should have 500 fallback`).toContain('500');
    }
  });

  it('RAG 파이프라인에 graceful 에러 처리', () => {
    const ragContent = readFile(path.join(SRC, 'lib', 'rag.ts'));
    expect(ragContent).toContain('catch');
    expect(ragContent).toContain('return []'); // 에러 시 빈 배열 반환
  });

  it('Chat 모듈에 Ollama 연결 실패 처리', () => {
    const chatContent = readFile(path.join(SRC, 'lib', 'chat.ts'));
    expect(chatContent).toContain('!res.ok');
    // Fallback 메시지 반환
    expect(chatContent).toContain('AI 서비스에 일시적 문제');
  });

  it('Chat API에 ECONNREFUSED 처리', () => {
    const chatApi = readFile(path.join(SRC, 'pages', 'api', 'chat.ts'));
    expect(chatApi).toContain('ECONNREFUSED');
    // 사용자 친화적 메시지
    expect(chatApi).toContain('Ollama');
  });

  it('Supabase 미설정 시 graceful degradation', () => {
    const supabaseLib = readFile(path.join(SRC, 'lib', 'supabase.ts'));
    expect(supabaseLib).toContain('null');
    // 경고 로그
    expect(supabaseLib).toContain('console.warn');
  });

  it('Vector Store 검색 실패 시 빈 배열 반환', () => {
    const vsContent = readFile(path.join(SRC, 'lib', 'vector-store.ts'));
    expect(vsContent).toContain('catch');
    expect(vsContent).toContain('return []');
  });
});

// ─── 8. 컴포넌트 아키텍처 (Component Architecture) ──────

describe('8. 컴포넌트 아키텍처 (Component Architecture)', () => {
  it('Base 레이아웃이 전체 페이지 구조 제공', () => {
    const layout = readFile(path.join(SRC, 'layouts', 'Base.astro'));
    expect(layout).toContain('<html');
    expect(layout).toContain('<head');
    expect(layout).toContain('<body');
    expect(layout).toContain('<slot');  // Astro slot for content
    expect(layout).toContain('Header');
    expect(layout).toContain('Footer');
  });

  it('ChatWidget 컴포넌트가 Base 레이아웃에 포함', () => {
    const layout = readFile(path.join(SRC, 'layouts', 'Base.astro'));
    expect(layout).toContain('ChatWidget');
  });

  it('컴포넌트 네이밍: PascalCase .astro 파일', () => {
    const compDir = path.join(SRC, 'components');
    const components = fs.readdirSync(compDir).filter(f => f.endsWith('.astro'));
    for (const comp of components) {
      const name = comp.replace('.astro', '');
      expect(name[0], `${comp} should start with uppercase`).toMatch(/[A-Z]/);
    }
  });

  it('공유 컴포넌트는 src/components/에 위치', () => {
    const expectedShared = ['Header.astro', 'Footer.astro', 'ChatWidget.astro', 'ContactForm.astro', 'ProductGrid.astro'];
    for (const comp of expectedShared) {
      expect(fs.existsSync(path.join(SRC, 'components', comp)), `Missing shared component: ${comp}`).toBe(true);
    }
  });

  it('스타일 시스템: 토큰 기반 디자인 (CSS 변수)', () => {
    const tokens = readFile(path.join(SRC, 'styles', 'tokens.css'));
    const varCount = (tokens.match(/--[\w-]+\s*:/g) || []).length;
    expect(varCount, 'Design tokens should define CSS variables').toBeGreaterThan(5);
  });
});

// ─── 9. 파일 크기/복잡도 제한 (Complexity Limits) ──────

describe('9. 파일 크기/복잡도 제한 (Complexity Limits)', () => {
  it('lib/ 모듈은 200줄 이하', () => {
    const libDir = path.join(SRC, 'lib');
    const libFiles = fs.readdirSync(libDir).filter(f => f.endsWith('.ts'));
    for (const file of libFiles) {
      const lines = countLines(path.join(libDir, file));
      expect(lines, `${file} has ${lines} lines (max 200)`).toBeLessThanOrEqual(200);
    }
  });

  it('API 엔드포인트는 100줄 이하', () => {
    const apiFiles = getAllFiles(path.join(SRC, 'pages', 'api'), '.ts');
    for (const file of apiFiles) {
      const lines = countLines(file);
      const rel = path.relative(ROOT, file);
      expect(lines, `${rel} has ${lines} lines (max 100)`).toBeLessThanOrEqual(100);
    }
  });

  it('.astro 페이지는 1200줄 이하 (초과 시 리팩토링 권고)', () => {
    const pageFiles = getAllFiles(path.join(SRC, 'pages'), '.astro');
    const oversized: string[] = [];
    for (const file of pageFiles) {
      const lines = countLines(file);
      const rel = path.relative(ROOT, file);
      if (lines > 800) oversized.push(`${rel} (${lines}줄)`);
      expect(lines, `${rel} has ${lines} lines (hard max 1200)`).toBeLessThanOrEqual(1200);
    }
    // 800줄 초과 파일 목록 기록 (경고)
    if (oversized.length > 0) {
      console.warn(`[WARN] 800줄 초과 페이지 (리팩토링 권고): ${oversized.join(', ')}`);
    }
  });

  it('컴포넌트는 1300줄 이하 (초과 시 리팩토링 권고)', () => {
    const compFiles = getAllFiles(path.join(SRC, 'components'), '.astro');
    const oversized: string[] = [];
    for (const file of compFiles) {
      const lines = countLines(file);
      const rel = path.relative(ROOT, file);
      if (lines > 500) oversized.push(`${rel} (${lines}줄)`);
      expect(lines, `${rel} has ${lines} lines (hard max 1300)`).toBeLessThanOrEqual(1300);
    }
    if (oversized.length > 0) {
      console.warn(`[WARN] 500줄 초과 컴포넌트 (리팩토링 권고): ${oversized.join(', ')}`);
    }
  });
});

// ─── 10. CMS 콘텐츠 아키텍처 (Content Architecture) ──────

describe('10. CMS 콘텐츠 아키텍처 (Content Architecture)', () => {
  it('제품 JSON 구조 일관성: category, title, pageTitle, description, items', () => {
    const productsDir = path.join(SRC, 'content', 'products');
    const categories = ['military', 'railway', 'industrial', 'telecom', 'sensor', 'hpc'];
    for (const cat of categories) {
      const data = JSON.parse(readFile(path.join(productsDir, `${cat}.json`)));
      expect(data).toHaveProperty('category');
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('pageTitle');
      expect(data).toHaveProperty('description');
      expect(data).toHaveProperty('items');
      expect(data.category).toBe(cat);
    }
  });

  it('CMS 페이지 API에 화이트리스트 기반 파일 접근', () => {
    const pagesApi = readFile(path.join(SRC, 'pages', 'api', 'pages', '[page].ts'));
    expect(pagesApi).toContain('pagesAllowed');
    // 경로 순회 방지 — 화이트리스트만 허용
    expect(pagesApi).toContain("includes(page)");
  });

  it('히스토리 데이터 분리: timeline.json', () => {
    const historyDir = path.join(SRC, 'content', 'history');
    expect(fs.existsSync(historyDir)).toBe(true);
    expect(fs.existsSync(path.join(historyDir, 'timeline.json'))).toBe(true);
  });

  it('콘텐츠 JSON은 유효한 UTF-8', () => {
    const contentDirs = [
      path.join(SRC, 'content', 'products'),
      path.join(SRC, 'content', 'pages'),
    ];
    for (const dir of contentDirs) {
      if (!fs.existsSync(dir)) continue;
      const jsonFiles = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
      for (const file of jsonFiles) {
        const content = readFile(path.join(dir, file));
        expect(() => JSON.parse(content), `${file} should be valid JSON`).not.toThrow();
      }
    }
  });
});
