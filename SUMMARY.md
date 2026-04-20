# AceTec 홈페이지 보안·품질 감사 리포트

- **대상**: `http://192.168.10.182:8080` (AceTec 홈페이지, Astro 6 + Ollama)
- **최종 감사일**: 2026-04-17
- **도구**: OWASP ZAP 2.17.0 + 수동 curl + ECC 에이전트 (security-reviewer, code-reviewer, architect)
- **범위**: Frontend / Backend / Database / Playwright (페이지별)

---

## 감사 요약

| 심각도 | 건수 | 설명 |
|--------|------|------|
| **CRITICAL** | 8 | 즉시 조치 필요 — 계정 탈취, 데이터 변조, 서비스 장애 위험 |
| **HIGH** | ~80 | 단기 조치 권장 — 권한 우회, 데이터 누출, 테스트 부재 |
| **MEDIUM** | ~30 | 중기 개선 — 기술 부채, 코드 품질, 설정 문제 |

---

## 공통 이슈 (전체 페이지 해당)

### Frontend (공통)
- CSP `unsafe-inline` 잔존 — `script-src 'self' 'unsafe-inline'`으로 XSS 방어 무력화 가능 `middleware.ts:128` **MEDIUM**

### Backend (공통)
- CSP `connect-src`에 `localhost:11434`(Ollama) 노출 — 내부 서버 구조가 브라우저에 보임 `middleware.ts:128` **MEDIUM**
- Ollama URL 하드코딩 4곳 — `chat.ts:4`, `embeddings.ts:1`, `health.ts:21`, `middleware.ts:128` (환경변수 미사용) **HIGH**
- Qdrant URL 하드코딩 — `vector-store.ts:3` **MEDIUM**
- Qdrant 외부 쓰기 봉쇄 설정(API_KEY/read_only) 미확인 **MEDIUM**
- CSRF 방어가 Origin 헤더 체크만 — Origin 없는 요청(curl 등)이 통과됨 `middleware.ts:30` (SameSite=Strict 쿠키로 부분 완화) **MEDIUM**
- `x-forwarded-for` 검증 없이 신뢰 — 클라이언트가 위조 가능, rate limit 우회 + 감사 로그 오염 **MEDIUM**
- 구조화 로깅 없음 — `console.log/error/warn` 15곳 산재, 프로덕션 로그 관리 불가 **MEDIUM**
- `.env.example` 파일 없음 — 새 환경 설치 시 필수 환경변수 목록 부재 **MEDIUM**
- 500 에러 페이지(`500.astro`) 없음 — 서버 오류 시 빈 화면 **MEDIUM**
- npm audit 취약점: vite 3건(CVE) + defu prototype pollution **HIGH**

### Database (공통)
- DB 인덱스 0개 + 만료 데이터 정리(cleanup) 없음 — sessions/visitor_logs/verification_codes가 무한 증가 `db.ts` **CRITICAL**
- 정기 백업 자동화 없음 — 장애 시 데이터 복구 수단 없음 **HIGH**
- `PRAGMA busy_timeout` 미설정 — 동시 요청 시 `SQLITE_BUSY` 에러 `db.ts` **HIGH**
- sessions 테이블 FK CASCADE 누락 — `ON DELETE CASCADE` 없어 계정 삭제 시 세션 잔존 `db.ts:33` (코드 레벨 수동 삭제는 있으나 방어심층 부재) **HIGH**
- `admins.email` 컬럼에 UNIQUE 제약 없음 — DB 수준 중복 이메일 차단 불가 `db.ts:106` **HIGH**
- Dockerfile이 DB 파일을 이미지에 포함(`COPY data`) — 컨테이너 재시작 시 데이터 소실 `Dockerfile:14` **HIGH**
- DB 경로가 `process.cwd()`에 의존 — 실행 디렉토리 변경 시 빈 DB 생성 `db.ts:5` **MEDIUM**
- Qdrant 이미지 버전 태그 미지정(암묵적 latest) — 업데이트 시 호환성 깨질 수 있음 **HIGH**

### Playwright (공통)
- E2E 테스트 전반 부재 — 아래 페이지별 항목 참조 **HIGH**
- a11y 자동화 테스트 미포함 (적용 분야, 로그인, 비밀번호 재설정, 설문, 군수, 철도, 자동화, 정보통신, M&S, 슈퍼컴퓨팅, 레이더, 인터커넥트, 내 정보 등) **HIGH**

