# AceTec Website v8

AceTec (acetronix.co.kr) - 한국 B2B 임베디드 컴퓨팅 & 산업용 기술 솔루션 기업의 마케팅 웹사이트.
Astro 6 기반 하이브리드(SSG + SSR) 구조. 로컬 AI 챗봇(RAG), Admin CMS 인라인 편집, 다국어(7개 언어 완전 번역 + 20개 언어 프레임워크), 회원 관리 시스템 포함.



> 상세 테스트 결과: [test.md](test.md) 참조

---

## 1. 프로젝트 개요

| 항목 | 설명 |
|------|------|
| **회사** | AceTec (에이스텍, acetronix.co.kr) — 1994년 설립, 한국 B2B 임베디드 컴퓨팅 전문 기업 |
| **분야** | 군용/항공우주, 철도 안전, 산업 자동화, 통신/네트워크, 센서 시뮬레이션, HPC, 레이더, IPC |
| **프레임워크** | Astro 6.1.2 (SSG + SSR 하이브리드) |
| **주요 기능** | 마케팅 페이지, AI 챗봇(RAG), Admin CMS 인라인 편집, 제품 카탈로그, 회원가입/비밀번호 재설정, 관리자 대시보드, 다국어, 자동 동기화 |
| **도메인** | https://www.acetronix.co.kr |

---

## 2. 실행 방법

### 2-1. 사전 요구사항

| 항목 | 버전 | 필수 |
|------|------|------|
| Node.js | >= 22.12.0 | 필수 |
| npm | >= 10 | 필수 |
| Ollama | 최신 | AI 챗봇용 (선택) |
| Qdrant | 최신 | 벡터 검색용 (선택) |

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

브라우저에서 `http://localhost:4321` 또는 `http://<본인IP>:8080` 으로 접속.

### 2-4. Admin 계정 생성 (최초 1회)

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

또는 `/register` 페이지에서 이메일 인증 후 직접 회원가입 가능.

### 2-5. AI 챗봇 설정 (선택)

```bash
# 1) Ollama 설치 후 모델 다운로드
ollama pull ministral-3:14b          # 채팅 모델
ollama pull nomic-embed-text-v2-moe  # 임베딩 모델

# 2) Qdrant 벡터 DB 실행
docker run -p 6333:6333 qdrant/qdrant

# 3) RAG 지식베이스 구축
npm run ingest
```

### 2-6. 프로덕션 빌드 & 배포

```bash
npm run build        # ./dist/ 에 빌드
npm run preview      # 빌드 결과 미리보기

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
| `npm run lint` | ESLint 코드 검사 |
| `npm run lint:fix` | ESLint 자동 수정 |
| `npm run format` | Prettier 코드 포맷팅 |
| `npm run format:check` | Prettier 검사만 |
| `npm run test` | Vitest 단위 테스트 |
| `npm run test:watch` | Vitest watch 모드 |
| `npm run test:a11y` | Playwright 접근성 테스트 |
| `npm run ingest` | RAG 임베딩 지식베이스 구축 (Ollama + Qdrant) |
| `npm run sync` | 자동 동기화 (파일 변경 감지 → Git 커밋 & 푸시) |
| `npm run watch-images` | 이미지 변경 감지 & 자동 처리 |

---

## 4. 프로젝트 파일 구조

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
│   ├── acetec.db              # SQLite DB (계정, 세션, 방문자 로그, 감사 로그, 인증 코드, 대화, 메시지)
│   └── vector-store.json      # (레거시) 로컬 JSON 벡터 저장소
│
├── public/                    # 정적 파일 (빌드 시 그대로 복사)
│   ├── fonts/                 # Self-hosted Roboto woff2 폰트
│   ├── images/                # 정적 이미지 (hero, products, partners, about, misc 등)
│   ├── uploads/               # Admin이 업로드한 이미지 (products, hero, services, partners, about, plans, misc)
│   ├── _headers               # 정적 호스팅용 보안 헤더
│   └── favicon.svg            # 파비콘
│
├── scripts/
│   ├── auto-sync.mjs          # 자동 Git 커밋 & 푸시 (파일 변경 감지, 30초 디바운스)
│   ├── ingest-embeddings.ts   # RAG 지식베이스 빌더 (Ollama → Qdrant)
│   ├── ensure-ollama.mjs      # dev 서버 시작 전 Ollama 상태 확인
│   ├── extract-catalog.mjs    # HTML → JSON 카탈로그 추출
│   ├── watch-images.ts        # 이미지 변경 감지 & 자동 처리
│   ├── chatbot-test-200.mjs   # 챗봇 테스트 (180개 질문)
│   ├── chatbot-test.mjs       # 챗봇 기본 테스트
│   ├── prompt.py              # Python 프롬프트 생성기 (RAG + DB 모드)
│   ├── bulk_embed.py          # 벌크 임베딩 생성
│   ├── embed_chunks.py        # 청크 임베딩
│   ├── crawl_website.py       # 웹사이트 크롤링
│   ├── generate_paraphrases.py # 패러프레이즈 생성
│   ├── generate_questions.py  # 테스트 질문 생성
│   ├── setup_pipeline.py      # 파이프라인 설정
│   └── test_chatbot.py        # Python 챗봇 테스트
│
├── supabase/
│   └── migration.sql          # Supabase 연락처 DB 마이그레이션
│
├── tests/
│   ├── unit/                  # Vitest 단위 테스트
│   └── a11y/                  # Playwright 접근성 테스트
│
└── src/                       # 소스 코드
```

### src/layouts/

