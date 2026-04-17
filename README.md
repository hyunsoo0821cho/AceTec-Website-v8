# AceTec Website v8

**AceTec** (acetronix.co.kr) — 한국 B2B 임베디드 컴퓨팅 & 산업용 기술 솔루션 기업의 마케팅 웹사이트.
Astro 6 기반 하이브리드(SSG + SSR) 구조. 로컬 AI 챗봇(RAG + Reranker), Admin CMS 인라인 편집, 다국어(8개 언어 완전 번역 + 20개 언어 프레임워크), 회원 관리 시스템 포함.
pm2 status                   # 프로세스 요약
pm2 monit                    # 실시간 CPU/메모리 대시보드
pm2 logs acetec --lines 50   # 최근 로그
pm2 describe acetec          # 상세 (restart 카운트, 재시작 이력 등)
서버 수동 재기동이 필요할 때

pm2 restart acetec           # 무중단(<1초) 재기동
pm2 reload acetec            # graceful (요청 완료 후 재기동)
재부팅 시 자동 시작 (선택)

# 한 번만 실행 — Windows 시작 시 PM2 가 자동 기동
pm2-startup install
pm2 save
---

### 최신 테스트 결과 (2026-04-14)

| 항목 | 결과 |
|------|------|
| Vitest (단위/통합/시스템) | **299/308 PASS** (96.8%) |
| RAG + Reranker Hit@1 | **83.7%** (36/43) |
| RAG + Reranker Hit@5 | **95.3%** (41/43) |
| E2E 챗봇 API | **5/5 PASS** |
| 보안 등급 | **C+** (P0 해결, CRITICAL 8건 잔존 — [SUMMARY.md](SUMMARY.md)) |

> 상세: [test.md](test.md) | 보안: [보안이슈해결보고.md](보안이슈해결보고.md)

---

## 1. 프로젝트 개요

| 항목 | 설명 |
|------|------|
| **회사** | AceTec (에이스텍, acetronix.co.kr) — 1994년 설립, 한국 B2B 임베디드 컴퓨팅 전문 기업 |
| **분야** | 군용/항공우주, 철도 안전, 산업 자동화, 통신/네트워크, 센서 시뮬레이션, HPC, 레이더, IPC, 인터커넥트 |
| **프레임워크** | Astro 6.1.2 (SSG + SSR 하이브리드) |
| **주요 기능** | 마케팅 페이지, AI 챗봇(RAG + Reranker), Admin CMS 인라인 편집, 제품 카탈로그, 회원가입/비밀번호 재설정, 관리자 대시보드, 다국어, 자동 동기화 |
| **도메인** | https://www.acetronix.co.kr |
| **운영 서버** | http://192.168.10.182:8080 |

---

## 2. 실행 방법

### 2-1. 사전 요구사항

| 항목 | 버전 | 필수 |
|------|------|------|
| Node.js | >= 22.12.0 | 필수 |
| npm | >= 10 | 필수 |
| Ollama | 최신 | AI 챗봇용 (선택) |
| Qdrant | 최신 | 벡터 검색용 (선택) |
| Docker | 최신 | Reranker + Qdrant 실행 (선택) |

### 2-2. 의존성 설치

```bash
npm install
```

> Windows에서 `better-sqlite3` 에러 발생 시:
> ```bash
> npm rebuild better-sqlite3
> ```

### 2-3. 개발 서버 실행

```bash
# 기본 (localhost:4321)
npm run dev

# 네트워크 접속 허용 + 포트 지정
npx astro dev --host 0.0.0.0 --port 8080
```


또는 `/register` 페이지에서 이메일 인증 후 직접 회원가입 가능.

### 2-5. AI 챗봇 설정 (선택)

```bash
# 1) Ollama 설치 후 모델 다운로드
ollama pull ministral-3:14b          # 채팅 모델
ollama pull nomic-embed-text-v2-moe  # 임베딩 모델

# 2) Qdrant 벡터 DB 실행
docker run -d --name qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant

# 3) Jina Reranker 서버 실행
docker run -d --name jina-reranker -p 8787:7997 \
  michaelf34/infinity:latest \
  v2 --model-id jinaai/jina-reranker-v2-base-multilingual --port 7997

# 4) RAG 지식베이스 구축
npm run ingest
```

### 2-6. 프로덕션 빌드 & 배포

```bash
npm run build        # ./dist/ 에 빌드
npm run preview      # 빌드 결과 미리보기
npm run deploy       # build → kill → restart 원샷 배포

# Docker 배포
docker build -t acetec-web .
docker run -p 4321:4321 acetec-web
```

---