---

## 페이지별 이슈

### Home
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Playwright | 홈 레이아웃 기능 E2E 테스트 없음 | HIGH |
| Playwright | 관리자/사용자 화면 분기 렌더링 자동화 테스트 없음 | HIGH |

### Solutions
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Playwright | 솔루션 항목 렌더링 E2E 테스트 없음 | HIGH |
| Playwright | 언어 전환 시 콘텐츠 정합성 E2E 테스트 없음 | HIGH |

### Products (전체 카탈로그)
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Database | DB 인덱스 0개 — 제품 검색·목록 조회 성능 직격 | CRITICAL |
| Playwright | 제품 목록 렌더링 E2E 테스트 없음 | HIGH |
| Playwright | 이미지 로딩 검증 자동화 없음 | HIGH |

### 적용 분야
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Frontend | 접근성(a11y) 테스트 미포함 | HIGH |
| Playwright | 분야별 페이지 라우팅 E2E 테스트 없음 | HIGH |
| Playwright | 언어 전환 렌더링 검증 없음 | HIGH |

### 회사소개 / About
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Frontend | 디자인 톤앤매너 적용 수치(70%) — 주관적 평가, 객관 근거 없음 | MEDIUM |
| Playwright | About 콘텐츠 렌더링 E2E 테스트 없음 | HIGH |
| Playwright | 다국어 전환 시 레이아웃 E2E 테스트 없음 | HIGH |

### 연혁·레퍼런스
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Playwright | 연혁 타임라인 렌더링 E2E 테스트 없음 | HIGH |
| Playwright | 레퍼런스 이미지 로딩 검증 없음 | HIGH |

### 문의하기 (Contact)
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Backend | SMTP 프로덕션 전환 미완료 — SPF/DKIM 없어 스팸 처리·도메인 위조 위험 | HIGH |
| Backend | 메일 발송 성공률 추적 없음 | HIGH |
| Backend | Supabase 미설정 시 문의 데이터가 저장 안 되면서 `{ success: true }` 반환 — 문의 소실 `contact.ts:48-57` | HIGH |
| Backend | `contact.ts`가 Zod 에러 상세(`parsed.error.flatten()`)를 클라이언트에 반환 — 스키마 구조 노출 `contact.ts:32` | MEDIUM |
| Backend | `email.ts`에 console.log 디버그 코드 잔존 — 이메일·인증 코드가 서버 로그에 평문 출력 `email.ts:64,70,73,74` | MEDIUM |
| Playwright | 문의 폼 제출 → 메일 수신 E2E 테스트 없음 | HIGH |
| Playwright | SMTP 스모크 테스트 자동화 없음 | HIGH |
| Playwright | 폼 유효성 검사 시나리오 없음 | HIGH |

### 로그인 (Login)
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Frontend | 계정 잠금 알림 UI 미완료 — 잠긴 사용자가 이유를 알 수 없음 | HIGH |
| Backend | 계정 잠금 알림 백엔드 로직 미완료 | HIGH |
| Backend | `logout.ts`에서 서버 측 세션 삭제 안 됨 — 쿠키만 제거, DB 세션은 24시간 잔존 `logout.ts` | HIGH |
| Backend | `login.ts` 119줄로 API 100줄 한도 초과 | MEDIUM |
| Playwright | 로그인 성공/실패 E2E 테스트 없음 | HIGH |
| Playwright | 브루트포스 계정 잠금 시나리오 자동화 없음 | HIGH |
| Playwright | User Enumeration(타이밍 공격) 검증 시나리오 없음 | HIGH |

### 비밀번호 재설정
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Frontend | a11y 개선 미완료 | HIGH |
| Backend | **인증 코드(6자리)가 API 응답에 평문 반환** — SMTP 실패 시에도 `devCode` 반환, 회원가입 코드도 동일 `send-code.ts:53,56` | **CRITICAL** |
| Backend | **send-code에 rate limit 없음** — 무제한 코드 발송 + 브루트포스 `send-code.ts` | **CRITICAL** |
| Backend | **register.ts/reset-password.ts에도 rate limit 없음** — 6자리 코드(90만 조합) 브루트포스 가능 | **CRITICAL** |
| Backend | 인증 코드 생성에 `Math.random()` 사용 — 암호학적 PRNG 아님, `crypto.randomInt()` 필요 `email.ts:41` | HIGH |
| Backend | SMTP 프로덕션 전환 미완료 — SPF/DKIM 없음 | HIGH |
| Backend | send-code에 Zod 입력 검증 없음 — 이메일 형식 미검증 `send-code.ts:9` | HIGH |
| Backend | register.ts/reset-password.ts에 try/catch 없음 — 예외 시 스택 트레이스 노출 가능 | MEDIUM |
| Backend | 인증 코드 소진과 계정 생성이 트랜잭션이 아님 — 동시 요청 시 경쟁 조건 `register.ts:31-46` | MEDIUM |
| Playwright | 비밀번호 재설정 전체 플로우 E2E 테스트 없음 | HIGH |
| Playwright | 인증 코드 만료/재발송 시나리오 E2E 테스트 없음 | HIGH |

