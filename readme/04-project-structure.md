# 4. 프로젝트 파일 구조

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
│   ├── ingest-embeddings.ts   # RAG 지식베이스 빌더 (Ollama -> Qdrant)
│   ├── ensure-ollama.mjs      # dev 서버 시작 전 Ollama 상태 확인
│   ├── extract-catalog.mjs    # HTML -> JSON 카탈로그 추출
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

---

## src/layouts/

| 파일 | 기능 |
|------|------|
| `Base.astro` | 마스터 레이아웃. 모든 페이지의 공통 구조 (head, header, footer, chat widget, 모바일 메뉴, back-to-top, toast, 폼 검증, 스크롤 이벤트) |

---

## src/components/

| 파일 | 기능 |
|------|------|
| `Header.astro` | 고정 네비게이션 바. 이미지 로고, 메뉴 링크, Products 메가 메뉴(hover dropdown), Inquiry 버튼, 언어 전환기(LangSwitcher), 햄버거 메뉴 |
| `MobileMenu.astro` | 모바일 전체화면 메뉴. 768px 이하에서 표시, 포커스 트랩 지원 |
| `Footer.astro` | 사이트 푸터. 회사 소개, 솔루션/회사/파트너 링크, 연락처 정보, 저작권. Admin 인라인 편집 지원 (data-edit-page="footer") |
| `ChatWidget.astro` | AI 챗봇 위젯. 하단 floating pill 버튼 -> 확장형 채팅 패널, Gemini 스타일 사이드바 히스토리, 문의 플로우, 한국어 IME 처리 |
| `ContactForm.astro` | 문의 폼 컴포넌트. 이름/이메일/전화/메시지 필드, Zod 검증 |
| `ProductGrid.astro` | 제품 카드 그리드. 카테고리별 제품 목록 표시, 배지(SIL4/NEW), Admin CMS 전체 기능 (섹션/제품 추가/삭제, 인라인 편집, 이미지 Replace) |
| `AdminInline.astro` | Admin CMS 인라인 편집 오버레이. data-edit(텍스트), data-img(이미지), data-admin-add/delete(배열), data-edit-page(다중 페이지), i18n 자동 동기화 |
| `AdminBar.astro` | Admin 상단 고정 바. Save 버튼, Dashboard 링크, Logout 버튼 |
| `BackToTop.astro` | 맨 위로 스크롤 버튼. 스크롤 500px 이상 시 표시 |
| `HistoryYearGroup.astro` | 연혁 페이지 연도별 그룹 컴포넌트. 타임라인 표시 |
| `LangSwitcher.astro` | 언어 전환 드롭다운. 다크 pill 스타일, 20개 언어, 기본 ko, localStorage 저장 |

---

## src/pages/ (라우팅)

| 파일 | URL | 렌더링 | 기능 |
|------|-----|--------|------|
| `index.astro` | `/` | SSR | 홈페이지. Fullscreen hero(gradient overlay), Solution cards, Featured Products, Service Plan, About, Partners, Contact Form |
| `solutions.astro` | `/solutions` | SSR | 솔루션 소개. 10개 솔루션 카드 + 서브카테고리, Admin 인라인 편집 |
| `applications.astro` | `/applications` | SSR | 응용 분야. Accordion 챕터(lessons/sections/FAQ), 중앙 정렬 레이아웃 |
| `about.astro` | `/about` | SSR | 회사 소개 (CEO 인사말, 경영이념, 기업문화) |
| `history.astro` | `/history` | SSR | 회사 연혁 타임라인 (기간별 탭, HistoryYearGroup 컴포넌트) |
| `contact.astro` | `/contact` | SSR | 문의 페이지 (ContactForm, 본사/포항지사 정보, 지도) |
| `login.astro` | `/login` | SSR | 로그인 페이지 (Admin + 일반 사용자) |
| `register.astro` | `/register` | SSR | 회원가입 (역할 선택 -> 이메일 인증 -> 계정 생성) |
| `forgot-password.astro` | `/forgot-password` | SSR | 비밀번호 재설정 (이메일 인증 -> 새 비밀번호) |
| `catalog.astro` | `/catalog` | SSR | 전체 제품 카탈로그 (JSON 기반 CMS 편집) |
| `products/[category].astro` | `/products/:category` | SSR | 카테고리별 제품 페이지 (military, railway, industrial, telecom, sensor, hpc, ipc, radar, interconnect) |
| `products-intro.astro` | `/products-intro` | SSR | 제품 소개 페이지 |
| `careers.astro` | `/careers` | SSR | 채용 정보 |
| `news.astro` | `/news` | SSR | 뉴스 |
| `training.astro` | `/training` | SSR | 교육 |
| `admin/dashboard.astro` | `/admin/dashboard` | SSR | 관리자 대시보드 (방문자 통계, 사용자 관리, 감사 로그) |
| `404.astro` | 404 | SSG | 404 에러 페이지 |