## 3. 전체 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 (localhost:4321, HMR) |
| `npm run build` | 프로덕션 빌드 (./dist/) |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run deploy` | build → kill → restart 원샷 배포 |
| `npm run lint` | ESLint 코드 검사 |
| `npm run lint:fix` | ESLint 자동 수정 |
| `npm run format` | Prettier 코드 포맷팅 |
| `npm run format:check` | Prettier 검사만 |
| `npm run test` | Vitest 단위/통합/시스템 테스트 |
| `npm run test:watch` | Vitest watch 모드 |
| `npm run test:a11y` | Playwright 접근성 테스트 |
| `npm run ingest` | RAG 임베딩 지식베이스 구축 (Ollama → Qdrant) |
| `npm run sync` | 자동 동기화 (파일 변경 감지 → Git 커밋 & 푸시) |

---

## 4. 프로젝트 파일 구조

```
AceTec-Website-v8/
├── astro.config.mjs          # Astro 설정 (서버모드, Node 어댑터)
├── tsconfig.json              # TypeScript 설정
├── package.json               # 의존성 & 스크립트
├── Dockerfile                 # Docker 빌드 (Node 22 Alpine)
├── .env                       # 환경변수 (SMTP, Reranker — gitignore)
│
├── data/                      # 런타임 데이터 (gitignore)
│   ├── acetec.db              # SQLite DB (8개 테이블)
│   └── vector-store.json      # (레거시) 로컬 JSON 벡터 저장소
│
├── public/                    # 정적 파일
│   ├── fonts/                 # Self-hosted Roboto woff2
│   ├── images/                # 정적 이미지
│   └── uploads/               # Admin 업로드 이미지
│
├── scripts/
│   ├── ingest-embeddings.ts   # RAG 지식베이스 빌더
│   ├── reranker-accuracy-test.mjs  # Reranker 정확도 테스트 (43개 쿼리)
│   ├── deploy.mjs             # 자동 배포
│   ├── auto-sync.mjs          # 자동 Git 커밋 & 푸시
│   └── chatbot-test.mjs       # 챗봇 기능/보안 테스트
│
├── tests/
│   ├── unit/                  # Vitest 단위 테스트
│   ├── integration/           # Vitest 통합 테스트
│   ├── system/                # Vitest 시스템/아키텍처/보안 테스트
│   └── a11y/                  # Playwright 접근성 테스트
│
└── src/                       # 소스 코드
    ├── components/            # Astro 컴포넌트 (PascalCase)
    ├── content/               # JSON 콘텐츠 데이터
    ├── layouts/               # 마스터 레이아웃
    ├── lib/                   # 비즈니스 로직
    ├── pages/                 # 라우팅 + API
    ├── styles/                # 디자인 시스템
    ├── i18n/                  # 다국어 (7개 완전 번역)
    └── middleware.ts           # 방문자 로그 + 보안 헤더