### 관리자 새 계정
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Frontend | 별도 전용 페이지 없음 — /admin/dashboard에 통합 운영 | MEDIUM |
| Backend | `admins.email` UNIQUE 제약 없음 — 동시 요청 시 이메일 중복 가능 | HIGH |
| Backend | 사용자 삭제 시 트랜잭션 없음 — 세션 삭제 후 계정 삭제 실패 시 불일치 `users.ts:87-89` | HIGH |
| Backend | `users.ts`에 Zod 입력 검증 없음 | HIGH |
| Backend | `users.ts` POST/PUT에 role 값 검증 없음 — 임의 문자열("superadmin" 등) 허용 `users.ts:54,72` | HIGH |
| Backend | `users.ts` PUT에서 비밀번호 변경 시 `validatePassword()` 미호출 `users.ts:70-72` | HIGH |
| Backend | `users.ts` PUT에서 비밀번호 변경 시 기존 세션 미삭제 `users.ts:72` | MEDIUM |
| Backend | `register.ts`에서 `email.split('@')[0]`으로 username 생성 — `@` 앞 동일 시 가입 불가 `register.ts:34` | MEDIUM |
| Playwright | 계정 생성 플로우 E2E 테스트 없음 | HIGH |
| Playwright | 권한별 접근 제어 시나리오 자동화 없음 | HIGH |

### 관리자 대시보드
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Frontend | CSV 다운로드 기능 미완료 — 코드 자체 없음 | HIGH |
| Frontend | 관리자 add/삭제 버튼이 수동 테스트만 확인됨 | MEDIUM |
| Backend | **CMS 페이지 API(`/api/pages/[page].ts` PUT)에 admin role 체크 없음** — 미들웨어 가드 경로 밖, person/customer도 콘텐츠 변조 가능 `pages/[page].ts:40-42` | **CRITICAL** |
| Backend | **i18n API에 admin role 체크 없음** — 일반 사용자도 번역 파일 덮어쓰기 가능 `update.ts:24-27`, `translate-save.ts:62-65` | **CRITICAL** |
| Backend | **i18n `setNestedValue()`에 Prototype Pollution** — `__proto__`/`constructor` 키 미필터링, `Object.prototype` 오염 `update.ts:10-19`, `translate-save.ts:11-21` | **CRITICAL** |
| Backend | 이미지 업로드 API에 admin role 체크 없음 `upload.ts:8-11` | HIGH |
| Backend | 이미지 업로드 API에 magic-byte 검증 없음 — `file.type`만 확인 `upload.ts:23-26` | HIGH |
| Backend | SQLite 장애 시 미들웨어 admin 경로에서 크래시 — try/catch 없음 `middleware.ts:47-51` | HIGH |
| Backend | `pages/[page].ts` PUT에 JSON 스키마·크기 검증 없음 `pages/[page].ts:45-46` | HIGH |
| Backend | `dashboard.astro`에서 `avatar_url`이 `esc()` 없이 삽입 — XSS 가능 `dashboard.astro:280` | HIGH |
| Backend | `dashboard.astro` `data-edit-user` JSON이 single-quote 내 미이스케이프 — 속성 주입 `dashboard.astro:276` | MEDIUM |
| Backend | `ChatWidget.astro`에서 source title이 innerHTML로 삽입 — Stored XSS `ChatWidget.astro:924-926` | HIGH |
| Backend | 계정 잠금 알림 백엔드 로직 미완료 | HIGH |
| Backend | admin API 통합 테스트 전무 | HIGH |
| Backend | CI/CD 파이프라인 없음 | HIGH |
| Backend | `embeddings.ts`에 fetch timeout 없음 — Ollama 행 시 RAG 무한 블로킹 `embeddings.ts:5` | HIGH |
| Backend | `/api/health`가 SQLite·Qdrant 미확인 `health.ts` | MEDIUM |
| Backend | `chatbot-guard.ts` 234줄로 lib 200줄 한도 초과 | MEDIUM |
| Backend | `email.ts`에 `.env` 수동 파서 — Astro 환경변수와 충돌 가능 `email.ts:6-17` | MEDIUM |
| Backend | Husky pre-commit 훅 파일 없음 | MEDIUM |
| Backend | 15개 API가 lib/ 무시하고 inline SQL 직접 실행 — 아키텍처 위반 | MEDIUM |
| Backend | `access-request.ts`에 rate limit 없음 | MEDIUM |
| Database | DB 인덱스 0개 — 대시보드 조회 성능 저하 | CRITICAL |
| Playwright | 로그 뷰어 refresh/clear E2E 없음 | HIGH |
| Playwright | CSV 다운로드 E2E 미구성 (기능 미완료) | HIGH |
| Playwright | RBAC 대시보드 접근 제어 시나리오 없음 | HIGH |
| Playwright | 관리자 add/삭제 자동화 테스트 없음 | HIGH |

