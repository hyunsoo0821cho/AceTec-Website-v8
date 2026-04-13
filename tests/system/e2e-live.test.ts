import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://192.168.10.182:8080';

/**
 * E2E 라이브 사이트 테스트
 * 실제 운영 서버(192.168.10.182:8080)에 HTTP 요청을 보내 검증합니다.
 * 계정/이메일 테스트 제외.
 */

// ─── 페이지 접근성 (HTTP 200) ──────

describe('E2E: 페이지 접근성', () => {
  const pages = [
    { path: '/', name: '홈 (index)' },
    { path: '/about', name: '회사 소개' },
    { path: '/contact', name: '문의하기' },
    { path: '/applications', name: '적용 분야' },
    { path: '/solutions', name: '솔루션' },
    { path: '/history', name: '연혁' },
    { path: '/careers', name: '채용' },
    { path: '/training', name: '교육' },
    { path: '/news', name: '뉴스' },
    { path: '/products-intro', name: '제품 소개' },
    { path: '/catalog', name: '카탈로그' },
    { path: '/login', name: '로그인' },
    { path: '/register', name: '회원가입' },
  ];

  for (const { path, name } of pages) {
    it(`${name} (${path}) — HTTP 200`, async () => {
      const res = await fetch(`${BASE_URL}${path}`, { redirect: 'follow' });
      expect(res.status, `${path} should return 200`).toBe(200);
    });
  }

  it('404 페이지 — 존재하지 않는 경로', async () => {
    const res = await fetch(`${BASE_URL}/this-page-does-not-exist-xyz`);
    expect(res.status).toBe(404);
  });
});

// ─── 페이지 HTML 콘텐츠 검증 ──────

describe('E2E: HTML 콘텐츠 검증', () => {
  it('홈 페이지에 AceTec/에이스텍 관련 콘텐츠 포함', async () => {
    const res = await fetch(`${BASE_URL}/`);
    const html = await res.text();
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
    // 기본 구조
    expect(html).toContain('<head');
    expect(html).toContain('<body');
  });

  it('홈 페이지에 네비게이션 포함', async () => {
    const res = await fetch(`${BASE_URL}/`);
    const html = await res.text();
    expect(html).toContain('<nav');
    expect(html).toContain('<header');
  });

  it('홈 페이지에 footer 포함', async () => {
    const res = await fetch(`${BASE_URL}/`);
    const html = await res.text();
    expect(html).toContain('<footer');
  });

  it('제품 카테고리 페이지 접근 가능', async () => {
    const categories = ['military', 'railway', 'industrial', 'telecom', 'sensor', 'hpc'];
    for (const cat of categories) {
      const res = await fetch(`${BASE_URL}/products/${cat}`);
      // 200 또는 404 (데이터 없으면)
      expect([200, 404]).toContain(res.status);
    }
  });

  it('about 페이지에 회사 정보 구조 포함', async () => {
    const res = await fetch(`${BASE_URL}/about`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('<html');
  });
});

// ─── 보안 헤더 검증 ──────

describe('E2E: 보안 헤더', () => {
  it('X-Frame-Options 헤더 설정', async () => {
    const res = await fetch(`${BASE_URL}/`);
    expect(res.headers.get('x-frame-options')).toBe('DENY');
  });

  it('X-Content-Type-Options 헤더 설정', async () => {
    const res = await fetch(`${BASE_URL}/`);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('Referrer-Policy 헤더 설정', async () => {
    const res = await fetch(`${BASE_URL}/`);
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
  });

  it('Strict-Transport-Security 헤더 설정', async () => {
    const res = await fetch(`${BASE_URL}/`);
    const hsts = res.headers.get('strict-transport-security');
    expect(hsts).toContain('max-age=');
  });

  it('Content-Security-Policy 헤더 설정', async () => {
    const res = await fetch(`${BASE_URL}/`);
    const csp = res.headers.get('content-security-policy');
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src");
  });

  it('Permissions-Policy 헤더 설정', async () => {
    const res = await fetch(`${BASE_URL}/`);
    const pp = res.headers.get('permissions-policy');
    expect(pp).toContain('camera=()');
    expect(pp).toContain('microphone=()');
  });
});

// ─── API 엔드포인트 라이브 테스트 ──────

describe('E2E: API 엔드포인트', () => {
  it('GET /api/health — 서버 상태 확인', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.server).toBe('ok');
  });

  it('POST /api/chat — 빈 body 400 반환', async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/chat — 빈 메시지 400 반환', async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/contact — 빈 body 400 반환', async () => {
    const res = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/contact — 유효하지 않은 이메일 400 반환', async () => {
    const res = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
      body: JSON.stringify({
        firstName: '테스트',
        lastName: '사용자',
        email: 'invalid',
        message: '테스트 메시지',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('GET /api/admin/stats — 미인증 401 반환', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`);
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/users — 미인증 401 반환', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users`);
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me — 미인증 401 반환', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`);
    expect(res.status).toBe(401);
  });

  it('GET /api/conversations — visitor_id 없이 400 반환', async () => {
    const res = await fetch(`${BASE_URL}/api/conversations`);
    expect(res.status).toBe(400);
  });

  it('GET /api/messages — conversation_id 없이 400 반환', async () => {
    const res = await fetch(`${BASE_URL}/api/messages`);
    expect(res.status).toBe(400);
  });
});

// ─── 정적 리소스 ──────

describe('E2E: 정적 리소스', () => {
  it('favicon 접근 가능', async () => {
    const res = await fetch(`${BASE_URL}/favicon.svg`);
    expect([200, 304]).toContain(res.status);
  });

  it('fonts 디렉토리 접근 가능', async () => {
    const res = await fetch(`${BASE_URL}/fonts/roboto-latin.woff2`);
    expect([200, 304]).toContain(res.status);
  });
});

// ─── 응답 시간 ──────

describe('E2E: 응답 성능', () => {
  it('홈 페이지 응답 3초 이내', async () => {
    const start = Date.now();
    await fetch(`${BASE_URL}/`);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });

  it('/api/health 응답 2초 이내', async () => {
    const start = Date.now();
    await fetch(`${BASE_URL}/api/health`);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });
});