| 파일 | 기능 |
|------|------|
| `Base.astro` | 마스터 레이아웃. 모든 페이지의 공통 구조 (head, header, footer, chat widget, 모바일 메뉴, back-to-top, toast, 폼 검증, 스크롤 이벤트) |

### src/components/

| 파일 | 기능 |
|------|------|
| `Header.astro` | 고정 네비게이션 바. 이미지 로고, 메뉴 링크, Products 메가 메뉴(hover dropdown), Inquiry 버튼, 언어 전환기(LangSwitcher), 햄버거 메뉴 |
| `MobileMenu.astro` | 모바일 전체화면 메뉴. 768px 이하에서 표시, 포커스 트랩 지원 |
| `Footer.astro` | 사이트 푸터. 회사 소개, 솔루션/회사/파트너 링크, 연락처 정보, 저작권. Admin 인라인 편집 지원 (data-edit-page="footer") |
| `ChatWidget.astro` | AI 챗봇 위젯. 하단 floating pill 버튼 → 확장형 채팅 패널, Gemini 스타일 사이드바 히스토리, 문의 플로우, 한국어 IME 처리 |
| `ContactForm.astro` | 문의 폼 컴포넌트. 이름/이메일/전화/메시지 필드, Zod 검증 |
| `ProductGrid.astro` | 제품 카드 그리드. 카테고리별 제품 목록 표시, 배지(SIL4/NEW), Admin CMS 전체 기능 (섹션/제품 추가/삭제, 인라인 편집, 이미지 Replace) |
| `AdminInline.astro` | Admin CMS 인라인 편집 오버레이. data-edit(텍스트), data-img(이미지), data-admin-add/delete(배열), data-edit-page(다중 페이지), i18n 자동 동기화 |
| `AdminBar.astro` | Admin 상단 고정 바. Save 버튼, Dashboard 링크, Logout 버튼 |
| `BackToTop.astro` | 맨 위로 스크롤 버튼. 스크롤 500px 이상 시 표시 |
| `HistoryYearGroup.astro` | 연혁 페이지 연도별 그룹 컴포넌트. 타임라인 표시 |
| `LangSwitcher.astro` | 언어 전환 드롭다운. 다크 pill 스타일 (🌐 KO), 20개 언어, 기본 ko, localStorage 저장 |

### src/pages/ (라우팅)

| 파일 | URL | 렌더링 | 기능 |
|------|-----|--------|------|
| `index.astro` | `/` | SSR | 홈페이지. Fullscreen hero(gradient overlay), Solution cards, Featured Products, Service Plan, About, Partners, Contact Form |
| `solutions.astro` | `/solutions` | SSR | 솔루션 소개. 10개 솔루션 카드 + 서브카테고리, Admin 인라인 편집 |
| `applications.astro` | `/applications` | SSR | 응용 분야. Accordion 챕터(lessons/sections/FAQ), 중앙 정렬 레이아웃 |
| `about.astro` | `/about` | SSR | 회사 소개 (CEO 인사말, 경영이념, 기업문화) |
| `history.astro` | `/history` | SSR | 회사 연혁 타임라인 (기간별 탭, HistoryYearGroup 컴포넌트) |
| `contact.astro` | `/contact` | SSR | 문의 페이지 (ContactForm, 본사/포항지사 정보, 지도) |
| `login.astro` | `/login` | SSR | 로그인 페이지 (Admin + 일반 사용자) |
| `register.astro` | `/register` | SSR | 회원가입 (역할 선택 → 이메일 인증 → 계정 생성) |
| `forgot-password.astro` | `/forgot-password` | SSR | 비밀번호 재설정 (이메일 인증 → 새 비밀번호) |
| `catalog.astro` | `/catalog` | SSR | 전체 제품 카탈로그 (JSON 기반 CMS 편집) |
| `products/[category].astro` | `/products/:category` | SSR | 카테고리별 제품 페이지 (military, railway, industrial, telecom, sensor, hpc, ipc, radar, interconnect) |
| `products-intro.astro` | `/products-intro` | SSR | 제품 소개 페이지 |
| `careers.astro` | `/careers` | SSR | 채용 정보 |
| `news.astro` | `/news` | SSR | 뉴스 |
| `training.astro` | `/training` | SSR | 교육 |
| `admin/dashboard.astro` | `/admin/dashboard` | SSR | 관리자 대시보드 (방문자 통계, 사용자 관리, 감사 로그) |
| `404.astro` | 404 | SSG | 404 에러 페이지 |

### src/pages/api/ (REST API)