### 설문조사 (Survey)
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Backend | FastAPI 설문 시스템은 이 프로젝트 범위 밖 | MEDIUM |
| Playwright | 설문 제출 플로우 E2E 테스트 없음 | HIGH |
| Playwright | 응답 데이터 저장 검증 없음 | HIGH |

### 군수·항공
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Frontend | a11y 개선 미완료 | HIGH |
| Backend | 챗봇 RAG 로직 단위 테스트 전무 | HIGH |
| Playwright | 챗봇 군수·항공 응답 정확도 E2E 없음 | HIGH |
| Playwright | 분야별 페이지 렌더링 E2E 없음 | HIGH |

### 철도 (Railway)
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Frontend | a11y 개선 미완료 | HIGH |
| Backend | 챗봇 RAG 로직 단위 테스트 전무 | HIGH |
| Playwright | 챗봇 철도 도메인 응답 E2E 없음 | HIGH |
| Playwright | 철도 페이지 콘텐츠 E2E 없음 | HIGH |

### 자동화 (Automation)
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Frontend | a11y 개선 미완료 | HIGH |
| Playwright | 자동화 페이지 렌더링 E2E 없음 | HIGH |
| Playwright | CMS 인라인 편집 저장 검증 없음 | HIGH |

### 정보통신
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Frontend | a11y 개선 미완료 | HIGH |
| Backend | 챗봇 RAG 로직 단위 테스트 전무 | HIGH |
| Playwright | 정보통신 페이지 콘텐츠 E2E 없음 | HIGH |

### M&S
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Frontend | a11y 개선 미완료 | HIGH |
| Playwright | M&S 페이지 렌더링 E2E 없음 | HIGH |

### 슈퍼컴퓨팅
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Frontend | a11y 개선 미완료 | HIGH |
| Backend | 챗봇 RAG 로직 단위 테스트 전무 | HIGH |
| Playwright | 슈퍼컴퓨팅 페이지 렌더링 E2E 없음 | HIGH |

### 산업용 컴퓨터 (IPC)
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Playwright | IPC 제품 목록 렌더링 E2E 없음 | HIGH |
| Playwright | 이미지 로딩 검증 자동화 없음 | HIGH |

### 레이더 (Radar)
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Frontend | a11y 개선 미완료 | HIGH |
| Backend | 챗봇 RAG 로직 단위 테스트 전무 | HIGH |
| Playwright | 레이더 페이지 콘텐츠 E2E 없음 | HIGH |

### 인터커넥트 (Interconnect)
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Frontend | a11y 개선 미완료 | HIGH |
| Playwright | 인터커넥트 페이지 렌더링 E2E 없음 | HIGH |

### 내 정보 (My Page)
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Frontend | 프로필/비밀번호/알림 설정 UI 미완료 | HIGH |
| Frontend | a11y 개선 미완료 | HIGH |
| Backend | 알림 설정 백엔드 로직 미완료 | HIGH |
| Backend | `me.ts` PUT에 XSS 방어 없음 — displayName/phone/bio 미sanitize `me.ts:42-44` | HIGH |
| Backend | `register.ts`에서도 displayName/phone 미sanitize·미길이제한 `register.ts:46` | MEDIUM |
| Backend | `sanitize.ts` 순서 결함 — HTML entity 인코딩 코드가 태그 제거 통과, `javascript:`/`data:` URL 미차단 `sanitize.ts:5-8` | MEDIUM |
| Playwright | 프로필 수정 → 저장 → 반영 E2E 없음 | HIGH |
| Playwright | 아바타 업로드 magic-byte 검증 시나리오 없음 | HIGH |
| Playwright | 권한별 마이페이지 접근 제어 시나리오 없음 | HIGH |

