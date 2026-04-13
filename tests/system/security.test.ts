import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');

/**
 * 보안 검증 테스트
 * 하드코딩된 시크릿, SQL 인젝션 방지, XSS 방지, 보안 헤더 등을 검증합니다.
 */

describe('하드코딩된 시크릿 검사', () => {
  function getAllTsFiles(dir: string): string[] {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
        files.push(...getAllTsFiles(fullPath));
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.mjs'))) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it('소스 코드에 하드코딩된 API 키가 없음', () => {
    const files = getAllTsFiles(SRC);
    const secretPatterns = [
      /['"]sk-[a-zA-Z0-9]{20,}['"]/,       // OpenAI-style API key
      /['"]AKIA[A-Z0-9]{16}['"]/,           // AWS Access Key
      /password\s*=\s*['"][^'"]{8,}['"]/,    // Hardcoded passwords (exclude short ones like '')
      /['"]ghp_[a-zA-Z0-9]{36}['"]/,        // GitHub PAT
    ];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const relPath = path.relative(ROOT, file);
      for (const pattern of secretPatterns) {
        expect(content).not.toMatch(pattern);
      }
    }
  });

  it('.env 파일이 gitignore에 포함됨', () => {
    const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.env');
  });
});

describe('SQL 인젝션 방지', () => {
  function getAllTsFiles(dir: string): string[] {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
        files.push(...getAllTsFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it('모든 SQL 쿼리가 파라미터화된 쿼리 사용', () => {
    const files = getAllTsFiles(SRC);
    // 문자열 연결을 통한 SQL 구성 패턴 검출
    const dangerousPatterns = [
      /\.exec\(`[^`]*\$\{/,             // exec with template literals containing variables
      /\.prepare\(`[^`]*\$\{/,          // prepare with template literals containing variables
    ];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const relPath = path.relative(ROOT, file);
      for (const pattern of dangerousPatterns) {
        expect(content, `SQL injection risk in ${relPath}`).not.toMatch(pattern);
      }
    }
  });

  it('better-sqlite3 prepare().run/get에 ? 파라미터 사용', () => {
    const authContent = fs.readFileSync(path.join(SRC, 'lib', 'auth.ts'), 'utf-8');
    // 모든 prepare 호출 전체 문자열 추출 (여러 줄 포함)
    const prepareStatements = authContent.match(/\.prepare\(['"`][\s\S]*?['"`]\)/g) || [];
    for (const stmt of prepareStatements) {
      if (stmt.includes('SELECT') || stmt.includes('INSERT') || stmt.includes('DELETE')) {
        expect(stmt, 'Should use parameterized query').toContain('?');
      }
    }
  });
});

describe('XSS 방지', () => {
  it('sanitize 모듈이 HTML 태그를 제거함', () => {
    // 직접 import하여 검증
    const sanitizeContent = fs.readFileSync(path.join(SRC, 'lib', 'sanitize.ts'), 'utf-8');
    expect(sanitizeContent).toContain('replace(/<[^>]*>/g');
  });

  it('sanitize 모듈이 특수문자를 이스케이프함', () => {
    const sanitizeContent = fs.readFileSync(path.join(SRC, 'lib', 'sanitize.ts'), 'utf-8');
    expect(sanitizeContent).toContain('&amp;');
    expect(sanitizeContent).toContain('&lt;');
    expect(sanitizeContent).toContain('&gt;');
  });

  it('Chat API가 sanitize를 사용함', () => {
    const chatApi = fs.readFileSync(path.join(SRC, 'pages', 'api', 'chat.ts'), 'utf-8');
    expect(chatApi).toContain('sanitizeChatMessage');
    expect(chatApi).toContain("from '../../lib/sanitize'");
  });

  it('Contact API가 sanitize를 사용함', () => {
    const contactApi = fs.readFileSync(path.join(SRC, 'pages', 'api', 'contact.ts'), 'utf-8');
    expect(contactApi).toContain('sanitizeContactMessage');
  });
});

describe('인증 보안', () => {
  it('세션 쿠키에 HttpOnly 플래그 설정', () => {
    const authContent = fs.readFileSync(path.join(SRC, 'lib', 'auth.ts'), 'utf-8');
    expect(authContent).toContain('HttpOnly');
  });

  it('세션 쿠키에 SameSite 설정', () => {
    const authContent = fs.readFileSync(path.join(SRC, 'lib', 'auth.ts'), 'utf-8');
    expect(authContent).toContain('SameSite=Strict');
  });

  it('비밀번호가 bcrypt로 해싱됨', () => {
    const authContent = fs.readFileSync(path.join(SRC, 'lib', 'auth.ts'), 'utf-8');
    expect(authContent).toContain('bcrypt');
    expect(authContent).toContain('compareSync');
  });

  it('회원가입 시 비밀번호 복잡성 정책 검증', () => {
    const registerContent = fs.readFileSync(path.join(SRC, 'pages', 'api', 'auth', 'register.ts'), 'utf-8');
    expect(registerContent).toContain('validatePassword');
  });

  it('비밀번호 재설정 시 기존 세션 모두 삭제', () => {
    const resetContent = fs.readFileSync(path.join(SRC, 'pages', 'api', 'auth', 'reset-password.ts'), 'utf-8');
    expect(resetContent).toContain('DELETE FROM sessions WHERE admin_id');
  });
});

describe('보안 헤더', () => {
  it('middleware에 보안 헤더 설정됨', () => {
    const middleware = fs.readFileSync(path.join(SRC, 'middleware.ts'), 'utf-8');
    expect(middleware).toContain('X-Frame-Options');
    expect(middleware).toContain('X-Content-Type-Options');
    expect(middleware).toContain('Referrer-Policy');
    expect(middleware).toContain('Permissions-Policy');
    expect(middleware).toContain('Strict-Transport-Security');
    expect(middleware).toContain('Content-Security-Policy');
  });

  it('X-Frame-Options이 DENY로 설정', () => {
    const middleware = fs.readFileSync(path.join(SRC, 'middleware.ts'), 'utf-8');
    expect(middleware).toContain("'DENY'");
  });

  it('CSP에 unsafe-eval이 포함되지 않음', () => {
    const middleware = fs.readFileSync(path.join(SRC, 'middleware.ts'), 'utf-8');
    expect(middleware).not.toContain('unsafe-eval');
  });
});

describe('Rate Limiting', () => {
  it('Chat API에 rate limiting 적용', () => {
    const chatApi = fs.readFileSync(path.join(SRC, 'pages', 'api', 'chat.ts'), 'utf-8');
    expect(chatApi).toContain('checkRateLimit');
    expect(chatApi).toContain('429');
  });

  it('Contact API에 rate limiting 적용', () => {
    const contactApi = fs.readFileSync(path.join(SRC, 'pages', 'api', 'contact.ts'), 'utf-8');
    expect(contactApi).toContain('checkRateLimit');
    expect(contactApi).toContain('429');
  });
});

describe('입력 유효성 검증', () => {
  it('Chat API에 Zod 스키마 검증 적용', () => {
    const chatApi = fs.readFileSync(path.join(SRC, 'pages', 'api', 'chat.ts'), 'utf-8');
    expect(chatApi).toContain('z.object');
    expect(chatApi).toContain('safeParse');
    expect(chatApi).toContain('400');
  });

  it('Contact API에 Zod 스키마 검증 적용', () => {
    const contactApi = fs.readFileSync(path.join(SRC, 'pages', 'api', 'contact.ts'), 'utf-8');
    expect(contactApi).toContain('z.object');
    expect(contactApi).toContain('safeParse');
    expect(contactApi).toContain('400');
  });

  it('Register API에 필수 필드 검증', () => {
    const registerApi = fs.readFileSync(path.join(SRC, 'pages', 'api', 'auth', 'register.ts'), 'utf-8');
    expect(registerApi).toContain('!email || !code || !password');
  });
});