| 파일 | 메서드 | URL | 기능 |
|------|--------|-----|------|
| `auth/login.ts` | POST | `/api/auth/login` | 로그인. username/password → bcrypt 검증 → 세션 쿠키 발급 |
| `auth/logout.ts` | POST | `/api/auth/logout` | 로그아웃. 세션 삭제, 쿠키 만료 |
| `auth/send-code.ts` | POST | `/api/auth/send-code` | 인증 코드 발송. email + purpose(register/reset) → 6자리 코드 생성 → 이메일 발송 (10분 유효) |
| `auth/register.ts` | POST | `/api/auth/register` | 회원가입. email + code + password → 인증 코드 확인 → 계정 생성 |
| `auth/reset-password.ts` | POST | `/api/auth/reset-password` | 비밀번호 재설정. email + code + newPassword → 인증 코드 확인 → 비밀번호 변경 |
| `chat.ts` | POST | `/api/chat` | AI 챗봇. 사용자 메시지 → RAG 검색(Qdrant) → Ollama 생성 → 응답 |
| `contact.ts` | POST | `/api/contact` | 문의 폼 제출. Zod 검증 → Supabase 저장 (선택) |
| `health.ts` | GET | `/api/health` | 서버 상태 확인. DB, AI(Ollama) 연결 상태 체크 |
| `images/upload.ts` | POST | `/api/images/upload` | 이미지 업로드. sharp로 preset별 리사이즈 + WebP 변환 → public/uploads/ 저장 |
| `pages/[page].ts` | GET/PUT | `/api/pages/:page` | CMS 페이지 콘텐츠 읽기/수정. JSON 파일 직접 편집 |
| `i18n/update.ts` | POST | `/api/i18n/update` | i18n 번역 파일 업데이트. Admin 저장 시 ko.json 자동 동기화 |
| `conversations.ts` | GET/POST | `/api/conversations` | 채팅 대화 관리. 방문자별 대화 목록 조회/생성 |
| `messages.ts` | GET | `/api/messages` | 채팅 메시지 조회. 대화별 메시지 목록 |
| `admin/stats.ts` | GET | `/api/admin/stats` | 관리자 통계. 방문자 수(일/월/년), 페이지뷰, 감사 로그, 역할별 계정 수 |
| `admin/users.ts` | GET/POST/PUT/DELETE | `/api/admin/users` | 사용자 관리. 목록 조회, 생성, 수정, 삭제 (감사 로그 자동 기록) |
| `access-request.ts` | POST | `/api/access-request` | person 사용자가 제품 설명 열람 권한 요청. 중복 요청 방지 |
| `admin/access-requests.ts` | GET/POST | `/api/admin/access-requests` | 관리자 열람 권한 요청 관리. GET: 요청 목록 조회, POST: 승인/거절 (승인 시 person→customer 자동 변경) |

### src/lib/ (비즈니스 로직)

| 파일 | 기능 |
|------|------|
| `auth.ts` | 인증 시스템. bcrypt 비밀번호 검증(username/email 지원), UUID 세션 생성/검증/삭제, HttpOnly 쿠키 관리, getUserInfo()로 역할 조회. TTL 24시간 |
| `db.ts` | SQLite 연결 관리. better-sqlite3로 data/acetec.db 싱글턴 연결. 8개 테이블 자동 생성 (admins, sessions, visitor_logs, audit_logs, verification_codes, access_requests, conversations, messages) |
| `email.ts` | 이메일 발송. nodemailer SMTP 트랜스포터, 6자리 인증 코드 생성, HTML 이메일 템플릿 (회원가입/비밀번호 재설정), SMTP 미설정 시 콘솔 출력 fallback |
| `chat.ts` | Ollama 채팅. ministral-3:14b 모델로 AI 응답 생성, RAG 컨텍스트 주입, 시스템 프롬프트(AceTec 전용), 다국어 자동 감지 |
| `embeddings.ts` | Ollama 임베딩. nomic-embed-text-v2-moe 모델로 텍스트 → 768차원 벡터 변환 |
| `rag.ts` | RAG 검색 오케스트레이터. 사용자 질문 → 임베딩 생성 → Qdrant 벡터 검색 → 관련 문서 추출 (top 5, 유사도 0.3 이상) |
| `vector-store.ts` | Qdrant 벡터 저장소. acetec_knowledge 컬렉션, Cosine 유사도 검색, 문서 업서트(100개 배치), 컬렉션 자동 생성 |
| `image.ts` | 이미지 처리. sharp 라이브러리로 preset별 리사이즈(hero/service/product/plan/partner/about/misc), WebP 82% 품질, public/uploads + dist/client/uploads + 이미지 백업 폴더에 저장 |
| `rate-limiter.ts` | IP 기반 속도 제한. 인메모리 방식 (서버 재시작 시 초기화) |
| `sanitize.ts` | 입력 살균. HTML 태그 제거, 문자열 길이 제한 |
| `supabase.ts` | Supabase 클라이언트. 연락처 폼 데이터 저장 (환경변수 미설정 시 graceful fallback) |

### src/content/ (콘텐츠 데이터)

| 경로 | 기능 |
|------|------|
| `content.config.ts` | Content Collections 스키마 정의. 제품 데이터 Zod 검증 |
| `products/*.json` | 제품 카테고리별 데이터 (military, railway, industrial, telecom, sensor, hpc, ipc, radar, interconnect) |
| `pages/home.json` | 홈페이지 콘텐츠 (hero, solutionCards, products, servicePlan, about, partners, contact) |
| `pages/solutions.json` | 솔루션 페이지 콘텐츠 (10개 솔루션 + 서브카테고리) |
| `pages/applications.json` | 응용 분야 페이지 콘텐츠 |
| `pages/about.json` | 회사 소개 페이지 콘텐츠 |
| `pages/contact.json` | 문의 페이지 콘텐츠 |
| `pages/catalog.json` | 전체 카탈로그 데이터 (16개 카테고리, 95+ 제품) |
| `pages/footer.json` | 푸터 콘텐츠 (Admin 인라인 편집 대상) |
| `pages/megamenu.json` | 메가 메뉴 데이터 (11개 카테고리 컬럼 + 서브 아이템) |
| `pages/careers.json` | 채용 정보 콘텐츠 |
| `pages/news.json` | 뉴스 콘텐츠 |
| `pages/products-intro.json` | 제품 소개 콘텐츠 |
| `pages/training.json` | 교육 콘텐츠 |
| `history/timeline.json` | 회사 연혁 타임라인 데이터 |

### src/i18n/ (다국어)