### 챗봇 API (conversations / messages)
| 영역 | 이슈 | 심각도 |
|------|------|--------|
| Backend | **conversations GET 인증 없음** — visitor_id만으로 대화 목록 조회 `conversations.ts:8-16` | **CRITICAL** |
| Backend | **conversations DELETE 인증+소유권 없음** — id만으로 삭제 `conversations.ts:40-47` | **CRITICAL** |
| Backend | messages GET IDOR — 소유권 미검증 `messages.ts:7-22` | HIGH |
| Backend | `pages/api/chat.ts` 110줄로 API 100줄 한도 초과 | MEDIUM |
| Database | conversations/messages 인덱스 0개 | CRITICAL |
| Playwright | 챗봇 RAG 로직 단위 테스트 전무 | HIGH |
| Playwright | admin API 통합 테스트 전무 | HIGH |

---

## CRITICAL 우선순위 조치표

| # | 이슈 | 파일 | 조치 |
|---|------|------|------|
| 1 | i18n Prototype Pollution | `update.ts:10-19`, `translate-save.ts:11-21` | `__proto__`/`constructor`/`prototype` 키 필터링 |
| 2 | CMS/i18n/이미지 API admin role 누락 | `pages/[page].ts`, `i18n/update.ts`, `translate-save.ts`, `images/upload.ts` | `getUserInfo` + `role !== 'admin'` → 403 |
| 3 | 인증 코드 평문 반환 | `send-code.ts:53,56` | `devCode` 삭제, `NODE_ENV` 가드 |
| 4 | 인증 관련 rate limit 부재 | `send-code.ts`, `register.ts`, `reset-password.ts` | `checkRateLimit` 추가 |
| 5 | conversations/messages 무인증 | `conversations.ts`, `messages.ts` | 인증 + 소유권 검증 |
| 6 | DB 인덱스 0개 + 만료 데이터 미정리 | `db.ts` | 인덱스 생성 + 만료 DELETE 스케줄 |

---

## 이전 침투 테스트 결과 (2026-04-13, OWASP ZAP)

### 해결된 항목
| 항목 | 상태 |
|------|------|
| Ollama 11434 외부 노출 (P0 CRITICAL) | **해결** — `OLLAMA_HOST=127.0.0.1:11434` |
| Admin API PII 과다 노출 | **해결** — 마스킹 + 감사 로그 |
| `/api/chat` 500 → 400 | **해결** |
| `X-Content-Type-Options` 누락 | **해결** |
| magic word DB dump 백도어 | **해결** — `sanitizeOutput` 이중 적용 |

### 잘 구현된 방어
- 세션 쿠키: `HttpOnly` + `SameSite=Strict` + `Max-Age=86400`
- Admin API: 미들웨어에서 `/admin/*`, `/api/admin/*` 세션+role 자동 검증
- 감사 로깅: `unauthorized_access_attempt` 기록
- 보안 헤더: `X-Frame-Options: DENY`, `HSTS`, `Permissions-Policy`, `COOP`
- 입력 검증: 채팅 maxlength 1000자 서버 측 강제
- LLM 프롬프트 인젝션 방어: Input 30패턴 차단 + Output 이중 sanitize
- User Enumeration 타이밍 방어: 존재하지 않는 사용자에도 bcrypt 실행 `auth.ts:24`

### ZAP Scan 통계
- 요청: 5,326 / 알림: 348 (High 0, Medium 93, Low 129, Info 369)
- **High/Critical 0** — 웹앱 자체는 OWASP Top 10 자동화 공격 방어 입증

---

## 변경 이력

| 일자 | 내용 |
|------|------|
| 2026-04-13 | 초기 침투 테스트 리포트 (OWASP ZAP) |
| 2026-04-17 | ECC 기반 전면 재감사 (security-reviewer + code-reviewer + architect). CRITICAL 8건, 신규 HIGH 16건 추가. 부정확 5건 수정/삭제 |
