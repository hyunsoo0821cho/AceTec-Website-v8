import { defineMiddleware } from 'astro:middleware';
import getDb from './lib/db';

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

  const response = await next();

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:11434; font-src 'self'",
  );

  return response;
});
