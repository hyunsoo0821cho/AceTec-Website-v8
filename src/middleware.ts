import { defineMiddleware } from 'astro:middleware';
import getDb from './lib/db';
import { verifySession, getUserInfo, getSessionIdFromCookie } from './lib/auth';

// CSRF 허용 Origin 화이트리스트 — 기본값은 내부 IP + 운영 도메인.
// CSRF_ALLOWED_ORIGINS 환경변수(콤마 구분)로 재정의 가능.
const DEFAULT_ALLOWED_ORIGINS = [
  'http://192.168.10.182:8080',
  'http://localhost:8080',
  'http://localhost:4321',
  'https://www.acetronix.co.kr',
  'https://acetronix.co.kr',
];
const ALLOWED_ORIGINS = new Set(
  (process.env.CSRF_ALLOWED_ORIGINS
    ? process.env.CSRF_ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS),
);

export const onRequest = defineMiddleware(async (_context, next) => {
  // 방문자 로그 기록 (HTML 페이지 요청만)
  const url = _context.url;
  if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/_') && !url.pathname.includes('.')) {
    try {
      const ip = _context.request.headers.get('x-forwarded-for') || 'unknown';
      const ua = _context.request.headers.get('user-agent') || '';
      getDb().prepare('INSERT INTO visitor_logs (ip, path, user_agent, created_at) VALUES (?, ?, ?, ?)').run(ip, url.pathname, ua, Date.now());
    } catch { /* 로깅 실패 무시 */ }
  }

  // ==== CSRF 보호: 상태 변경 요청(POST/PUT/PATCH/DELETE)의 Origin 검증 ====
  const method = _context.request.method.toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const origin = _context.request.headers.get('origin');
    // Origin 헤더가 있으면 화이트리스트 확인 (헤더 없으면 같은 오리진 또는 non-browser 요청)
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      try {
        getDb().prepare('INSERT INTO audit_logs (action, detail, created_at) VALUES (?, ?, ?)').run(
          'csrf_blocked', `method=${method} path=${url.pathname} origin=${origin}`, Date.now()
        );
      } catch { /* 로깅 실패 무시 */ }
      return new Response(JSON.stringify({ error: 'Forbidden: invalid origin' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // ==== 경로 기반 권한 강제 (Defense-in-depth) ====
  // 기존 엔드포인트별 체크는 유지하고, 미들웨어에서 1차 필터링만 수행
  const path = url.pathname;
  const needsAdmin = path.startsWith('/admin/') || path.startsWith('/api/admin/');
  if (needsAdmin) {
    // SQLite 장애 시 미들웨어 전체가 크래시되지 않도록 방어
    let adminId: number | null = null;
    let user: { role?: string } | null = null;
    try {
      const sid = getSessionIdFromCookie(_context.request.headers.get('cookie'));
      adminId = verifySession(sid);
      user = adminId ? getUserInfo(adminId) : null;
    } catch {
      // DB 장애: 인증 불가로 간주하여 안전하게 거부
      if (path.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 302, headers: { Location: '/login' } });
    }
    if (!user || user.role !== 'admin') {
      // 감사 로그
      try {
        const ip = _context.request.headers.get('x-forwarded-for') || 'unknown';
        getDb().prepare('INSERT INTO audit_logs (admin_id, action, detail, created_at) VALUES (?, ?, ?, ?)').run(
          adminId ?? null,
          'unauthorized_access_attempt',
          `path=${path} | role=${user?.role ?? 'anonymous'} | IP: ${ip}`,
          Date.now()
        );
      } catch { /* 로깅 실패 무시 */ }
      // API: 미인증=401 / 권한부족=403. 페이지는 /login 리다이렉트
      if (path.startsWith('/api/')) {
        const status = user ? 403 : 401;
        return new Response(JSON.stringify({ error: user ? 'Forbidden' : 'Unauthorized' }), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 302, headers: { Location: '/login' } });
    }
  }

  let response: Response;
  try {
    response = await next();
  } catch {
    // H3: 에러 스택 트레이스 외부 노출 방지 — 일반 메시지만 반환
    return new Response(JSON.stringify({ error: '일시적인 오류가 발생했습니다' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // HTML no-cache (CSS/JS는 Astro 해시 파일명으로 자동 버스팅되므로 제외)
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // H2: 브라우저 권한 제한 — payment/usb/bluetooth 추가
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()');
  // H1: 탭 간 DOM 접근(Spectre) 차단
  // 브라우저는 HTTPS / localhost / 127.0.0.1 등 "trustworthy origin" 에서만 COOP 을 적용하고
  // 그 외(예: LAN IP http)에서는 헤더를 무시하며 콘솔 경고를 찍음 → 해당 환경에서만 전송하여 노이즈 제거.
  // NOTE: Astro의 _context.url.hostname 은 allowedDomains 미설정 시 내부적으로 'localhost' 로 고정 fallback 되므로
  //       실제 클라이언트가 접속한 주소 판정은 원본 Host 헤더와 X-Forwarded-Proto 를 직접 본다.
  const _rawHost = (_context.request.headers.get('host') || '').split(':')[0].trim();
  const _forwardedProto = _context.request.headers.get('x-forwarded-proto');
  const _isHttps = _forwardedProto === 'https' || _context.url.protocol === 'https:';
  const _isLoopback =
    _rawHost === 'localhost' || _rawHost === '127.0.0.1' || _rawHost === '::1' || _rawHost === '[::1]';
  const _isTrustworthy = _isHttps || _isLoopback;
  if (_isTrustworthy) {
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  } else {
    // LAN IP http 등 신뢰불가 출처에선 브라우저가 어차피 헤더를 무시하고 콘솔 경고만 찍으므로
    // 송신 자체를 삭제하여 DevTools 콘솔 노이즈를 제거.
    response.headers.delete('Cross-Origin-Opener-Policy');
  }
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // Content Security Policy — 기존 디렉티브(default/script/style/img/connect/font)는 그대로 유지하고
  // 방어 강화용 디렉티브 4개만 추가함 (script-src 'unsafe-inline'는 Astro 인라인 호환성을 위해 유지).
  //   • object-src 'none'        : Flash / plugin 실행 원천 차단
  //   • base-uri 'self'          : <base> 태그 주입 URL 하이재킹 차단
  //   • form-action 'self'       : XSS로 주입된 폼이 외부 사이트로 데이터 전송하지 못하도록 차단
  //   • frame-ancestors 'none'   : Clickjacking 차단 (X-Frame-Options 상위 호환)
  // NOTE: `upgrade-insecure-requests`는 HTTP 운영 중인 현재 환경에서 CSS/JS 전부 HTTPS로 승격시켜
  //        리소스 로드가 실패하므로 제외. 도메인/HTTPS 전환 시 다시 추가 예정 (README 18장 참조).
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:11434 https://translate.googleapis.com; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  );

  return response;
});