```

---

## 5. 주요 컴포넌트

### src/layouts/

| 파일 | 기능 |
|------|------|
| `Base.astro` | 마스터 레이아웃 — 모든 페이지의 공통 구조 (head, header, footer, chat widget, 모바일 메뉴) |

### src/components/

| 파일 | 기능 |
|------|------|
| `Header.astro` | 고정 네비게이션 바 — 이미지 로고, Products 메가 메뉴(hover dropdown), 언어 전환기, 햄버거 메뉴 |
| `MobileMenu.astro` | 모바일 전체화면 메뉴 (768px 이하), 포커스 트랩 |
| `Footer.astro` | 사이트 푸터 — 회사 소개, 링크, 연락처, Admin 인라인 편집 지원 |
| `ChatWidget.astro` | AI 챗봇 위젯 — floating pill 버튼 → 채팅 패널, Gemini 스타일 사이드바, 문의 플로우, 네비게이션 확인 카드 |
| `ContactForm.astro` | 문의 폼 — 이름/이메일/전화/메시지, Zod 검증 |
| `ProductGrid.astro` | 제품 카드 그리드 — Admin CMS 전체 기능 (섹션/제품 추가/삭제, 인라인 편집, 이미지 Replace) |
| `AdminInline.astro` | Admin CMS 인라인 편집 오버레이 — data-edit(텍스트), data-img(이미지), data-admin-add/delete(배열), i18n 자동 동기화 |
| `AdminBar.astro` | Admin 상단 고정 바 — Save 버튼, Dashboard 링크, Logout |
| `LangSwitcher.astro` | 언어 전환 드롭다운 — 20개 언어, localStorage 저장, RTL(아랍어) 지원 |
| `BackToTop.astro` | 맨 위로 스크롤 버튼 — 스크롤 500px 이상 시 표시 |
| `HistoryYearGroup.astro` | 연혁 페이지 연도별 그룹 타임라인 |

### src/pages/ (라우팅)

| URL | 파일 | 기능 |
|-----|------|------|
| `/` | `index.astro` | 홈 — Hero, Solutions, Featured Products, Partners, Contact |
| `/solutions` | `solutions.astro` | 10개 솔루션 카드 + 서브카테고리, Admin 인라인 편집 |
| `/applications` | `applications.astro` | 응용 분야 — Accordion 챕터, FAQ |
| `/about` | `about.astro` | 회사 소개 — CEO 인사말, 경영이념, 기업문화 |
| `/history` | `history.astro` | 회사 연혁 타임라인 |
| `/contact` | `contact.astro` | 문의 페이지 — ContactForm, 본사/포항지사 정보 |
| `/catalog` | `catalog.astro` | 전체 제품 카탈로그 (16개 카테고리, 95+ 제품) |
| `/products/:category` | `products/[category].astro` | 카테고리별 제품 (military, railway, industrial, telecom, sensor, hpc, ipc, radar, interconnect) |
| `/login` | `login.astro` | 로그인 (Admin + 일반 사용자) |
| `/account` | `account.astro` | 내 계정 — 프로필 보기/수정, 로그아웃 |
| `/register` | `register.astro` | 회원가입 (역할 선택 → 이메일 인증 → 계정 생성) |
| `/forgot-password` | `forgot-password.astro` | 비밀번호 재설정 (이메일 인증 → 새 비밀번호) |
| `/admin/dashboard` | `admin/dashboard.astro` | 관리자 대시보드 — 통계, 사용자 관리, 감사 로그 |
| `404` | `404.astro` | 404 에러 페이지 (SSG) |

### src/pages/api/ (REST API)

| 메서드 | URL | 기능 |
|--------|-----|------|
| POST | `/api/auth/login` | 로그인 — bcrypt 검증 → 세션 쿠키, 5회 실패 → 30분 잠금 |
| POST | `/api/auth/logout` | 로그아웃 — 세션 삭제, 쿠키 만료 |
| POST | `/api/auth/send-code` | 인증 코드 발송 — 6자리, 10분 유효 |
| POST | `/api/auth/register` | 회원가입 — 인증 코드 확인 → 계정 생성 |
| POST | `/api/auth/reset-password` | 비밀번호 재설정 — 인증 코드 → 비밀번호 변경 |
| GET/PUT | `/api/auth/me` | 내 정보 조회/수정 (프로필) |
| POST | `/api/auth/avatar` | 프로필 아바타 이미지 업로드 |
| POST | `/api/chat` | AI 챗봇 — RAG 검색(Qdrant) → Reranker → Ollama 생성 |
| POST | `/api/contact` | 문의 폼 제출 — Zod 검증 → Supabase 저장 (선택) |
| GET | `/api/health` | 서버 상태 — DB, AI(Ollama) 연결 체크 |
| POST | `/api/images/upload` | 이미지 업로드 — sharp 리사이즈 + WebP 변환 |
| GET/PUT | `/api/pages/:page` | CMS 페이지 콘텐츠 읽기/수정 |
| POST | `/api/i18n/update` | i18n 번역 파일 업데이트 |
| GET/POST | `/api/conversations` | 채팅 대화 관리 |
| GET | `/api/messages` | 채팅 메시지 조회 |
| GET | `/api/admin/stats` | 관리자 통계 — 방문자, 페이지뷰, 감사 로그 |
| GET/POST/PUT/DELETE | `/api/admin/users` | 사용자 CRUD — PII 마스킹, 감사 로그 |
| GET | `/api/admin/logs` | 감사 로그 조회 |
| POST | `/api/admin/create-solution` | 솔루션 카드 생성 |
| POST | `/api/access-request` | 제품 설명 열람 권한 요청 |
| GET/POST | `/api/admin/access-requests` | 열람 권한 요청 관리 (승인/거절) |

### src/lib/ (비즈니스 로직)

| 파일 | 기능 |
|------|------|
| `auth.ts` | 인증 — bcrypt, UUID 세션, HttpOnly 쿠키, RBAC, 로그인 잠금 |
| `db.ts` | SQLite — better-sqlite3, 8개 테이블 자동 생성, WAL 모드 |
| `chat.ts` | Ollama 채팅 — ministral-3:14b, RAG 컨텍스트, 네비게이션 감지, 가드레일 |
| `rag.ts` | RAG 오케스트레이터 — 임베딩 → Qdrant top-20 → Reranker top-5 |
| `reranker.ts` | Jina Reranker v2 — Infinity 서버 연동, graceful fallback |
| `embeddings.ts` | Ollama 임베딩 — nomic-embed-text-v2-moe, 768차원 |
| `vector-store.ts` | Qdrant — acetec_knowledge 컬렉션, Cosine 유사도 |
| `chatbot-guard.ts` | 챗봇 보안 — Input 13패턴 차단, Output 마스킹, 스코프 제한 |
| `pii-mask.ts` | PII 마스킹 — 이메일/전화번호 자동 마스킹, 감사 로그 |
| `password-policy.ts` | 비밀번호 정책 — 8자+, 영문+숫자+특수문자 |
| `image.ts` | 이미지 처리 — sharp, WebP 변환, preset별 리사이즈 |
| `email.ts` | 이메일 — nodemailer SMTP, 인증 코드, HTML 템플릿 |
| `rate-limiter.ts` | IP 기반 속도 제한 — 인메모리 (chat: 20/분, contact: 5/분) |
| `sanitize.ts` | 입력 살균 — HTML 태그 제거, XSS 방지 |
| `supabase.ts` | Supabase 클라이언트 — 연락처 저장 (선택, fallback 지원) |

### src/content/ (콘텐츠 데이터)

| 경로 | 기능 |
|------|------|
| `products/*.json` | 9개 카테고리 제품 데이터 (military, railway, industrial, telecom, sensor, hpc, ipc, radar, interconnect) |
| `pages/*.json` | CMS 페이지 콘텐츠 (home, solutions, about, contact, catalog, footer, megamenu 등) |
| `history/timeline.json` | 회사 연혁 타임라인 |

### src/i18n/ (다국어)

8개 언어 완전 번역 (ko, en, ja, ar, fr, de, es, zh-TW) + 20개 언어 프레임워크.
`ko ↔ en ↔ ja/ar/fr/de/es/zh-TW` 양방향 자동 번역 (Google Translate API, 50개씩 배치 병렬).
RTL(아랍어) 지원, localStorage 저장, 브라우저 언어 자동 감지.

---

## 6. 사용자 화면 기능

### 6-1. 홈페이지 (`/`)

- **Fullscreen Hero**: 전체 화면 히어로 이미지 + 그라디언트 오버레이
- **Solution Cards**: 10개 솔루션 분야 카드
- **Featured Products**: 주요 제품 카드 (이미지, 제품명, 특징)
- **Service Plan / About / Partners**: 서비스 플랜, 회사 소개, 파트너 로고 그리드
- **Contact Form**: 하단 문의 폼

### 6-2. Products 메가 메뉴

Header "Products" hover 시 전체 너비 드롭다운. 11개 카테고리 컬럼, 서브 아이템 링크, Admin 편집 가능.

### 6-3. AI 챗봇

- **Floating Pill 버튼** → 확장형 채팅 패널 (리사이즈 핸들)
- **Gemini 스타일 사이드바**: 대화 히스토리, "New Chat"
- **RAG + Reranker 기반 답변**: Qdrant 벡터 → Jina 리랭킹 → Ollama AI 생성
- **네비게이션 확인 카드**: `[NAVIGATE:]` 태그 파싱 → "이동할까요?" 버튼
- **문의 플로우**: 단계별 정보 수집 → 요약 카드 → mailto/contact 리다이렉트
- **한국어 IME 처리**: compositionstart/end로 한글 입력 중 Enter 방지
- **대화 영속성**: SQLite + localStorage 병행

### 6-4. 언어 전환기

다크 pill 스타일 (`🌐 KO`), 20개 언어, localStorage 저장, 브라우저 언어 자동 감지, RTL 지원.

---

## 7. 관리자 기능

### 7-1. 인라인 편집 (AdminInline)

| 속성 | 기능 |
|------|------|
| `data-edit="path.to.field"` | 텍스트 인라인 편집 (contentEditable) |
| `data-img="path.to.imageField"` | 이미지 교체 (hover 시 📷 Replace 배지) |
| `data-admin-add/delete` | 배열 항목 추가/삭제 |
| `data-edit-page="pageName"` | 다중 페이지 JSON 편집 |
| `data-i18n="key"` | Save 시 ko.json 자동 동기화 |

### 7-2. 관리자 대시보드 (`/admin/dashboard`)

- **방문자 통계**: 일간/월간/연간 고유 IP, 페이지뷰
- **열람 권한 요청 관리**: 대기 요청 수 배지, 승인/거절 (person → customer)
- **사용자 관리**: CRUD, 역할별 배지 (Admin/Sales/Customer/Person)
- **감사 로그**: 최근 30건 활동 기록

### 7-3. 역할(RBAC) 및 권한

| 역할 | 제품 설명 열람 | 인라인 편집 | 대시보드 |
|------|--------------|-----------|---------|
| `admin` | 전체 보기 + 편집 | O | O |
| `sales` | 전체 보기 | X | X |
| `customer` | 전체 보기 | X | X |
| `person` | 잠금 (요청 필요) | X | X |

### 7-4. 이미지 업로드

Admin이 이미지 hover → 📷 Replace → 파일 선택 → sharp 리사이즈 + WebP 변환 → 3곳 저장 (public/uploads, dist/client/uploads, 이미지/ 백업).

| Preset | 크기 | 용도 |
|--------|------|------|
| hero | 1400 × 600 | 히어로 배너 |
| service | 800 × 600 | 서비스 섹션 |
| product | 800 × 600 | 제품 카드 |
| plan | 1792 × 1024 | 서비스 플랜 |
| partner | 400 × 400 | 파트너 로고 |
| about | 800 × 650 | 회사 소개 |
| misc | 1400 × 600 | 기타 |

---

## 8. 챗봇 AI 시스템

### 8-1. AI 모델 구성

| 용도 | 모델 | 엔진 |
|------|------|------|
| 채팅 생성 | ministral-3:14b | Ollama (localhost:11434) |
| 텍스트 임베딩 | nomic-embed-text-v2-moe | Ollama (localhost:11434) |
| 벡터 저장/검색 | — | Qdrant (localhost:6333) |
| 리랭킹 | jinaai/jina-reranker-v2-base-multilingual | Infinity (localhost:8787) |

### 8-2. RAG 파이프라인

```
[Content JSON 파일들]
       │
       ▼
[scripts/ingest-embeddings.ts]  ← npm run ingest
       │
       ├── 제품 JSON 파싱 (9개 카테고리)
       ├── 페이지 JSON 파싱 (home, solutions, about 등)
       ├── 텍스트 청크 분할
       │
       ▼
[Ollama nomic-embed-text-v2-moe]
       │
       ├── 각 청크 → 768차원 벡터 변환
       │
       ▼
[Qdrant acetec_knowledge 컬렉션]
       │
       └── 벡터 + 메타데이터(title, content, category) 저장
           현재 131개 문서, 10개 카테고리
```

### 8-3. 채팅 응답 생성 흐름 (2-Stage Retrieval)

```
[사용자 메시지 입력]
       │
       ▼
[POST /api/chat]
       │
       ├── 1. Input Guardrail (13패턴 차단: SQL, 프롬프트 인젝션, jailbreak 등)
       ├── 2. 메시지 임베딩 생성 (nomic-embed-text-v2-moe)
       ├── 3. Qdrant 1차 검색 (top 20, cosine similarity ≥ 0.15) ← 넓은 후보군
       ├── 4. Jina Reranker 2차 선별 (top 5, relevance scoring)
       │      └── 서버 미가동 시 Qdrant 벡터 순서 유지 (graceful fallback)
       ├── 5. 관련 문서 컨텍스트 구성
       ├── 6. 시스템 프롬프트 + 컨텍스트 + 대화 히스토리(최근 6턴) + 사용자 메시지
       │
       ▼
[Ollama ministral-3:14b]
       │
       ├── temperature: 0.3, max tokens: 800, context: 4096
       ├── 2.5분 타임아웃
       │
       ▼
[후처리]
       │
       ├── 7. 네비게이션 태그 감지 ([NAVIGATE:path])
       │      └── LLM 누락 시 결정론적 fallback (13개 경로 정규식)
       ├── 8. Output Guardrail (bcrypt 해시, UUID, 내부 IP, 테이블명 마스킹)
       │
       ▼
[AI 응답 + 참조 소스 목록] → JSON 반환
```

### 8-4. 챗봇 보안 가드레일 (5종)

| 레이어 | 내용 |
|--------|------|
| Ingest 화이트리스트 | Qdrant payload에 `title/content/category/type`만 저장 |
| Input Guardrail | 13개 패턴 차단 — 자격증명, SQL, 프롬프트 인젝션, jailbreak, DAN mode |
| Output Guardrail | bcrypt 해시 / UUID / 내부 IP / 테이블명 자동 마스킹 |
| 스코프 제한 | 시스템 프롬프트 — 제품명/분야/회사소개만 허용 |
| Error 마스킹 | Zod 상세 / Ollama 힌트 비노출, 일반 메시지만 반환 |

---

## 9. DB 스키마

SQLite: `data/acetec.db` (better-sqlite3, WAL 모드, 8개 테이블)

### admins (사용자 계정)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER PK | 사용자 ID |
| `username` | TEXT UNIQUE | 로그인 아이디 |
| `password_hash` | TEXT | bcrypt 해시 |
| `role` | TEXT DEFAULT 'admin' | 역할 (admin/sales/customer/person) |
| `display_name` | TEXT | 표시 이름 |
| `email` | TEXT | 이메일 |
| `phone` | TEXT | 전화번호 |
| `bio` | TEXT | 자기소개 |
| `avatar_url` | TEXT | 프로필 이미지 |
| `failed_attempts` | INTEGER DEFAULT 0 | 로그인 실패 횟수 |
| `lock_until` | INTEGER | 잠금 해제 시간 (5회 실패 → 30분) |

### sessions

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | TEXT PK | UUID 세션 ID (HttpOnly 쿠키) |
| `admin_id` | INTEGER FK → admins | 사용자 참조 |
| `expires_at` | INTEGER | 만료 시간 (24시간) |

### verification_codes

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER PK | 코드 ID |
| `email` | TEXT | 수신 이메일 |
| `code` | TEXT | 6자리 인증 코드 |
| `purpose` | TEXT | 용도 (register / reset) |
| `expires_at` | INTEGER | 만료 시간 (10분) |
| `used` | INTEGER DEFAULT 0 | 사용 여부 |

### visitor_logs / audit_logs / access_requests / conversations / messages

- **visitor_logs**: IP, 경로, User-Agent, 타임스탬프
- **audit_logs**: admin_id, action, detail, 타임스탬프 — `login_failed`, `login_locked`, `unauthorized_access_attempt`, `csrf_blocked`, `pii_unmask_read/list`, `user_create/update/delete`, `access_approve/reject` 등
- **access_requests**: user_id FK → admins, status (pending/approved/rejected)
- **conversations**: visitor_id, title, timestamps
- **messages**: conversation_id FK → conversations (CASCADE DELETE), role (user/assistant), content, sources

---

## 10. 보안

### 10-1. 현황 (2026-04-17, ECC 재감사)

| 영역 | 등급 | 핵심 |
|------|------|------|
| 웹앱 (포트 8080) | **B-** | CRITICAL 8건 잔존 (인증 우회, Prototype Pollution, 코드 노출) |
| LLM 백엔드 (Ollama 11434) | **A** | localhost 바인딩, 외부 차단 |
| PII 데이터 보호 | **B+** | 기본 마스킹 + 언마스킹 감사 로그 |
| 챗봇 보안 | **A** | Input 30패턴 차단 + Output 이중 sanitize (lib + API) |
| DB/인프라 | **C** | 인덱스 0개, cleanup 없음, backup 없음, busy_timeout 미설정 |
| **종합** | **C+** | P0 해결 후에도 CRITICAL 8건 잔존. 상세: [SUMMARY.md](SUMMARY.md) |

### 10-2. 미해결 CRITICAL 이슈 (6건, 즉시 조치 필요)

| # | 이슈 | 파일 | 영향 |
|---|------|------|------|
| 1 | i18n `setNestedValue()` Prototype Pollution | `update.ts`, `translate-save.ts` | `__proto__` 키로 전체 Node 프로세스 Object.prototype 오염 |
| 2 | CMS/i18n/이미지 API에 admin role 체크 없음 | `pages/[page].ts`, `i18n/update.ts`, `images/upload.ts` | 일반 사용자(person/customer)가 사이트 콘텐츠·번역·이미지 변조 |
| 3 | 인증 코드가 API 응답에 평문 반환 | `send-code.ts:53,56` | SMTP 실패 시 누구든 코드 획득 → 계정 탈취 |
| 4 | 인증 관련 엔드포인트 rate limit 부재 | `send-code.ts`, `register.ts`, `reset-password.ts` | 이메일 폭탄 + 6자리 코드 브루트포스 |
| 5 | conversations/messages API 무인증 | `conversations.ts`, `messages.ts` | 타인 대화 열람·삭제 |
| 6 | DB 인덱스 0개 + 만료 데이터 미정리 | `db.ts` | 데이터 증가 시 서비스 성능 급감 + DB 무한 증가 |

### 10-3. 펜테스트 대응 (해결 완료)

| 우선순위 | 항목 | 상태 |
|----------|------|------|
| **P0** | Ollama 11434 외부 노출 | **해결** — `OLLAMA_HOST=127.0.0.1:11434` |
| **P1** | Admin API PII 과다 노출 | **해결** — 마스킹 + 감사 로그 |
| **P2** | CSP `unsafe-inline` | 부분 완화 — 4개 디렉티브 추가 |
| **P2** | CSRF 토큰 부재 | 부분 완화 — `SameSite=Strict` + Origin 화이트리스트 |
| **P3** | `/api/chat` 500 → 400 | **해결** |
| **P3** | `X-Content-Type-Options` 누락 | **해결** |
| **P6** | magic word DB dump 백도어 | **해결** — `sanitizeOutput` lib + API 이중 적용 |

### 10-4. 보안 헤더 (middleware.ts)

| 헤더 | 값 | 비고 |
|------|-----|------|
| X-Frame-Options | DENY | Clickjacking 차단 |
| X-Content-Type-Options | nosniff | MIME 스니핑 차단 |
| Referrer-Policy | strict-origin-when-cross-origin | 리퍼러 제한 |
| Permissions-Policy | camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=() | 브라우저 권한 제한 |
| Cross-Origin-Opener-Policy | same-origin | Spectre 탭 간 DOM 접근 차단 |
| Strict-Transport-Security | max-age=31536000; includeSubDomains | HSTS |
| Content-Security-Policy | 11개 디렉티브 (아래 참조) | XSS/Clickjacking 방어 |
| 에러 스택 트레이스 | try/catch로 next() 감싸기 | 내부 정보 노출 차단 |

### 10-5. 인증/세션

- **비밀번호**: bcrypt hashSync (salt round 10), 정책: 8자+ 영문+숫자+특수문자
- **세션 쿠키**: HttpOnly, SameSite=Strict, Secure(env 제어), 24시간 TTL
- **로그인 잠금**: 5회 실패 → 30분 잠금 (DB `failed_attempts`/`lock_until`)
- **RBAC**: 미들웨어에서 `/admin/*`, `/api/admin/*` 세션+role 자동 검증

### 10-6. CSP (Content Security Policy)

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; connect-src 'self' http://localhost:11434 https://translate.googleapis.com;
font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

### 10-7. 챗봇 보안 (이중 방어)

| 레이어 | 위치 | 내용 |
|--------|------|------|
| Input Guardrail | `src/lib/chatbot-guard.ts` | 30개 패턴 차단 (자격증명, SQL, 프롬프트 인젝션, jailbreak, 스펙 요청) |
| Output Sanitize (1차) | `src/lib/chat.ts:187` | LLM 응답에서 bcrypt/UUID/내부IP/테이블명 마스킹 + 스펙 누출 차단 |
| Output Sanitize (2차) | `src/pages/api/chat.ts:61` | API 최종 응답에서 한번 더 sanitizeOutput 적용 (defense-in-depth) |
| 스코프 제한 | 시스템 프롬프트 | 제품명/분야/회사소개만 허용 |
| Ingest 화이트리스트 | `scripts/ingest-embeddings.ts` | Qdrant payload에 title/content/category/type만 저장 |

> 상세 보안 조치 내역: [보안이슈해결보고.md](보안이슈해결보고.md) 참조

---

## 11. 기술 스택

| 항목 | 기술 | 버전/설명 |
|------|------|----------|
| 프레임워크 | Astro | 6.1.2 (SSG + SSR 하이브리드) |
| 언어 | TypeScript | strict 모드 |
| 런타임 | Node.js | >= 22.12.0 |
| 서버 어댑터 | @astrojs/node | standalone 모드 |
| DB | better-sqlite3 | SQLite (WAL 모드, 8개 테이블) |
| AI 채팅 | Ollama | ministral-3:14b |
| AI 임베딩 | Ollama | nomic-embed-text-v2-moe (768차원) |
| 벡터 DB | Qdrant | @qdrant/js-client-rest, Cosine similarity |
| Reranker | Infinity | jinaai/jina-reranker-v2-base-multilingual |
| 이메일 | nodemailer | SMTP (인증 코드 발송) |
| 이미지 처리 | sharp | WebP 변환, preset별 리사이즈 |
| 연락처 DB | Supabase | @supabase/supabase-js (선택, fallback) |
| 인증 | bcryptjs | 비밀번호 해싱 + HttpOnly 세션 쿠키 |
| 입력 검증 | Zod | 4.3.6 |
| 스타일링 | Vanilla CSS | Design Tokens (tokens.css) + 반응형 |
| 다국어 | 클라이언트 i18n | 7개 완전 번역, RTL 지원 |
| 린팅 | ESLint + Prettier | 코드 품질 관리 |
| 테스트 | Vitest + Playwright | 단위/통합/시스템 + 접근성 |
| 배포 | Docker | Node 22 Alpine |

---

## 12. 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `SMTP_HOST` | `smtp.acetec-korea.co.kr` | SMTP 서버 |
| `SMTP_PORT` | `587` | SMTP 포트 |
| `SMTP_USER` | — | SMTP 계정 (미설정 시 콘솔 출력 fallback) |
| `SMTP_PASS` | — | SMTP 비밀번호 |
| `SMTP_FROM` | `noreply@acetec-korea.co.kr` | 발신자 이메일 |
| `RERANKER_URL` | `http://localhost:8787` | Jina Reranker 서버 URL |
| `RERANKER_CANDIDATES` | `20` | 1차 벡터 검색 후보 수 |
| `SUPABASE_URL` | — | Supabase 프로젝트 URL (선택) |
| `SUPABASE_ANON_KEY` | — | Supabase 익명 키 (선택) |
| `SESSION_SECURE` | — | `1` 설정 시 쿠키 Secure 플래그 활성화 (HTTPS 전용) |

---

## 13. 자동 동기화 (Auto-Sync)

```bash
npm run sync
```

`scripts/auto-sync.mjs` — 파일 변경 감지(src/, public/, scripts/) → 30초 디바운스 → `git add` → `git commit -m "auto: YYYY-MM-DD HH:MM (N files)"` → `git push`.
`Ctrl+C` 종료 시 미커밋 변경사항 마지막 동기화 수행.

---

## 14. 도메인 전환 가이드 (향후)

현재 내부 IP(`http://192.168.10.182:8080`) → 공개 도메인(`https://www.acetronix.co.kr`) 이전 시 필요 작업:

### 체크리스트

- [ ] DNS A 레코드 설정
- [ ] SSL 인증서 발급 (Let's Encrypt)
- [ ] Nginx 리버스 프록시 구성 (`/data/` 차단 포함)
- [ ] Node 서버 `127.0.0.1`에만 바인딩
- [ ] `SESSION_SECURE=1` 환경변수 설정
- [ ] CSP에 `upgrade-insecure-requests` 추가

### Nginx 예시

```nginx
server {
    listen 443 ssl http2;
    server_name www.acetronix.co.kr;
    ssl_certificate     /etc/letsencrypt/live/www.acetronix.co.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.acetronix.co.kr/privkey.pem;

    location /data/ { deny all; return 404; }
    location ~ /\.env { deny all; return 404; }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

### 배포 명령

```bash
SESSION_SECURE=1 HOST=127.0.0.1 PORT=8080 node dist/server/entry.mjs
```

---

## 15. Ollama localhost 제한 (운영 서버)

Ollama가 외부에서 접근 불가하도록 127.0.0.1에만 바인딩:

```powershell
# PowerShell (관리자 권한)
[System.Environment]::SetEnvironmentVariable("OLLAMA_HOST", "127.0.0.1:11434", "User")
Stop-Process -Name "ollama" -Force
Start-Process "ollama" -ArgumentList "serve"
```

| 접근 경로 | 결과 |
|-----------|------|
| `localhost:11434` | 200 OK (내부 허용) |
| `192.168.10.182:11434` | Connection refused (외부 차단) |
| 챗봇 `/api/chat` | 정상 동작 (localhost 경유) |

---

## 16. 알려진 이슈 (2026-04-17 ECC 재감사)

### CRITICAL (즉시 조치)

| # | 이슈 | 파일 | 상태 |
|---|------|------|------|
| 1 | i18n `setNestedValue()` Prototype Pollution — `__proto__` 키 미필터링 | `i18n/update.ts`, `translate-save.ts` | 미해결 |
| 2 | CMS/i18n/이미지 API에 admin role 체크 없음 — 일반 사용자가 콘텐츠 변조 가능 | `pages/[page].ts`, `i18n/update.ts`, `images/upload.ts` | 미해결 |
| 3 | 인증 코드가 API 응답에 평문 반환 (`devCode`) | `send-code.ts:53,56` | 미해결 |
| 4 | 인증 관련 3개 엔드포인트에 rate limit 없음 | `send-code.ts`, `register.ts`, `reset-password.ts` | 미해결 |
| 5 | conversations/messages API 무인증 — 타인 대화 열람·삭제 | `conversations.ts`, `messages.ts` | 미해결 |
| 6 | DB 인덱스 0개 + 만료 데이터 cleanup 없음 | `db.ts` | 미해결 |

### HIGH (단기 조치)

| # | 이슈 | 파일 | 상태 |
|---|------|------|------|
| 7 | Ollama URL 하드코딩 4곳 (환경변수 미사용) | `chat.ts`, `embeddings.ts`, `health.ts`, `middleware.ts` | 미해결 |
| 8 | `logout.ts` 서버 측 세션 미삭제 (쿠키만 제거) | `logout.ts` | 미해결 |
| 9 | `users.ts` role 값 검증 없음 + 비밀번호 변경 시 정책 미검증 | `admin/users.ts` | 미해결 |
| 10 | 이미지 업로드 magic-byte 검증 없음 (`file.type`만 확인) | `images/upload.ts` | 미해결 |
| 11 | `dashboard.astro` avatar_url/data-edit-user XSS 취약점 | `dashboard.astro:276,280` | 미해결 |
| 12 | ChatWidget source title innerHTML XSS | `ChatWidget.astro:924-926` | 미해결 |
| 13 | `Math.random()` 인증 코드 — `crypto.randomInt()` 필요 | `email.ts:41` | 미해결 |
| 14 | npm audit: vite 3건 CVE + defu prototype pollution | `package.json` | 미해결 |
| 15 | SQLite 장애 시 미들웨어 admin 경로 크래시 | `middleware.ts:47-51` | 미해결 |
| 16 | `embeddings.ts` fetch timeout 없음 | `embeddings.ts:5` | 미해결 |
| 17 | sessions FK CASCADE 누락 + `PRAGMA busy_timeout` 미설정 | `db.ts` | 미해결 |
| 18 | `admins.email` UNIQUE 제약 없음 | `db.ts` | 미해결 |
| 19 | Dockerfile DB 파일을 이미지에 포함 | `Dockerfile:14` | 미해결 |
| 20 | Supabase 미설정 시 문의 데이터 소실하면서 성공 응답 | `contact.ts:48-57` | 미해결 |
| 21 | 정기 백업 자동화 없음 | — | 미해결 |
| 22 | 6개 카테고리 제품 `items[]` 비어있음 | products JSON | 데이터 입력 필요 |

### MEDIUM (중기 개선)

| # | 이슈 | 상태 |
|---|------|------|
| 23 | CSP `unsafe-inline` 유지 (nonce 전환 시 .astro 전면 개편 필요) | 미해결 |
| 24 | Rate limiter 인메모리 (서버 재시작 시 초기화) | 의도된 동작 |
| 25 | CSRF Origin 체크만 (SameSite=Strict로 완화 중) | 미해결 |
| 26 | `login.ts` 119줄 / `chat.ts` API 110줄 — 100줄 한도 초과 | 미해결 |
| 27 | `chatbot-guard.ts` 234줄 — lib 200줄 한도 초과 | 미해결 |
| 28 | `.env.example` 없음 / `500.astro` 없음 | 미해결 |
| 29 | `email.ts` .env 수동 파서 / console.log 디버그 코드 잔존 | 미해결 |
| 30 | 15개 API가 lib/ 무시하고 inline SQL 직접 실행 | 미해결 |
| 31 | `index.astro` 1051줄 / `ChatWidget.astro` 1280줄 — 800줄 한도 초과 | 미해결 |

---

## 17. 복구 방법

```bash
git clone https://github.com/SungwooJang123/Acetec-Homepage.git
cd Acetec-Homepage
npm install
npm run build
HOST=0.0.0.0 PORT=8080 node dist/server/entry.mjs
```
