# AceTec Website v8

AceTec (acetronix.co.kr) - B2B Embedded Computing & Industrial Technology Solutions 웹사이트.
Astro 6 기반 하이브리드(SSG + SSR) 구조. 로컬 AI 챗봇(RAG), Admin CMS, 다국어(7개 언어 완전 번역 + 20개 언어 프레임워크) 지원.

---

## 코드 실행 순서

### 1단계: 사전 요구사항

| 항목 | 버전 |
|------|------|
| Node.js | >= 22.12.0 |
| npm | >= 10 |
| Ollama (AI 챗봇용, 선택) | 최신 |

### 2단계: 의존성 설치

```bash
npm install
```

> Windows에서 `better-sqlite3` 에러 발생 시:
> ```bash
> npm rebuild better-sqlite3
> ```

### 3단계: 개발 서버 실행

```bash
# 기본 (localhost:4321)
npm run dev

# 네트워크 접속 허용 + 포트 지정
npx astro dev --host 0.0.0.0 --port 8080
```

브라우저에서 `http://localhost:4321` 또는 `http://<본인IP>:8080` 으로 접속.

### 4단계: Admin 계정 생성 (최초 1회)

```bash
node -e "
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'acetec.db'));
db.pragma('journal_mode = WAL');
db.exec('CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL);');
db.exec('CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, admin_id INTEGER NOT NULL, expires_at INTEGER NOT NULL, FOREIGN KEY (admin_id) REFERENCES admins(id));');
const hash = bcrypt.hashSync('acetec2024', 10);
db.prepare('INSERT OR REPLACE INTO admins (id, username, password_hash) VALUES (1, ?, ?)').run('admin', hash);
console.log('Admin account created: admin / acetec2024');
db.close();
"
```

### 5단계: AI 챗봇 설정 (선택)

```bash
# Ollama 설치 후 모델 다운로드
ollama pull exaone3.5:7.8b      # 채팅 모델
ollama pull nomic-embed-text     # 임베딩 모델

# RAG 지식베이스 구축
npm run ingest
```

### 6단계: 프로덕션 빌드 & 배포

```bash
npm run build        # ./dist/ 에 빌드
npm run preview      # 빌드 결과 미리보기

# Docker 배포
docker build -t acetec-web .
docker run -p 4321:4321 acetec-web
```

---

## 전체 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 (localhost:4321, HMR) |
| `npm run build` | 프로덕션 빌드 (./dist/) |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | ESLint 코드 검사 |
| `npm run lint:fix` | ESLint 자동 수정 |
| `npm run format` | Prettier 코드 포맷팅 |
| `npm run format:check` | Prettier 검사만 |
| `npm run test` | Vitest 단위 테스트 |
| `npm run test:a11y` | Playwright 접근성 테스트 |
| `npm run ingest` | RAG 임베딩 지식베이스 구축 |

---

## 소프트웨어 아키텍처

```
[브라우저] ──> [Astro SSR/SSG Server]
                    │
          ┌─────────┼─────────────┐
          │         │             │
     [SSG Pages]  [SSR Pages]  [API Routes]
     (prerender)  (동적렌더링)   (/api/*)
          │         │             │
          │    ┌────┴────┐   ┌───┴────────┐
          │    │ Admin   │   │ Auth       │
          │    │ CMS     │   │ Chat (RAG) │
          │    └────┬────┘   │ Contact    │
          │         │        │ Health     │
          │    [SQLite DB]   │ Image Upload│
          │    (better-      └───┬────────┘
          │     sqlite3)         │
          │                 [Ollama Local AI]
          │                 (ministral-3:14b  )
          │                      │
          │                 [Vector Store]
          │                 (Qdrant)
          │
     [Content JSON]
     (products, pages)
```

### 렌더링 방식

