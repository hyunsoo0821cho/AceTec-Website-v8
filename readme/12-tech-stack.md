# 12. 기술 스택

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
