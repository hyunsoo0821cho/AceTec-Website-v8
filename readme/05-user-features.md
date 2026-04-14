# 5. 사용자 화면 기능

## 5-1. 홈페이지 (`/`)

- **Fullscreen Hero**: 전체 화면 히어로 이미지 + 그라디언트 오버레이, 회사 슬로건 텍스트
- **Solution Cards**: 10개 솔루션 분야 카드 (군용/항공우주, 철도안전, 산업자동화, 통신/네트워크, 센서시뮬레이션, 연구소, 슈퍼컴퓨팅, 레이더, 초고속 인터커넥트, IPC)
- **Featured Products**: 주요 제품 카드 (이미지, 제품명, 특징)
- **Service Plan**: 서비스 플랜 소개 섹션
- **About Section**: 회사 소개 + 이미지 (리사이즈 최적화)
- **Partners**: 파트너사 로고 그리드
- **Contact Form**: 하단 문의 폼 (이름, 이메일, 전화, 메시지)

---

## 5-2. Solutions 페이지 (`/solutions`)

- **10개 솔루션 카드**: 각 카드에 제목, 설명, 이미지, 서브카테고리 목록
- **서브카테고리**: 각 솔루션 아래 세부 분야 목록
- **Admin 인라인 편집**: 로그인 시 텍스트/이미지/서브카테고리 직접 편집, 솔루션 추가/삭제

---

## 5-3. Products 메가 메뉴

- **Hover Dropdown**: Header의 "Products" 메뉴에 마우스 오버 시 전체 너비 드롭다운 표시
- **11개 카테고리 컬럼**: megamenu.json에서 동적 로딩
  - Industrial PCs, Network Appliance, Device Cloud (IoT), Form Factor_Abaco, HIMA Railway, High Performance Computing, High-Speed Data Interconnect, Real-Time Operating System, Sensor Modeling and Simulation, Middleware Software, Radar Processing System
- **서브 아이템**: 각 카테고리 아래 세부 제품/분류 링크
- **Admin 편집**: 메가 메뉴 내용도 Admin CMS에서 편집 가능

---

## 5-4. Applications 페이지 (`/applications`)

- **Accordion 챕터**: 각 응용 분야를 접이식 아코디언으로 표시
- **Lessons/Sections**: 챕터 내 학습 콘텐츠 구조
- **FAQ**: 자주 묻는 질문
- **중앙 정렬 레이아웃**: Hero 제거, 콘텐츠 중심 깔끔한 디자인

---

## 5-5. 언어 전환기 (LangSwitcher)

- **다크 pill 스타일**: `KO` 형태의 작은 다크 버튼
- **20개 언어 프레임워크**: 한국어(ko), 영어(en), 일본어(ja), 아랍어(ar), 프랑스어(fr), 독일어(de), 스페인어(es), 중국어 번체(zh-TW) 등
- **기본값**: ko (한국어)
- **localStorage 저장**: 선택한 언어 기억
- **브라우저 언어 자동 감지**: 첫 방문 시 브라우저 설정 기반 언어 선택
- **RTL 지원**: 아랍어 선택 시 RTL 레이아웃 자동 적용

---

## 5-6. AI 챗봇

- **Floating Pill 버튼**: 하단 중앙에 길쭉한 pill 형태 버튼 ("Ask about our products")
- **Chat Panel**: 클릭 시 확장되는 채팅 패널 (리사이즈 핸들)
- **Gemini 스타일 사이드바**: 좌측 햄버거 메뉴 -> 슬라이드인 사이드바, 대화 히스토리 목록, "New Chat" 버튼
- **RAG 기반 답변**: Qdrant 벡터 검색 -> 관련 문서 컨텍스트 -> Ollama AI 생성
- **문의 플로우**: "Product Inquiry" 버튼 -> 단계별 정보 수집 (제품, 수량, 연락처 등) -> 요약 카드 -> mailto 또는 contact 페이지 리다이렉트
- **한국어 IME 처리**: compositionstart/end 이벤트로 한글 입력 중 Enter 키 전송 방지
- **대화 영속성**: 서버 측 SQLite (conversations + messages 테이블), 클라이언트 localStorage 병행

---

## 5-7. Contact Form

- **mailto 방식**: acetec@acetec-korea.co.kr 로 이메일 발송
- **Supabase 저장**: 환경변수 설정 시 Supabase DB에도 저장 (fallback 지원)
- **Zod 검증**: 입력 데이터 스키마 검증
