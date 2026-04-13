# AceTec Website v8

## Overview

AceTec (acetronix.co.kr) 한국 B2B 임베디드 컴퓨팅 기업의 회사 홈페이지.
Astro 6 기반 하이브리드(SSG + SSR). 로컬 AI 챗봇(RAG) + Admin CMS 포함.
운영 서버: http://192.168.10.182:8080

## Tech Stack

- **Framework**: Astro 6.1.2 (server mode, Node adapter, standalone)
- **Language**: TypeScript (strict mode)
- **AI Chat**: Ollama local (ministral-3:14b chat, nomic-embed-text-v2-moe embeddings)
- **Vector DB**: Qdrant (localhost:6333, collection: acetec_knowledge)
- **Admin Auth**: better-sqlite3 + bcryptjs (data/acetec.db)
- **Admin CMS**: Inline editing + JSON content files (src/content/pages/)
- **Contact DB**: Optional Supabase (graceful fallback if not configured)
- **Image Processing**: sharp (WebP 변환, preset별 크기 조정)
- **Email**: nodemailer (SMTP, 개발 시 콘솔 출력 fallback)
- **Styling**: Vanilla CSS + design tokens (src/styles/tokens.css)
- **Testing**: Vitest 4.1.2 (unit/integration/system), Playwright 1.59.1 (a11y)
- **Runtime**: Node.js >= 22.12.0

## Commands

```bash
npm run dev          # Dev server (localhost:4321)
npm run build        # Production build → ./dist/
npm run preview      # Preview production build
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier format
npm run format:check # Prettier check
npm run test         # Vitest (unit + integration + system)
npm run test:watch   # Vitest watch mode
npm run test:a11y    # Playwright 접근성 테스트
npm run ingest       # RAG 지식베이스 빌드 (Ollama → Qdrant)
```

## Architecture

### Rendering Strategy (Hybrid SSG + SSR)
- **SSG** (prerender=true): 404.astro만
- **SSR** (prerender=false): 나머지 모든 페이지 + API + admin
- **Server mode**: `output: 'server'` + `@astrojs/node` standalone

### Layer Architecture (3-Tier)
```
[Browser] → [.astro Pages] → [/api/* Endpoints] → [src/lib/ Modules] → [SQLite/Qdrant/Supabase]
```
- Pages(.astro) → client-side fetch로 API 호출
- API(.ts) → lib/ 모듈 import (DB 직접 접근 금지)
- lib/ → 외부 서비스 (DB, Ollama, Qdrant, SMTP)

### Dependency Graph (DAG, 순환 없음)
```
chat.ts → rag.ts → embeddings.ts
                 → vector-store.ts
auth.ts → db.ts
sanitize.ts    (독립, 순수 함수)
rate-limiter.ts (독립, 순수 함수)
email.ts       (독립, nodemailer)
image.ts       (독립, sharp)
supabase.ts    (독립, 선택적)
```

### RAG Pipeline
Content JSON → chunk → Ollama nomic-embed-text-v2-moe → Qdrant → cosine similarity → Ollama ministral-3:14b

### Auth/AuthZ (RBAC)
- 역할: admin (전체 접근), person/customer (승인 후 접근)
- 세션: UUID + SQLite + HttpOnly/SameSite=Lax 쿠키
- 접근 제어: access_requests 테이블, hasDetailAccess() 함수

## Project Structure