---

## src/pages/api/ (REST API)

| 파일 | 메서드 | URL | 기능 |
|------|--------|-----|------|
| `auth/login.ts` | POST | `/api/auth/login` | 로그인. username/password -> bcrypt 검증 -> 세션 쿠키 발급 |
| `auth/logout.ts` | POST | `/api/auth/logout` | 로그아웃. 세션 삭제, 쿠키 만료 |
| `auth/send-code.ts` | POST | `/api/auth/send-code` | 인증 코드 발송. email + purpose(register/reset) -> 6자리 코드 생성 -> 이메일 발송 (10분 유효) |
| `auth/register.ts` | POST | `/api/auth/register` | 회원가입. email + code + password -> 인증 코드 확인 -> 계정 생성 |
| `auth/reset-password.ts` | POST | `/api/auth/reset-password` | 비밀번호 재설정. email + code + newPassword -> 인증 코드 확인 -> 비밀번호 변경 |
| `chat.ts` | POST | `/api/chat` | AI 챗봇. 사용자 메시지 -> RAG 검색(Qdrant) -> Ollama 생성 -> 응답 |
| `contact.ts` | POST | `/api/contact` | 문의 폼 제출. Zod 검증 -> Supabase 저장 (선택) |
| `health.ts` | GET | `/api/health` | 서버 상태 확인. DB, AI(Ollama) 연결 상태 체크 |
| `images/upload.ts` | POST | `/api/images/upload` | 이미지 업로드. sharp로 preset별 리사이즈 + WebP 변환 -> public/uploads/ 저장 |
| `pages/[page].ts` | GET/PUT | `/api/pages/:page` | CMS 페이지 콘텐츠 읽기/수정. JSON 파일 직접 편집 |
| `i18n/update.ts` | POST | `/api/i18n/update` | i18n 번역 파일 업데이트. Admin 저장 시 ko.json 자동 동기화 |
| `conversations.ts` | GET/POST | `/api/conversations` | 채팅 대화 관리. 방문자별 대화 목록 조회/생성 |
| `messages.ts` | GET | `/api/messages` | 채팅 메시지 조회. 대화별 메시지 목록 |
| `admin/stats.ts` | GET | `/api/admin/stats` | 관리자 통계. 방문자 수(일/월/년), 페이지뷰, 감사 로그, 역할별 계정 수 |
| `admin/users.ts` | GET/POST/PUT/DELETE | `/api/admin/users` | 사용자 관리. 목록 조회, 생성, 수정, 삭제 (감사 로그 자동 기록) |
| `access-request.ts` | POST | `/api/access-request` | person 사용자가 제품 설명 열람 권한 요청. 중복 요청 방지 |
| `admin/access-requests.ts` | GET/POST | `/api/admin/access-requests` | 관리자 열람 권한 요청 관리. GET: 요청 목록 조회, POST: 승인/거절 |