- **SSG (Static Site Generation)**: catalog, 404 -> 빌드 시 HTML 생성
- **SSR (Server-Side Rendering)**: index, solutions, applications, about, history, contact, login, products/[category], admin -> 요청마다 서버에서 렌더링 (Admin CMS 인라인 편집 지원)
- **API Routes (SSR)**: /api/* -> REST API 엔드포인트 (auth, chat, contact, conversations, messages, health, images, pages)

---

## 프로젝트 구조 & 파일별 기능

```
AceTec-Website-v8/
├── astro.config.mjs          # Astro 설정 (서버모드, Node 어댑터)
├── tsconfig.json              # TypeScript 설정
├── package.json               # 의존성 & 스크립트 정의
├── Dockerfile                 # Docker 컨테이너 빌드 (Node 22 Alpine)
├── eslint.config.mjs          # ESLint 설정
├── vitest.config.ts           # Vitest 테스트 설정
├── playwright.config.ts       # Playwright E2E 테스트 설정
│
├── data/                      # 런타임 데이터 (gitignore 대상)
│   ├── acetec.db              # SQLite DB (admin 계정, 세션)
│   └── vector-store.json      # RAG 벡터 저장소 (임베딩 데이터)
│
├── public/                    # 정적 파일 (빌드 시 그대로 복사)
│   ├── fonts/                 # Self-hosted Roboto woff2 폰트
│   ├── images/                # 정적 이미지 (hero, products, partners 등)
│   ├── uploads/               # Admin이 업로드한 제품 이미지
│   ├── _headers               # 정적 호스팅용 보안 헤더
│   └── favicon.svg            # 파비콘
│
├── scripts/
│   └── ingest-embeddings.ts   # RAG 지식베이스 빌더 (Ollama 임베딩)
│
├── supabase/
│   └── migration.sql          # Supabase 연락처 DB 마이그레이션
│
├── tests/
│   ├── unit/                  # Vitest 단위 테스트
│   └── a11y/                  # Playwright 접근성 테스트
│
└── src/                       # 소스 코드 (아래 상세 설명)
```

### src/layouts/

| 파일 | 기능 |
|------|------|
| `Base.astro` | 마스터 레이아웃. 모든 페이지의 공통 구조 (head, header, footer, chat widget, 모바일 메뉴, back-to-top, toast, 폼 검증, 스크롤 이벤트) |

### src/components/

| 파일 | 기능 |
|------|------|
| `Header.astro` | 고정 네비게이션 바. 로고, 메뉴 링크, Inquiry 버튼, 언어 전환기, 햄버거 메뉴 |
| `MobileMenu.astro` | 모바일 전체화면 메뉴. 768px 이하에서 표시, 포커스 트랩 지원 |
| `Footer.astro` | 사이트 푸터. 회사 소개, 솔루션/회사/파트너 링크, 연락처 정보, 저작권 |
| `ChatWidget.astro` | AI 챗봇 위젯. 하단 floating pill 버튼 -> 확장형 채팅 패널, localStorage 대화 기록, 한국어 IME 처리 |
| `ContactForm.astro` | 문의 폼 컴포넌트. 이름/이메일/전화/메시지 필드, Zod 검증 |
| `ProductGrid.astro` | 제품 카드 그리드. 카테고리별 제품 목록 표시, 배지(SIL4/NEW) |
| `AdminInline.astro` | Admin CMS 인라인 편집 오버레이. 텍스트/이미지 클릭 편집, 실시간 저장 |
| `AdminBar.astro` | Admin 상단 바. 로그아웃, 편집 모드 토글 |
| `BackToTop.astro` | 맨 위로 스크롤 버튼. 스크롤 500px 이상 시 표시 |
| `HistoryYearGroup.astro` | 연혁 페이지 연도별 그룹 컴포넌트. 타임라인 표시 |
| `LangSwitcher.astro` | 언어 전환 드롭다운. 7개 언어 (KR/US/JP/SA/FR/DE/ES), localStorage 저장, 국기 코드 표시 |

### src/pages/ (라우팅)

| 파일 | URL | 렌더링 | 기능 |
|------|-----|--------|------|
| `index.astro` | `/` | SSR | 메인 홈페이지. Hero, Solutions, Featured Products, Service Plan, About, Partners, Contact |
| `solutions.astro` | `/solutions` | SSR | 솔루션 소개 페이지 (Admin CMS 편집 지원) |
| `applications.astro` | `/applications` | SSR | 응용 분야 소개 페이지 (7개 분야, FAQ) |
| `about.astro` | `/about` | SSR | 회사 소개 (CEO 인사말, 경영이념, 기업문화) |
| `history.astro` | `/history` | SSR | 회사 연혁 타임라인 (기간별 탭) |
| `contact.astro` | `/contact` | SSR | 문의 페이지 (ContactForm, 본사/포항지사 정보, 지도) |
| `login.astro` | `/login` | SSR | Admin 로그인 페이지 |
| `catalog.astro` | `/catalog` | SSG | 전체 제품 카탈로그 (108개 제품, 16 카테고리) |
| `products/[category].astro` | `/products/:category` | SSR | 제품 카테고리별 페이지 (military, railway, industrial, telecom, sensor, hpc, radar, ipc) |
| `404.astro` | 404 | SSG | 404 에러 페이지 |

### src/pages/api/ (REST API)

| 파일 | 메서드 | URL | 기능 |
|------|--------|-----|------|
| `auth/login.ts` | POST | `/api/auth/login` | Admin 로그인. username/password -> bcrypt 검증 -> 세션 쿠키 발급 |
| `auth/logout.ts` | POST | `/api/auth/logout` | Admin 로그아웃. 세션 삭제, 쿠키 만료 |
| `chat.ts` | POST | `/api/chat` | AI 챗봇. 사용자 메시지 -> RAG 검색 -> Ollama 생성 -> 스트리밍 응답 |
| `contact.ts` | POST | `/api/contact` | 문의 폼 제출. Zod 검증 -> Supabase 저장 (선택) |
| `health.ts` | GET | `/api/health` | 서버 상태 확인. DB, AI(Ollama) 연결 상태 체크 |
| `images/upload.ts` | POST | `/api/images/upload` | Admin 이미지 업로드. sharp로 4:3 자동 크롭 -> public/uploads/ 저장 |
| `pages/[page].ts` | GET/PUT | `/api/pages/:page` | Admin CMS 페이지 콘텐츠 읽기/수정. JSON 파일 직접 편집 |
| `conversations.ts` | GET/POST | `/api/conversations` | 채팅 대화 관리. 방문자별 대화 목록 조회/생성 |
| `messages.ts` | GET | `/api/messages` | 채팅 메시지 조회. 대화별 메시지 목록 |

### src/lib/ (비즈니스 로직)

| 파일 | 기능 |
|------|------|
| `auth.ts` | Admin 인증. bcrypt 비밀번호 검증, UUID 세션 생성/검증/삭제, HttpOnly 쿠키 관리. TTL 24시간 |
| `db.ts` | SQLite 연결 관리. better-sqlite3로 data/acetec.db 싱글턴 연결. admins + sessions 테이블 자동 생성 |
| `chat.ts` | Ollama 채팅. exaone3.5:7.8b 모델로 AI 응답 생성, 스트리밍 지원 |
| `embeddings.ts` | Ollama 임베딩. nomic-embed-text 모델로 텍스트 -> 벡터 변환 |
| `rag.ts` | RAG 검색 오케스트레이터. 사용자 질문 -> 임베딩 -> 벡터 검색 -> 관련 문서 추출 -> 프롬프트 구성 |
| `vector-store.ts` | 로컬 벡터 저장소. data/vector-store.json 기반, cosine similarity 검색 |
| `image.ts` | 이미지 처리. sharp 라이브러리로 업로드 이미지 리사이즈, 4:3 자동 크롭 |
| `rate-limiter.ts` | IP 기반 속도 제한. 인메모리 방식 (서버 재시작 시 초기화) |
| `sanitize.ts` | 입력 살균. HTML 태그 제거, 문자열 길이 제한 |
| `supabase.ts` | Supabase 클라이언트. 연락처 폼 데이터 저장 (환경변수 미설정 시 graceful fallback) |

### src/content/ (콘텐츠 데이터)

| 경로 | 기능 |
|------|------|
| `content.config.ts` | Content Collections 스키마 정의. 제품 데이터 Zod 검증 |
| `products/*.json` | 제품 카테고리별 데이터 (military, railway, industrial, telecom, sensor, hpc, radar, ipc) |
| `pages/*.json` | CMS 페이지 콘텐츠 (home, about, contact, solutions, applications, footer) |
| `history/timeline.json` | 회사 연혁 타임라인 데이터 |

### src/i18n/ (다국어)

| 파일 | 기능 |
|------|------|
| `index.ts` | 다국어 시스템 코어. 20개 언어 프레임워크, localStorage 기반 전환, 브라우저 언어 자동 감지, `data-i18n` 속성 DOM 번역, `lang-*` 클래스 토글, RTL(아랍어) 지원 |
| `ko.json` | 한국어 번역 (완전) |
| `en.json` | 영어 번역 (완전) |
| `ja.json` | 일본어 번역 (완전) |
| `ar.json` | 아랍어 번역 (완전, RTL) |
| `fr.json` | 프랑스어 번역 (완전) |
| `de.json` | 독일어 번역 (완전) |
| `es.json` | 스페인어 번역 (완전) |
| `zh-TW.json` | 繁體中文 번역 (기본) |

### src/styles/ (디자인 시스템)

| 파일 | 기능 |
|------|------|
| `tokens.css` | 디자인 토큰 (CSS 변수). 색상, 타이포그래피, 간격, 반경, 그림자, z-index 등 모든 디자인 값의 단일 소스 |
| `global.css` | 글로벌 스타일. CSS 리셋, 버튼, 폼, 토스트, 유틸리티 클래스, 반응형 (1024/768/480px) |
| `fonts.css` | Self-hosted Roboto 폰트 (woff2 variable, Latin) |

### src/middleware.ts

| 파일 | 기능 |
|------|------|
| `middleware.ts` | 보안 미들웨어. 모든 응답에 보안 헤더 추가 (X-Frame-Options, CSP, HSTS, Referrer-Policy 등) |

---

## 기술 스택 요약

| 항목 | 기술 |
|------|------|
| 프레임워크 | Astro 6.1.2 (SSG + SSR 하이브리드) |
| 언어 | TypeScript (strict) |
| 런타임 | Node.js >= 22.12.0 |
| 서버 어댑터 | @astrojs/node (standalone) |
| DB | better-sqlite3 (Admin 인증/세션) |
| AI 챗봇 | Ollama (exaone3.5:7.8b 채팅, nomic-embed-text 임베딩) |
| 벡터 검색 | 로컬 JSON (cosine similarity) |
| 이미지 처리 | sharp |
| 연락처 DB | Supabase (선택, fallback 지원) |
| 인증 | bcryptjs + HttpOnly 세션 쿠키 |
| 스타일링 | Vanilla CSS + Design Tokens |
| 다국어 | 클라이언트 사이드 i18n (7개 완전 번역: ko/en/ja/ar/fr/de/es + 20개 프레임워크) |
| 린팅 | ESLint + Prettier |
| 테스트 | Vitest (단위) + Playwright (E2E/접근성) |
| 배포 | Docker (Node 22 Alpine) |

---

## 2026-04-07 변경 이력

### 1. Admin CMS 저장 시 i18n 동기화 (home 페이지 텍스트 수정 반영 안되던 버그 수정)

**문제**: Admin에서 텍스트를 수정하고 Save하면 `home.json`만 업데이트되고, `ko.json`(i18n 번역 파일)은 그대로 남아있었음. 로그아웃 후 i18n 스크립트가 `ko.json`의 옛 텍스트로 덮어써서 수정 내용이 사라짐.

**수정 파일**:
- `src/pages/api/i18n/update.ts` (신규) — i18n JSON 파일을 업데이트하는 POST API 엔드포인트
- `src/components/AdminInline.astro` — Save 시 `data-i18n` 키 수집하여 `ko.json` 자동 동기화

### 2. Catalog 페이지 JSON 기반 CMS 전환

**문제**: `/catalog` 페이지의 16개 카테고리, 95개 제품이 HTML에 하드코딩되어 있어 Admin 편집 불가.

**수정 파일**:
- `src/content/pages/catalog.json` (신규) — 카탈로그 데이터 JSON 추출
- `src/pages/catalog.astro` — `prerender: false`로 전환, JSON 기반 동적 렌더링 + Admin CMS
- `src/pages/api/pages/[page].ts` — catalog을 허용 목록에 추가
- `scripts/extract-catalog.mjs` (신규) — HTML→JSON 추출 스크립트

### 3. Products 페이지 Admin CMS 완전 지원 (9개 페이지)

**문제**: `/products/*` 페이지의 sections 모드에서 Admin 편집(추가/삭제/이미지 교체) 기능 없었음.

**수정 파일**:
- `src/components/ProductGrid.astro` — sections 렌더링에 Admin CMS 전체 기능 추가:
  - 섹션(카테고리) 추가/삭제
  - 제품 추가/삭제
  - 제품명/features 인라인 편집
  - 이미지 Replace 버튼
  - `data-i18n` 키 추가 (다국어 번역 지원)

**적용 페이지**: military, railway, industrial, telecom, sensor, hpc, ipc, radar, interconnect

### 4. Admin 저장 시 편집 내용 보존 (Add/Delete 시 초기화 버그 수정)

**문제**: Admin에서 텍스트를 편집한 후 "+ Add Solution"이나 삭제 버튼을 클릭하면, 서버에서 원본 JSON을 다시 불러와서 편집 내용이 전부 날아감.

**수정 파일**:
- `src/components/AdminInline.astro` — `fetchWithEdits()` 헬퍼 추가. Add/Delete 시 서버 데이터를 가져온 후 현재 인라인 편집 내용을 먼저 반영한 다음 추가/삭제 수행

### 5. Footer data-edit-page 누락으로 "Partial save" 버그 수정

**문제**: Footer의 `data-edit` 요소에 `data-edit-page` 속성이 없어서, home 페이지 저장 시 footer 경로를 home.json에 저장하려다 실패 → "Partial save" 표시.

**수정 파일**:
- `src/components/Footer.astro` — `data-edit-page: 'footer'` 추가

### 6. 스페이스바 입력 안되는 버그 수정 (Admin 인라인 편집)

**문제**: Accordion `keydown` 이벤트가 document 전체에 걸려있어서 `contentEditable` 요소에서 스페이스바를 누르면 아코디언이 가로챔.

**수정 파일**:
- `src/pages/index.astro` — `toggleAccordion` 함수에서 `contentEditable` 요소 내 키 이벤트 무시

### 7. AdminInline features 배열 저장 지원

**수정 파일**:
- `src/components/AdminInline.astro` — `featuresHtml` 경로 감지 시 텍스트를 줄바꿈으로 분리하여 `features` 배열로 변환 저장

### 8. Interconnect 제품 설명 추가 (5개 제품)

**수정 파일**:
- `src/content/products/interconnect.json` — 모든 5개 제품에 상세 features 추가:
  - MXH532 PCIe 5.0 x16 Transparent Adapter
  - MXH930 PCIe NTB Adapter
  - MXH932 PCIe Transparent Adapter
  - PXH830 PCIe NTB Adapter
  - MXS924 PCIe 4.0 Switch

### 9. Interconnect 페이지 7개 언어 번역

**수정 파일**:
- `src/i18n/index.ts` — `data-i18n-html` 속성 추가 (features HTML 번역 지원)
- `src/i18n/ko.json`, `en.json`, `ja.json`, `ar.json`, `fr.json`, `de.json`, `es.json` — `ps.interconnect` 번역 데이터 추가

### 10. 홈 솔루션 카드 이름 변경

- `src/content/pages/home.json` — "레이더" → "레이더분야", "초고속 데이터 인터커넥트" → "초고속 데이터 인터커넥트분야"

### 11. 연구소/슈퍼컴퓨팅 이미지 교체 (바뀌어 있던 이미지 정정)

- `src/content/pages/home.json` — solutionCards[5] 연구소분야 ↔ solutionCards[6] 슈퍼컴퓨팅시스템분야 이미지 swap

### 12. 헤더 텍스트 로고 → 이미지 로고 교체

**수정 파일**:
- `public/images/logo.png` (신규) — 배경 투명 처리된 AceTec 로고
- `src/components/Header.astro` — `<a class="site-title">AceTec</a>` → `<a class="site-logo"><img src="/images/logo.png" /></a>`, CSS 업데이트

### 13. prompt.py + rag_prompt.py 통합

**수정 파일**:
- `scripts/prompt.py` — 두 파일을 합침. `--rag`(기본), `--db`, `--both` 모드 지원
- `scripts/rag_prompt.py` — 삭제 (prompt.py에 통합)

### 14. 챗봇 테스트 (180개 질문, 완료)

**테스트 스크립트**: `scripts/chatbot-test-200.mjs`

최종 결과:
- **통과: 164/180 (91.1%)**
- 실패: 16/180 (8.9%)
- 에러: 0
- 평균 응답 시간: 13,644ms

카테고리별:
| 카테고리 | 통과율 | 비고 |
|----------|--------|------|
| general | 17/20 (85%) | 일부 NO_SRC — 답변은 정확하나 벡터 소스 미첨부 |
| hpc | 20/20 (100%) | |
| military | 19/20 (95%) | |
| railway | 14/15 (93%) | |
| industrial | 20/20 (100%) | |
| telecom | 15/15 (100%) | |
| sensor | 13/15 (87%) | MITL, 타겟 시그니처 — 벡터 DB에 해당 문서 부족 |
| radar | 14/15 (93%) | |
| interconnect | 5/10 (50%) | MXH532, MXS924 등 — Qdrant에 interconnect 문서 미등록 |
| out_of_scope | 19/20 (95%) | 연봉 질문에 부분적 답변 (FAKE_NUM) |
| multilang | 8/10 (80%) | 프랑스어/스페인어 — 답변은 정확하나 소스 미첨부 |

주요 이슈:
- **NO_SRC (15건)**: 답변 내용은 대체로 정확하나 Qdrant 벡터 검색에서 관련 문서를 못 찾음. LLM이 시스템 프롬프트의 일반 지식으로 답변
- **FAKE_NUM (1건)**: "직원 연봉?" 질문에 연봉이라는 단어 포함 응답 (실제 숫자 생성은 아님, 검출 오탐)
- **interconnect 50%**: Qdrant `acetec_knowledge` 컬렉션에 interconnect 제품 문서가 없어서 MXH532/MXS924 등 구체적 질문에 답변 불가 → `npm run ingest`로 interconnect 데이터 추가 필요

벡터 저장소: Qdrant `acetec_knowledge` 컬렉션 92개 문서 (8개 카테고리)