```
src/
├── components/       # Astro 컴포넌트 (PascalCase)
│   ├── Header.astro, Footer.astro, MobileMenu.astro
│   ├── ChatWidget.astro     # AI 챗봇 (floating pill + panel)
│   ├── AdminInline.astro    # CMS 인라인 편집
│   ├── AdminBar.astro       # 관리자 도구바
│   ├── ContactForm.astro    # 문의 폼
│   ├── ProductGrid.astro    # 제품 카드 그리드
│   ├── LangSwitcher.astro   # 다국어 전환
│   └── HistoryYearGroup.astro
├── content/
│   ├── products/     # 제품 JSON (military, railway, industrial, telecom, sensor, hpc)
│   ├── pages/        # CMS 페이지 JSON (home, about, solutions, contact, footer, ...)
│   └── history/      # 연혁 JSON (timeline.json)
├── layouts/
│   └── Base.astro    # 마스터 레이아웃 (Header + Footer + ChatWidget + slot)
├── lib/              # 비즈니스 로직 (max 200줄/파일)
│   ├── auth.ts       # 세션/비밀번호/RBAC (→ db.ts만 의존)
│   ├── db.ts         # better-sqlite3 (인프라 최하단, 의존 없음)
│   ├── chat.ts       # Ollama 챗 (→ rag.ts)
│   ├── rag.ts        # RAG 검색 (→ embeddings.ts, vector-store.ts)
│   ├── vector-store.ts  # Qdrant + cosineSimilarity
│   ├── embeddings.ts    # Ollama 임베딩
│   ├── rate-limiter.ts  # IP 기반 Rate Limit (순수 함수)
│   ├── sanitize.ts      # HTML strip + escape (순수 함수)
│   ├── image.ts         # sharp 이미지 처리
│   ├── email.ts         # nodemailer + 인증 코드
│   └── supabase.ts      # 선택적 Supabase 클라이언트
├── pages/
│   ├── api/          # SSR API 엔드포인트 (max 100줄/파일)
│   │   ├── chat.ts, contact.ts, health.ts
│   │   ├── conversations.ts, messages.ts
│   │   ├── access-request.ts
│   │   ├── auth/     # login, logout, register, send-code, reset-password, me, avatar
│   │   ├── admin/    # users, logs, stats, access-requests
│   │   ├── pages/    # [page].ts (CMS CRUD)
│   │   ├── images/   # upload.ts
│   │   └── i18n/     # update.ts
│   ├── admin/        # dashboard.astro (SSR, 인증 보호)
│   ├── products/     # [category].astro (동적 라우트)
│   └── *.astro       # 마케팅 페이지들 (SSR)
├── styles/
│   ├── tokens.css    # 디자인 토큰 (CSS 변수, single source of truth)
│   ├── global.css    # 기본 스타일, 유틸리티
│   └── fonts.css     # Self-hosted Roboto woff2
└── middleware.ts     # 방문자 로그 + 보안 헤더 (CSP, HSTS, X-Frame-Options)

data/                 # 런타임 데이터 (gitignored)
├── acetec.db         # SQLite DB (admins, sessions, audit_logs, ...)
└── vector-store.json # (레거시, Qdrant로 이전)

tests/                # 테스트 (Vitest)
├── unit/             # 단위 테스트
├── integration/      # 통합 테스트
├── system/           # 시스템/아키텍처/보안/E2E 테스트
└── a11y/             # 접근성 (Playwright)
```

## Database Schema (SQLite)

8개 테이블: admins, sessions, visitor_logs, audit_logs, verification_codes, access_requests, conversations, messages

- sessions FK → admins
- messages FK → conversations (CASCADE DELETE)
- access_requests FK → admins

## Security

- **비밀번호**: bcrypt hashSync (salt round 10)
- **세션 쿠키**: HttpOnly, SameSite=Lax, Path=/, Max-Age=86400
- **SQL**: 모든 쿼리 파라미터화 (?)
- **XSS**: sanitize.ts (HTML strip + &amp;/&lt;/&gt; escape)
- **입력 검증**: Zod 스키마 (safeParse → 400 응답)
- **Rate Limit**: checkRateLimit (chat: 20/분, contact: 5/분) → 429 응답
- **보안 헤더**: X-Frame-Options: DENY, X-Content-Type-Options: nosniff, CSP, HSTS, Referrer-Policy, Permissions-Policy
- **CMS 파일 접근**: 화이트리스트 기반 (pagesAllowed 배열)

## Conventions

- Korean 주석 유지 (의도적)
- Component Props → TypeScript interface
- CSS 값 → design tokens 참조
- API 에러 → `{ error: "메시지" }` + 적절한 HTTP 상태코드
- 관리자 API → verifySession + getSessionIdFromCookie 패턴
- admin 전용 → getUserInfo + role !== 'admin' → 403
- Graceful degradation: Ollama/Qdrant/Supabase 미실행 시 fallback 메시지

## Testing

```bash
npm run test         # 전체 실행 (unit + integration + system)
```

테스트 구조:
- **단위**: sanitize, rate-limiter, vector-store, Zod 스키마, DB 스키마
- **통합**: Schema + Sanitize + Rate Limiter 크로스 모듈
- **시스템**: 아키텍처 (구조/결합도/응집도/DAG/레이어), 보안 (OWASP)
- **E2E**: http://192.168.10.182:8080 라이브 HTTP 검증
- **콘텐츠**: JSON 완성도, 렌더링 확인

## Known Issues

- 5개 카테고리 제품 데이터 비어있음 (military, railway, telecom, sensor, hpc)
- index.astro 1051줄, ChatWidget.astro 1209줄 → 리팩토링 권고
- Rate Limiter 인메모리 (서버 재시작 시 리셋)
- Ollama URL 하드코딩 (localhost:11434) → 환경변수 이동 필요
- CSP에 unsafe-inline 포함 → nonce 기반 전환 권고