| 파일 | 기능 |
|------|------|
| `index.ts` | 다국어 시스템 코어. 20개 언어 프레임워크, localStorage 기반 전환, 브라우저 언어 자동 감지, `data-i18n` 속성 DOM 번역, `data-i18n-html` HTML 번역, `lang-*` 클래스 토글, RTL(아랍어) 지원 |
| `ko.json` | 한국어 번역 (완전) |
| `en.json` | 영어 번역 (완전) |
| `ja.json` | 일본어 번역 (완전) |
| `ar.json` | 아랍어 번역 (완전, RTL) |
| `fr.json` | 프랑스어 번역 (완전) |
| `de.json` | 독일어 번역 (완전) |
| `es.json` | 스페인어 번역 (완전) |


### src/styles/ (디자인 시스템)

| 파일 | 기능 |
|------|------|
| `tokens.css` | 디자인 토큰 (CSS 변수). 색상, 타이포그래피, 간격, 반경, 그림자, z-index 등 모든 디자인 값의 단일 소스 |
| `global.css` | 글로벌 스타일. CSS 리셋, 버튼, 폼, 토스트, 유틸리티 클래스, 반응형 (1024/768/480px) |
| `fonts.css` | Self-hosted Roboto 폰트 (woff2 variable, Latin) |

### src/middleware.ts

| 기능 | 설명 |
|------|------|
| 방문자 로깅 | 모든 HTML 페이지 요청 시 IP, 경로, User-Agent, 타임스탬프를 visitor_logs 테이블에 기록 |
| 보안 헤더 | X-Frame-Options(DENY), X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS, CSP |

---

## 5. 사용자 화면 기능

### 5-1. 홈페이지 (`/`)

- **Fullscreen Hero**: 전체 화면 히어로 이미지 + 그라디언트 오버레이, 회사 슬로건 텍스트
- **Solution Cards**: 10개 솔루션 분야 카드 (군용/항공우주, 철도안전, 산업자동화, 통신/네트워크, 센서시뮬레이션, 연구소, 슈퍼컴퓨팅, 레이더, 초고속 인터커넥트, IPC)
- **Featured Products**: 주요 제품 카드 (이미지, 제품명, 특징)
- **Service Plan**: 서비스 플랜 소개 섹션
- **About Section**: 회사 소개 + 이미지 (리사이즈 최적화)
- **Partners**: 파트너사 로고 그리드
- **Contact Form**: 하단 문의 폼 (이름, 이메일, 전화, 메시지)

### 5-2. Solutions 페이지 (`/solutions`)

- **10개 솔루션 카드**: 각 카드에 제목, 설명, 이미지, 서브카테고리 목록
- **서브카테고리**: 각 솔루션 아래 세부 분야 목록
- **Admin 인라인 편집**: 로그인 시 텍스트/이미지/서브카테고리 직접 편집, 솔루션 추가/삭제

### 5-3. Products 메가 메뉴

- **Hover Dropdown**: Header의 "Products" 메뉴에 마우스 오버 시 전체 너비 드롭다운 표시
- **11개 카테고리 컬럼**: megamenu.json에서 동적 로딩
  - Industrial PCs, Network Appliance, Device Cloud (IoT), Form Factor_Abaco, HIMA Railway, High Performance Computing, High-Speed Data Interconnect, Real-Time Operating System, Sensor Modeling and Simulation, Middleware Software, Radar Processing System
- **서브 아이템**: 각 카테고리 아래 세부 제품/분류 링크
- **Admin 편집**: 메가 메뉴 내용도 Admin CMS에서 편집 가능

### 5-4. Applications 페이지 (`/applications`)

- **Accordion 챕터**: 각 응용 분야를 접이식 아코디언으로 표시
- **Lessons/Sections**: 챕터 내 학습 콘텐츠 구조
- **FAQ**: 자주 묻는 질문
- **중앙 정렬 레이아웃**: Hero 제거, 콘텐츠 중심 깔끔한 디자인

### 5-5. 언어 전환기 (LangSwitcher)

- **다크 pill 스타일**: `🌐 KO` 형태의 작은 다크 버튼
- **20개 언어 프레임워크**: 한국어(ko), 영어(en), 일본어(ja), 아랍어(ar), 프랑스어(fr), 독일어(de), 스페인어(es), 중국어 번체(zh-TW) 등
- **기본값**: ko (한국어)
- **localStorage 저장**: 선택한 언어 기억
- **브라우저 언어 자동 감지**: 첫 방문 시 브라우저 설정 기반 언어 선택
- **RTL 지원**: 아랍어 선택 시 RTL 레이아웃 자동 적용

### 5-6. AI 챗봇

- **Floating Pill 버튼**: 하단 중앙에 길쭉한 pill 형태 버튼 ("Ask about our products")
- **Chat Panel**: 클릭 시 확장되는 채팅 패널 (리사이즈 핸들)
- **Gemini 스타일 사이드바**: 좌측 햄버거 메뉴 → 슬라이드인 사이드바, 대화 히스토리 목록, "New Chat" 버튼
- **RAG 기반 답변**: Qdrant 벡터 검색 → 관련 문서 컨텍스트 → Ollama AI 생성
- **문의 플로우**: "📋 Product Inquiry" 버튼 → 단계별 정보 수집 (제품, 수량, 연락처 등) → 요약 카드 → mailto 또는 contact 페이지 리다이렉트
- **한국어 IME 처리**: compositionstart/end 이벤트로 한글 입력 중 Enter 키 전송 방지
- **대화 영속성**: 서버 측 SQLite (conversations + messages 테이블), 클라이언트 localStorage 병행

### 5-7. Contact Form

- **mailto 방식**: acetec@acetec-korea.co.kr 로 이메일 발송
- **Supabase 저장**: 환경변수 설정 시 Supabase DB에도 저장 (fallback 지원)
- **Zod 검증**: 입력 데이터 스키마 검증

---

## 6. 관리자 화면 기능

### 6-1. 로그인

