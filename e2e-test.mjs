import http from 'node:http';

const BASE = 'http://192.168.10.182:8080';

function request(method, path, body = null) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      timeout: 15000,
      headers: {},
    };
    if (body) {
      const data = JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = http.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
    });
    req.on('error', (e) => resolve({ status: 0, headers: {}, body: `ERROR: ${e.message}` }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, headers: {}, body: 'TIMEOUT' }); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const results = {};
  let totalPass = 0;
  let totalFail = 0;

  function record(cat, name, pass, detail = '') {
    if (!results[cat]) results[cat] = [];
    results[cat].push({ name, pass, detail });
    if (pass) totalPass++; else totalFail++;
  }

  // ============ CATEGORY 4: AUTH & SECURITY ============
  console.log('\n============================================');
  console.log('  CATEGORY 4: AUTH & SECURITY FLOWS');
  console.log('============================================');

  // /api/auth/me without cookie
  let r = await request('GET', '/api/auth/me');
  console.log(`GET /api/auth/me -> ${r.status}`);
  record('4_auth', '/api/auth/me 비인증 시 401', r.status === 401, `status=${r.status}`);

  // POST /api/auth/logout
  r = await request('POST', '/api/auth/logout');
  console.log(`POST /api/auth/logout -> ${r.status}`);
  record('4_auth', '/api/auth/logout 302 리다이렉트', r.status === 302 || r.status === 200, `status=${r.status}`);

  // /admin/dashboard without auth
  r = await request('GET', '/admin/dashboard');
  console.log(`GET /admin/dashboard -> ${r.status}`);
  record('4_auth', '/admin/dashboard 비인증 시 302', r.status === 302, `status=${r.status}`);

  // /account without auth
  r = await request('GET', '/account');
  console.log(`GET /account -> ${r.status}`);
  record('4_auth', '/account 비인증 시 302', r.status === 302, `status=${r.status}`);

  // Admin API endpoints
  for (const ep of ['/api/admin/users', '/api/admin/stats', '/api/admin/access-requests']) {
    r = await request('GET', ep);
    console.log(`GET ${ep} -> ${r.status}`);
    record('4_auth', `${ep} 비인증 시 401`, r.status === 401, `status=${r.status}`);
  }

  // Security headers
  r = await request('GET', '/');
  const secHeaders = ['content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy'];
  const hsts = r.headers['strict-transport-security'];
  console.log('\nSecurity headers on /');
  for (const h of secHeaders) {
    const found = !!r.headers[h];
    console.log(`  ${h}: ${found ? 'FOUND' : 'MISSING'}`);
    record('4_auth', `보안 헤더 ${h}`, found, found ? 'present' : 'missing');
  }
  // HSTS is not expected on HTTP, mark accordingly
  const hstsFound = !!hsts;
  console.log(`  strict-transport-security: ${hstsFound ? 'FOUND' : 'MISSING (expected on HTTPS only)'}`);
  record('4_auth', '보안 헤더 strict-transport-security', true, 'HTTP이므로 HSTS 미적용은 정상');

  // ============ CATEGORY 5: CONTENT INTEGRITY ============
  console.log('\n============================================');
  console.log('  CATEGORY 5: CONTENT INTEGRITY');
  console.log('============================================');

  // Home page
  r = await request('GET', '/');
  const home = r.body;
  record('5_content', '홈페이지 히어로 섹션', /hero/i.test(home), '');
  record('5_content', '홈페이지 솔루션 카드', /solution/i.test(home), '');
  record('5_content', '홈페이지 파트너 로고', /partner/i.test(home), '');
  record('5_content', '홈페이지 서비스 플랜', /plan|pricing|서비스/i.test(home), '');
  console.log('Home: hero=' + /hero/i.test(home) + ' solution=' + /solution/i.test(home) + ' partner=' + /partner/i.test(home) + ' plan=' + /plan|pricing|서비스/i.test(home));

  // Solutions page
  r = await request('GET', '/solutions');
  record('5_content', '솔루션 페이지 카드/탭', /solution|tab|sol-card/i.test(r.body), '');
  console.log('Solutions: cards/tabs=' + /solution|tab/i.test(r.body));

  // Catalog page
  r = await request('GET', '/catalog');
  record('5_content', '카탈로그 제품 카테고리', /category|catalog|product/i.test(r.body), '');
  console.log('Catalog: categories=' + /category|catalog|product/i.test(r.body));

  // Applications page
  r = await request('GET', '/applications');
  record('5_content', '응용분야 챕터/아코디언', /chapter|accordion|app-section|section/i.test(r.body), '');
  record('5_content', '응용분야 FAQ', /faq|FAQ|자주/i.test(r.body), '');
  console.log('Applications: chapters=' + /chapter|accordion/i.test(r.body) + ' faq=' + /faq/i.test(r.body));

  // About page
  r = await request('GET', '/about');
  record('5_content', '회사소개 통계 섹션', /stat|counter|number|숫자/i.test(r.body), '');
  record('5_content', '회사소개 철학/비전', /philosophy|value|mission|vision|철학|비전/i.test(r.body), '');
  console.log('About: stats=' + /stat|counter/i.test(r.body) + ' philosophy=' + /philosophy|vision|mission/i.test(r.body));

  // History page
  r = await request('GET', '/history');
  record('5_content', '연혁 기간 탭', /period|tab|timeline|year/i.test(r.body), '');
  console.log('History: tabs=' + /period|tab|timeline|year/i.test(r.body));

  // Contact page
  r = await request('GET', '/contact');
  record('5_content', '연락처 양식', /form|contact-form/i.test(r.body), '');
  record('5_content', '연락처 사무실 정보', /office|address|location|map|주소/i.test(r.body), '');
  console.log('Contact: form=' + /form/i.test(r.body) + ' office=' + /office|address|주소/i.test(r.body));

  // Login page
  r = await request('GET', '/login');
  record('5_content', '로그인 이메일 입력', /type="email"|type='email'/i.test(r.body), '');
  record('5_content', '로그인 비밀번호 입력', /type="password"|type='password'/i.test(r.body), '');
  record('5_content', '로그인 관리자 섹션', /details|admin|관리자/i.test(r.body), '');
  console.log('Login: email=' + /type="email"/i.test(r.body) + ' password=' + /type="password"/i.test(r.body) + ' admin=' + /details|admin|관리자/i.test(r.body));

  // ============ CATEGORY 6: PRODUCT PAGES ============
  console.log('\n============================================');
  console.log('  CATEGORY 6: PRODUCT PAGES CONTENT');
  console.log('============================================');

  const products = ['military', 'railway', 'industrial', 'telecom', 'sensor', 'hpc', 'ipc', 'radar', 'interconnect'];
  for (const prod of products) {
    r = await request('GET', `/products/${prod}`);
    const html = r.body;
    const hasCards = /p-card|product-card|prod-card/i.test(html);
    const hasHeaders = /<h[1-3]/i.test(html);
    const hasBanner = /access-request|login-prompt|request-access|로그인|견적|제품\s*문의/i.test(html);
    const hasImages = /<img/i.test(html);
    record('6_product', `${prod} 제품 카드`, hasCards, '');
    record('6_product', `${prod} 섹션 헤더`, hasHeaders, '');
    record('6_product', `${prod} 접근 배너/로그인 프롬프트`, hasBanner, '');
    record('6_product', `${prod} 이미지`, hasImages, '');
    console.log(`${prod}: cards=${hasCards} headers=${hasHeaders} banner=${hasBanner} images=${hasImages}`);
  }

  // ============ CATEGORY 7: API HEALTH & INTEGRATION ============
  console.log('\n============================================');
  console.log('  CATEGORY 7: API HEALTH & INTEGRATION');
  console.log('============================================');

  // Health
  r = await request('GET', '/api/health');
  console.log(`Health: ${r.status} body=${r.body.substring(0, 300)}`);
  record('7_api', 'GET /api/health 200', r.status === 200, `status=${r.status}`);

  let healthObj = {};
  try { healthObj = JSON.parse(r.body); } catch(e) {}
  record('7_api', '/api/health 서버 상태 ok', healthObj.server === 'ok' || healthObj.status === 'ok', JSON.stringify(healthObj).substring(0, 100));
  record('7_api', '/api/health AI 상태 포함', r.body.includes('ai') || r.body.includes('ollama'), '');

  // Contact with correct field names
  r = await request('POST', '/api/contact', {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    company: 'TestCo',
    phone: '010-1234-5678',
    message: 'E2E test message for integration.'
  });
  console.log(`Contact valid: ${r.status} body=${r.body.substring(0, 300)}`);
  record('7_api', 'POST /api/contact 유효 데이터 -> 200', r.status === 200 || r.status === 201, `status=${r.status}`);

  // 404 page
  r = await request('GET', '/nonexistent-page-xyz');
  console.log(`404 page: ${r.status}`);
  record('7_api', '404 페이지 올바른 상태코드', r.status === 404, `status=${r.status}`);
  record('7_api', '404 커스텀 페이지', /404|not found|찾을 수 없/i.test(r.body), '');

  // Chat (longer timeout)
  console.log('Testing chat API (may take a while)...');
  r = await new Promise((resolve) => {
    const opts = {
      hostname: '192.168.10.182',
      port: 8080,
      path: '/api/chat',
      method: 'POST',
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' },
    };
    const body = JSON.stringify({ message: '안녕하세요', history: [] });
    opts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = http.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', (e) => resolve({ status: 0, body: `ERROR: ${e.message}` }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: 'TIMEOUT' }); });
    req.write(body);
    req.end();
  });
  console.log(`Chat: ${r.status} body=${r.body.substring(0, 300)}`);
  record('7_api', 'POST /api/chat AI 응답 생성', r.status === 200, `status=${r.status}`);
  if (r.status === 200) {
    try {
      const chatResp = JSON.parse(r.body);
      record('7_api', 'POST /api/chat 응답 비어있지 않음', !!(chatResp.reply || chatResp.message || chatResp.response), '');
    } catch(e) {
      record('7_api', 'POST /api/chat 응답 비어있지 않음', r.body.length > 10, '');
    }
  } else {
    record('7_api', 'POST /api/chat 응답 비어있지 않음', false, `Chat failed with status ${r.status}: ${r.body.substring(0, 100)}`);
  }

  // ============ CATEGORY 8: RESPONSIVE & ACCESSIBILITY ============
  console.log('\n============================================');
  console.log('  CATEGORY 8: RESPONSIVE & ACCESSIBILITY');
  console.log('============================================');

  const allPages = ['/', '/solutions', '/catalog', '/applications', '/about', '/history', '/contact', '/login', '/register', '/forgot-password',
    '/products/military', '/products/railway', '/products/industrial', '/products/telecom', '/products/sensor',
    '/products/hpc', '/products/ipc', '/products/radar', '/products/interconnect'];

  let vpPass = 0, vpFail = 0, mdPass = 0, mdFail = 0, mmPass = 0, mmFail = 0, semPass = 0, semFail = 0;
  const vpFailPages = [], mdFailPages = [], mmFailPages = [], semFailPages = [];

  for (const page of allPages) {
    r = await request('GET', page);
    const html = r.body;

    if (/viewport/i.test(html)) vpPass++; else { vpFail++; vpFailPages.push(page); }
    if (/meta.*description|name="description"/i.test(html)) mdPass++; else { mdFail++; mdFailPages.push(page); }
    if (/mobile-menu|MobileMenu|hamburger|menu-toggle|nav-toggle/i.test(html)) mmPass++; else { mmFail++; mmFailPages.push(page); }

    const hasHeader = /<header/i.test(html);
    const hasFooter = /<footer/i.test(html);
    const hasNav = /<nav/i.test(html);
    if (hasHeader && hasFooter && hasNav) semPass++; else { semFail++; semFailPages.push(page); }
  }

  console.log(`Viewport: ${vpPass} pass, ${vpFail} fail${vpFail > 0 ? ' -> ' + vpFailPages.join(', ') : ''}`);
  console.log(`Meta desc: ${mdPass} pass, ${mdFail} fail${mdFail > 0 ? ' -> ' + mdFailPages.join(', ') : ''}`);
  console.log(`Mobile menu: ${mmPass} pass, ${mmFail} fail${mmFail > 0 ? ' -> ' + mmFailPages.join(', ') : ''}`);
  console.log(`Semantic HTML: ${semPass} pass, ${semFail} fail${semFail > 0 ? ' -> ' + semFailPages.join(', ') : ''}`);

  record('8_responsive', '모든 페이지 viewport 메타태그', vpFail === 0, `${vpPass}/${allPages.length} pages`);
  record('8_responsive', '모든 페이지 meta description', mdFail === 0, mdFail > 0 ? `missing: ${mdFailPages.join(', ')}` : `${mdPass}/${allPages.length}`);
  record('8_responsive', '모든 페이지 모바일 메뉴', mmFail === 0, mmFail > 0 ? `missing: ${mmFailPages.join(', ')}` : `${mmPass}/${allPages.length}`);
  record('8_responsive', '모든 페이지 시맨틱 HTML (header/footer/nav)', semFail === 0, semFail > 0 ? `missing: ${semFailPages.join(', ')}` : `${semPass}/${allPages.length}`);

  // ARIA check
  const homeR = await request('GET', '/');
  const ariaCount = (homeR.body.match(/aria-/gi) || []).length;
  console.log(`ARIA attributes on home page: ${ariaCount}`);
  record('8_responsive', 'ARIA 속성 사용 (홈페이지)', ariaCount > 0, `${ariaCount} aria- attributes found`);

  // ============ FINAL SUMMARY ============
  console.log('\n\n========================================================');
  console.log('  E2E 테스트 최종 결과');
  console.log('========================================================\n');

  const categories = Object.keys(results);
  let grandPass = 0, grandFail = 0;

  for (const cat of categories) {
    const items = results[cat];
    const catPass = items.filter(i => i.pass).length;
    const catFail = items.filter(i => !i.pass).length;
    const pct = ((catPass / items.length) * 100).toFixed(1);
    grandPass += catPass;
    grandFail += catFail;

    const catNames = {
      '4_auth': '4. 인증 & 보안 (Auth & Security)',
      '5_content': '5. 콘텐츠 무결성 (Content Integrity)',
      '6_product': '6. 제품 페이지 (Product Pages)',
      '7_api': '7. API 상태 & 통합 (API Health & Integration)',
      '8_responsive': '8. 반응형 & 접근성 (Responsive & Accessibility)',
    };

    console.log(`\n--- ${catNames[cat] || cat} ---`);
    console.log(`총 ${items.length}개 | 통과: ${catPass} | 실패: ${catFail} | 통과율: ${pct}%`);
    for (const item of items) {
      console.log(`  ${item.pass ? 'PASS' : 'FAIL'} | ${item.name}${item.detail && !item.pass ? ' -> ' + item.detail : ''}`);
    }
  }

  const grandTotal = grandPass + grandFail;
  const grandPct = ((grandPass / grandTotal) * 100).toFixed(1);
  console.log(`\n========================================================`);
  console.log(`  카테고리 4-8 전체 결과: ${grandTotal}개 중 ${grandPass}개 통과 (${grandPct}%)`);
  console.log(`========================================================`);
}

main().catch(console.error);