---

## src/lib/ (비즈니스 로직)

| 파일 | 기능 |
|------|------|
| `auth.ts` | 인증 시스템. bcrypt 비밀번호 검증(username/email 지원), UUID 세션 생성/검증/삭제, HttpOnly 쿠키 관리, getUserInfo()로 역할 조회. TTL 24시간 |
| `db.ts` | SQLite 연결 관리. better-sqlite3로 data/acetec.db 싱글턴 연결. 8개 테이블 자동 생성 (admins, sessions, visitor_logs, audit_logs, verification_codes, access_requests, conversations, messages) |
| `email.ts` | 이메일 발송. nodemailer SMTP 트랜스포터, 6자리 인증 코드 생성, HTML 이메일 템플릿 (회원가입/비밀번호 재설정), SMTP 미설정 시 콘솔 출력 fallback |
| `chat.ts` | Ollama 채팅. ministral-3:14b 모델로 AI 응답 생성, RAG 컨텍스트 주입, 시스템 프롬프트(AceTec 전용), 다국어 자동 감지 |
| `embeddings.ts` | Ollama 임베딩. nomic-embed-text-v2-moe 모델로 텍스트 -> 768차원 벡터 변환 |
| `rag.ts` | RAG 검색 오케스트레이터. 사용자 질문 -> 임베딩 생성 -> Qdrant 벡터 검색 -> 관련 문서 추출 (top 5, 유사도 0.3 이상) |
| `vector-store.ts` | Qdrant 벡터 저장소. acetec_knowledge 컬렉션, Cosine 유사도 검색, 문서 업서트(100개 배치), 컬렉션 자동 생성 |
| `image.ts` | 이미지 처리. sharp 라이브러리로 preset별 리사이즈(hero/service/product/plan/partner/about/misc), WebP 82% 품질 |
| `rate-limiter.ts` | IP 기반 속도 제한. 인메모리 방식 (서버 재시작 시 초기화) |
| `sanitize.ts` | 입력 살균. HTML 태그 제거, 문자열 길이 제한 |
| `supabase.ts` | Supabase 클라이언트. 연락처 폼 데이터 저장 (환경변수 미설정 시 graceful fallback) |

---

## src/content/ (콘텐츠 데이터)

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

---

## src/i18n/ (다국어)

| 파일 | 기능 |
|------|------|
| `index.ts` | 다국어 시스템 코어. 20개 언어 프레임워크, localStorage 기반 전환, 브라우저 언어 자동 감지, `data-i18n` 속성 DOM 번역, RTL(아랍어) 지원 |
| `ko.json` | 한국어 번역 (완전) |
| `en.json` | 영어 번역 (완전) |
| `ja.json` | 일본어 번역 (완전) |
| `ar.json` | 아랍어 번역 (완전, RTL) |
| `fr.json` | 프랑스어 번역 (완전) |
| `de.json` | 독일어 번역 (완전) |
| `es.json` | 스페인어 번역 (완전) |

---

## src/styles/ (디자인 시스템)

| 파일 | 기능 |
|------|------|
| `tokens.css` | 디자인 토큰 (CSS 변수). 색상, 타이포그래피, 간격, 반경, 그림자, z-index 등 모든 디자인 값의 단일 소스 |
| `global.css` | 글로벌 스타일. CSS 리셋, 버튼, 폼, 토스트, 유틸리티 클래스, 반응형 (1024/768/480px) |
| `fonts.css` | Self-hosted Roboto 폰트 (woff2 variable, Latin) |

---

## src/middleware.ts

| 기능 | 설명 |
|------|------|
| 방문자 로깅 | 모든 HTML 페이지 요청 시 IP, 경로, User-Agent, 타임스탬프를 visitor_logs 테이블에 기록 |
| 보안 헤더 | X-Frame-Options(DENY), X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS, CSP |