- URL: `/login`
- Admin 계정으로 로그인 → 세션 쿠키 발급 (HttpOnly, 24시간 TTL)
- 로그인 후 이전 페이지로 리다이렉트

### 6-2. Admin Bar

- 로그인 상태에서 모든 페이지 상단에 고정 표시
- **Save 버튼**: 현재 페이지의 인라인 편집 내용 저장
- **Dashboard 링크**: `/admin/dashboard`로 이동
- **Logout 버튼**: 세션 삭제 후 로그아웃

### 6-3. 인라인 편집 (AdminInline)

| 속성 | 기능 |
|------|------|
| `data-edit="path.to.field"` | 텍스트 인라인 편집. contentEditable로 직접 수정 |
| `data-img="path.to.imageField"` | 이미지 편집. hover 시 📷 Replace 배지 표시, 클릭 시 파일 선택 |
| `data-admin-add="arrayPath"` | 배열에 새 항목 추가 버튼 ("+ Add" 버튼) |
| `data-admin-delete="arrayPath.index"` | 배열에서 특정 항목 삭제 버튼 ("✕" 버튼) |
| `data-edit-page="pageName"` | 다른 JSON 파일 편집 지정 (footer.json, megamenu.json 등 다중 페이지 편집) |
| `data-i18n="key"` | Save 시 ko.json 자동 동기화 (i18n 번역 일관성 유지) |

**저장 프로세스**:
1. Admin이 페이지에서 텍스트/이미지 수정
2. Save 버튼 클릭
3. AdminInline이 모든 `data-edit`, `data-img` 요소에서 현재 값 수집
4. `data-edit-page` 속성별로 그룹화하여 각 JSON 파일에 PUT `/api/pages/[page]`
5. `data-i18n` 키가 있는 요소는 ko.json도 자동 업데이트 (`POST /api/i18n/update`)

### 6-4. 관리자 대시보드 (`/admin/dashboard`)

**방문자 통계 카드**:
- 오늘 방문자 (고유 IP)
- 월간 방문자 (30일, 고유 IP)
- 연간 방문자 (365일, 고유 IP)
- 일간/월간 페이지뷰

**열람 권한 요청 관리** (Access Requests):
- 대기 중(pending) 요청 수 빨간 배지로 표시
- 요청 목록 테이블: ID, Username, Display Name, Email, Status, 요청일, Actions
- 승인 버튼: person → customer로 역할 변경, 제품 설명 열람 가능
- 거절 버튼: 역할 유지, 요청 상태만 rejected로 변경
- 처리된 요청도 이력으로 보관 (approved/rejected 상태)

**사용자 관리 테이블**:
- 전체 사용자 목록 (ID, Username, Display Name, Role)
- CRUD: 사용자 생성/수정/삭제
- 역할: Admin, Sales, Customer, Person (색상 코드 배지)
- 모달 폼: 사용자 추가/수정 (username, display name, password, role 선택)

**감사 로그(Audit Logs)**:
- 최근 30건 활동 기록
- 기록 대상: user_create, user_update, user_delete, user_register, password_reset, access_request, access_approve, access_reject
- 시간, 작업, 상세 내용 표시

### 6-5. 회원가입 시스템 (`/register`)

1. 역할 선택: Admin / Sales / Customer / Person
2. 이메일 입력 → "인증 코드 발송" 버튼
3. `POST /api/auth/send-code` → 6자리 코드 생성 (10분 유효) → 이메일 발송
4. 인증 코드 + Display Name + 비밀번호 입력
5. `POST /api/auth/register` → 코드 확인 → 계정 생성
6. audit_logs에 `user_register` 기록

### 6-6. 비밀번호 재설정 (`/forgot-password`)

1. 이메일 입력 → "인증 코드 발송" 버튼
2. `POST /api/auth/send-code` (purpose: reset) → 6자리 코드 발송
3. 인증 코드 + 새 비밀번호 입력
4. `POST /api/auth/reset-password` → 코드 확인 → 비밀번호 변경 → 기존 세션 삭제
5. audit_logs에 `password_reset` 기록

---

## 7. 챗봇 실행 과정 (상세)

### 7-1. AI 모델 구성

| 용도 | 모델 | 엔진 |
|------|------|------|
| 채팅 생성 | ministral-3:14b | Ollama (localhost:11434) |
| 텍스트 임베딩 | nomic-embed-text-v2-moe | Ollama (localhost:11434) |
| 리랭킹 | jina-reranker-v2-base-multilingual | 로컬 서버 (localhost:8787) |
| 벡터 저장/검색 | - | Qdrant (localhost:6333) |

### 7-2. RAG 파이프라인

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
```

### 7-3. 채팅 응답 생성 흐름

```
[사용자 메시지 입력]
       │
       ▼
[POST /api/chat]
       │
       ├── 1. 메시지 임베딩 생성 (nomic-embed-text-v2-moe)
       │
       ├── 2. 1차 후보군 검색 (Qdrant Search)
       │    └── top 20 후보 확보 (cosine similarity ≥ 0.15, 리랭킹용 넉넉히)
       │
       ├── 3. 로컬 리랭킹 (Jina Reranker v2-Base Multilingual)
       │    ├── 쿼리와 20개의 문서를 비교하여 재점수화
       │    └── 가장 관련성 높은 상위 5개만 최종 선별
       │
       ├── 4. 정제된 컨텍스트 구성 (LLM에게 전달할 고순도 데이터)
       │
       ├── 5. 시스템 프롬프트 + 최종 컨텍스트 + 대화 히스토리(최근 6턴) + 사용자 메시지
       │
       ▼
[Ollama ministral-3:14b]
       │
       ├── temperature: 0.3, max tokens: 300
       ├── 2.5분 타임아웃
       │
       ▼
[AI 응답 + 리랭킹된 참조 소스 목록]
       │
       └── 클라이언트에 JSON 반환
```

### 7-4. 지식베이스 구축

```bash
npm run ingest
```

- `scripts/ingest-embeddings.ts` 실행
- `src/content/products/*.json`의 모든 제품 데이터 파싱
- `src/content/pages/*.json`의 페이지 콘텐츠 파싱
- 각 데이터를 텍스트 청크로 분할
- Ollama로 각 청크의 768차원 임베딩 벡터 생성
- Qdrant `acetec_knowledge` 컬렉션에 100개씩 배치 업서트

### 7-5. Chat UI 기능

- **Pill 버튼**: 하단 중앙 floating pill. 클릭 시 패널 확장
- **리사이즈 핸들**: 채팅 패널 상단 드래그로 높이 조절
- **한국어 IME 처리**: `compositionstart`/`compositionend` 이벤트로 한글 조합 중 Enter 키 전송 방지
- **대화 히스토리**: 서버 SQLite(conversations/messages 테이블) + 클라이언트 localStorage 병행
- **Gemini 스타일 사이드바**: 좌측 햄버거 메뉴(☰) 클릭 → 슬라이드인 오버레이, 이전 대화 목록, "New Chat" 버튼
- **New Chat**: 현재 대화 저장 후 새 대화 시작, 사이드바/헤더의 New Chat 버튼

### 7-6. 문의 플로우 (Inquiry Flow)

1. 환영 메시지의 "📋 Product Inquiry" 버튼 클릭
2. 챗봇이 단계별로 정보 수집:
   - 관심 제품/분야
   - 수량/규모
   - 연락처 정보 (이름, 이메일, 전화)
   - 추가 요구사항
3. 수집 완료 시 **요약 카드 UI** 표시 (모든 입력 정보 정리)
4. "이메일 보내기" → mailto:acetec@acetec-korea.co.kr 또는 Contact 페이지 리다이렉트

---

## 8. 이미지 업로드 & 저장 과정 (상세)

### 8-1. 이미지 교체 흐름

```
1. Admin 로그인 상태에서 페이지 탐색
2. data-img 속성이 있는 이미지에 마우스 hover
3. 📷 Replace 배지 오버레이 표시
4. 배지 클릭 → <input type="file"> 열림
5. 이미지 선택
       │
       ▼
6. POST /api/images/upload
   Body: FormData { image: File, preset: string }
       │
       ▼
7. 서버 처리 (src/lib/image.ts):
   ├── 파일 검증 (15MB 이하, jpeg/png/webp/gif)
   ├── sharp로 preset별 리사이즈:
   │   ├── hero:    1400 × 600
   │   ├── service:  800 × 600
   │   ├── product:  800 × 600
   │   ├── plan:    1792 × 1024
   │   ├── partner:  400 × 400
   │   ├── about:    800 × 650
   │   └── misc:    1400 × 600
   ├── WebP 변환 (품질 82%)
   ├── 파일명: {timestamp}-{slug}.webp
   │
   ▼
8. 저장 위치 (3곳):
   ├── public/uploads/{preset}/{filename}.webp    (소스)
   ├── dist/client/uploads/{preset}/{filename}.webp (빌드, 있는 경우)
   └── 이미지/{filename}.webp                      (백업)
       │
       ▼
9. 응답: { image_path: "/uploads/{preset}/{filename}.webp" }
       │
       ▼
10. 클라이언트에서 이미지 즉시 교체 (메모리)
11. Save 버튼 클릭 → JSON 파일에 새 이미지 경로 저장
```

### 8-2. Preset 크기표

| Preset | 너비 × 높이 | 저장 경로 | 용도 |
|--------|------------|----------|------|
| `hero` | 1400 × 600 | uploads/hero/ | 히어로 배너 이미지 |
| `service` | 800 × 600 | uploads/services/ | 서비스 섹션 이미지 |
| `product` | 800 × 600 | uploads/products/ | 제품 카드 이미지 |
| `plan` | 1792 × 1024 | uploads/plans/ | 서비스 플랜 이미지 |
| `partner` | 400 × 400 | uploads/partners/ | 파트너 로고 |
| `about` | 800 × 650 | uploads/about/ | 회사 소개 이미지 |
| `misc` | 1400 × 600 | uploads/misc/ | 기타 이미지 |

---

## 9. 관리자 대시보드 작동 방식

### 9-1. 접근 제어

- URL: `/admin/dashboard` (SSR, 인증 필수)
- middleware.ts에서 세션 쿠키 검증
- 미인증 시 `/login`으로 리다이렉트

### 9-2. 방문자 통계

```
[/admin/dashboard 로드]
       │
       ▼
[GET /api/admin/stats]
       │
       ├── visitor_logs 테이블 쿼리:
       │   ├── 오늘 고유 IP 수 (COUNT DISTINCT ip WHERE created_at >= 오늘 0시)
       │   ├── 30일 고유 IP 수
       │   ├── 365일 고유 IP 수
       │   ├── 일간 페이지뷰 (COUNT *)
       │   └── 월간 페이지뷰
       │
       ├── audit_logs 테이블: 최근 30건 활동 로그
       │
       └── admins 테이블: 역할별 계정 수 (GROUP BY role)
```

### 9-3. 사용자 관리

```
[GET /api/admin/users]  → 전체 사용자 목록 (id, username, role, display_name)

[POST /api/admin/users] → 사용자 생성
  Body: { username, password, role, display_name }
  → bcrypt 해시 → INSERT admins → audit_logs 기록

[PUT /api/admin/users]  → 사용자 수정
  Body: { id, username, password?, role, display_name }
  → password 있으면 bcrypt 해시 → UPDATE admins → audit_logs 기록

[DELETE /api/admin/users?id=N] → 사용자 삭제
  → sessions 삭제 → admins 삭제 → audit_logs 기록
```

### 9-4. 역할(Roles) 및 권한

| 역할 | 배지 색상 | 제품 설명 열람 | 관리자 도구 (AdminInline) | 대시보드 접근 | 설명 |
|------|----------|--------------|--------------------------|--------------|------|
| `admin` | 파란색 | 전체 보기 + 편집 | 표시 | 접근 가능 | 최고 관리자. 모든 기능 접근 |
| `sales` | 초록색 | 전체 보기 | 숨김 | 접근 불가 | 영업 담당자 |
| `customer` | 노란색 | 전체 보기 | 숨김 | 접근 불가 | 고객 계정 (승인된 사용자) |
| `person` | 회색 | 🔒 숨김 (잠금) | 숨김 | 접근 불가 | 일반 사용자 (self-register 기본값) |

#### 역할별 제품 페이지 동작

- **admin**: 제품 이미지, 이름, 설명(features/specs) 모두 보이며, AdminInline 도구로 인라인 편집 가능
- **customer / sales**: 제품 이미지, 이름, 설명 모두 보이지만 편집 불가. 관리자 도구 숨김
- **person**: 제품 이미지와 이름은 보이지만, **설명(features/specs)은 🔒 잠금 처리**. "설명 보기 요청" 버튼으로 열람 권한 요청 가능

#### 열람 권한 요청 흐름

```
[person 사용자]                          [관리자 대시보드]
      │                                        │
      ├── 제품 페이지 접속                       │
      │   └── 설명 대신 🔒 잠금 표시              │
      │                                        │
      ├── "설명 보기 요청" 버튼 클릭              │
      │   └── POST /api/access-request         │
      │                                        │
      │                              ┌─────────┤
      │                              │ 요청 목록에 표시 (빨간 카운트 배지)
      │                              │         │
      │                              │  [승인] → person → customer로 역할 변경
      │                              │         │  └── 이후 설명 열람 가능
      │                              │  [거절] → 역할 유지 (person 그대로)
      │                              └─────────┤
      │                                        │
```

- 중복 요청 방지: 이미 대기 중(pending)인 요청이 있으면 재요청 불가
- 승인 시 `admins.role`이 `person` → `customer`로 자동 변경
- 모든 요청/승인/거절 이력은 `audit_logs`에 기록

### 9-5. 방문자 로깅

- `src/middleware.ts`에서 모든 HTML 페이지 요청 시 자동 기록
- API 요청(`/api/*`), 내부 요청(`/_*`), 정적 파일(`.` 포함 경로)은 제외
- 기록 데이터: IP (X-Forwarded-For), 경로, User-Agent, 타임스탬프

### 9-6. 감사 로깅

| Action | 발생 시점 |
|--------|----------|
| `user_create` | Admin이 사용자를 수동 생성 |
| `user_update` | Admin이 사용자 정보 수정 |
| `user_delete` | Admin이 사용자 삭제 |
| `user_register` | 사용자가 /register에서 자가 등록 |
| `password_reset` | 사용자가 /forgot-password에서 비밀번호 변경 |
| `access_request` | person 사용자가 제품 설명 열람 권한 요청 |
| `access_approve` | Admin이 열람 권한 요청 승인 (person → customer) |
| `access_reject` | Admin이 열람 권한 요청 거절 |

---

## 10. DB 스키마

SQLite 데이터베이스: `data/acetec.db` (better-sqlite3, WAL 모드)

### admins (사용자 계정)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER PK AUTOINCREMENT | 사용자 ID |
| `username` | TEXT UNIQUE NOT NULL | 로그인 아이디 |
| `password_hash` | TEXT NOT NULL | bcrypt 해시 비밀번호 |
| `role` | TEXT NOT NULL DEFAULT 'admin' | 역할 (admin/sales/customer/person) |
| `display_name` | TEXT | 표시 이름 |
| `email` | TEXT | 이메일 주소 |
| `phone` | TEXT | 전화번호 |
| `bio` | TEXT | 자기소개 |
| `avatar_url` | TEXT | 프로필 이미지 경로 |

### sessions (로그인 세션)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | TEXT PK | UUID 세션 ID (HttpOnly 쿠키) |
| `admin_id` | INTEGER NOT NULL FK | admins.id 참조 |
| `expires_at` | INTEGER NOT NULL | 만료 시간 (Unix ms, 24시간) |

### verification_codes (이메일 인증 코드)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER PK AUTOINCREMENT | 코드 ID |
| `email` | TEXT NOT NULL | 수신 이메일 |
| `code` | TEXT NOT NULL | 6자리 인증 코드 |
| `purpose` | TEXT NOT NULL | 용도 (register / reset) |
| `role` | TEXT | 회원가입 시 선택한 역할 |
| `expires_at` | INTEGER NOT NULL | 만료 시간 (Unix ms, 10분) |
| `used` | INTEGER NOT NULL DEFAULT 0 | 사용 여부 (0/1) |

### visitor_logs (방문자 기록)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER PK AUTOINCREMENT | 로그 ID |
| `ip` | TEXT | 방문자 IP (X-Forwarded-For) |
| `path` | TEXT | 요청 경로 |
| `user_agent` | TEXT | 브라우저 User-Agent |
| `created_at` | INTEGER NOT NULL | 타임스탬프 (Unix ms) |

### audit_logs (감사 로그)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER PK AUTOINCREMENT | 로그 ID |
| `admin_id` | INTEGER | 수행한 관리자 ID (null 가능) |
| `action` | TEXT NOT NULL | 작업 유형 (user_create, user_update 등) |
| `detail` | TEXT | 상세 내용 |
| `created_at` | INTEGER NOT NULL | 타임스탬프 (Unix ms) |

### access_requests (열람 권한 요청)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER PK AUTOINCREMENT | 요청 ID |
| `user_id` | INTEGER NOT NULL FK | admins.id 참조 (요청한 사용자) |
| `status` | TEXT NOT NULL DEFAULT 'pending' | 상태 (pending / approved / rejected) |
| `created_at` | INTEGER NOT NULL | 요청 시간 (Unix ms) |
| `resolved_at` | INTEGER | 처리 시간 (Unix ms) |
| `resolved_by` | INTEGER FK | admins.id 참조 (처리한 관리자) |

### conversations (채팅 대화)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | TEXT PK | 대화 UUID |
| `visitor_id` | TEXT NOT NULL | 방문자 식별자 |
| `title` | TEXT NOT NULL DEFAULT 'New Chat' | 대화 제목 |
| `created_at` | INTEGER NOT NULL | 생성 시간 (Unix ms) |
| `updated_at` | INTEGER NOT NULL | 마지막 업데이트 (Unix ms) |

### messages (채팅 메시지)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER PK AUTOINCREMENT | 메시지 ID |
| `conversation_id` | TEXT NOT NULL FK | conversations.id 참조 (CASCADE DELETE) |
| `role` | TEXT NOT NULL | 역할 (user / assistant) |
| `content` | TEXT NOT NULL | 메시지 내용 |
| `sources` | TEXT | RAG 참조 소스 (JSON) |
| `created_at` | INTEGER NOT NULL | 타임스탬프 (Unix ms) |

---

## 11. 자동 동기화 (Auto-Sync)

### 실행

```bash
npm run sync
```

### 동작 방식

```
[scripts/auto-sync.mjs 시작]
       │
       ├── 감시 대상: src/, public/, scripts/, CLAUDE.md
       ├── 무시 대상: .astro, node_modules, dist, data, .git
       │
       ▼
[fs.watch로 파일 변경 감지]
       │
       ├── 변경 발생 → changedFiles Set에 추가
       ├── 30초 디바운스 타이머 리셋
       │
       ▼ (마지막 변경 후 30초 경과)
       │
[gitSync() 실행]
       ├── git status --porcelain -uno (변경 확인)
       ├── git add src/ public/ scripts/ CLAUDE.md package.json astro.config.mjs tsconfig.json .gitignore
       ├── git diff --cached --name-only (staged 파일 목록)
       ├── git commit -m "auto: YYYY-MM-DD HH:MM (N files)"
       └── git push hyunsoo main
```

### 설정

| 항목 | 값 |
|------|-----|
| Remote | `hyunsoo` |
| Branch | `main` |
| Debounce | 30초 (마지막 변경 후) |
| Watch Dirs | src/, public/, scripts/, CLAUDE.md |
| Ignore | .astro, node_modules, dist, data, .git |

### 특이 사항

- `Ctrl+C`로 종료 시 미커밋 변경사항 마지막 동기화 수행
- 커밋 메시지 형식: `auto: 2026-04-08 14:30 (5 files)`

---

## 12. 기술 스택

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
| 이메일 | nodemailer | SMTP (인증 코드 발송) |
| 이미지 처리 | sharp | WebP 변환, preset별 리사이즈 |
| 연락처 DB | Supabase | @supabase/supabase-js (선택, fallback 지원) |
| 인증 | bcryptjs | 비밀번호 해싱 + HttpOnly 세션 쿠키 |
| 입력 검증 | Zod | 4.3.6 (스키마 기반 검증) |
| 스타일링 | Vanilla CSS | Design Tokens (tokens.css) + 반응형 |
| 다국어 | 클라이언트 i18n | 7개 완전 번역 + 20개 프레임워크, RTL 지원 |
| 린팅 | ESLint + Prettier | husky + lint-staged (pre-commit) |
| 테스트 | Vitest + Playwright | 단위 테스트 + E2E/접근성 테스트 |
| 배포 | Docker | Node 22 Alpine |

---

## 13. 환경 변수

### SMTP 설정 (이메일 인증용)

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `SMTP_HOST` | `smtp.acetec-korea.co.kr` | SMTP 서버 호스트 |
| `SMTP_PORT` | `587` | SMTP 포트 (465면 SSL) |
| `SMTP_USER` | (빈 값) | SMTP 계정 |
| `SMTP_PASS` | (빈 값) | SMTP 비밀번호 |
| `SMTP_FROM` | `noreply@acetec-korea.co.kr` | 발신자 이메일 |

> **참고**: `SMTP_USER`와 `SMTP_PASS`가 미설정 시 이메일을 발송하지 않고 콘솔에 인증 코드를 출력합니다 (개발 모드 fallback).

### Supabase 설정 (연락처 폼, 선택)

| 변수 | 설명 |
|------|------|
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_ANON_KEY` | Supabase 익명 키 |

> 미설정 시 연락처 폼은 정상 작동하되 DB 저장은 건너뜁니다.

---



### 즉시 수정 필요 (보안 P0)

1. **세션 쿠키 `Secure` 플래그 추가** — `src/lib/auth.ts`
2. **CSRF 보호 활성화** — `astro.config.mjs`의 `checkOrigin: false` 제거
3. **인증 코드 클라이언트 노출 제거** — `src/pages/api/auth/send-code.ts`의 `devCode` 응답 제거
4. **Admin API role 검증 추가** — `src/pages/api/admin/users.ts`에 admin role 확인


