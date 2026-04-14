# AceTec Website v8 -- 개요

AceTec (acetronix.co.kr) - 한국 B2B 임베디드 컴퓨팅 & 산업용 기술 솔루션 기업의 마케팅 웹사이트.
Astro 6 기반 하이브리드(SSG + SSR) 구조. 로컬 AI 챗봇(RAG), Admin CMS 인라인 편집, 다국어(7개 언어 완전 번역 + 20개 언어 프레임워크), 회원 관리 시스템 포함.

---

## 최근 테스트 결과 (2026-04-09)

| 항목 | 결과 |
|------|------|
| 기능 테스트 | **94.4%** (253/268) |
| E2E 테스트 | **98.5%** (65/66) |
| 아키텍처 점수 | **66.5/100** (C+) |
| 페이지 로딩 | 21개 중 18개 HTTP 200 |
| API 엔드포인트 | 8개 전체 PASS |
| 이미지 로딩 | 96.5% (109/113) |
| 보안 헤더 | 6개 전체 설정됨 |
| TTFB | 모든 페이지 34ms 이하 |

> 상세 테스트 결과: [test.md](../test.md) 참조

---

## 문서 목록

| # | 파일 | 내용 |
|---|------|------|
| 0 | [00-overview.md](00-overview.md) | 프로젝트 개요 및 문서 목록 (이 파일) |
| 1 | [01-project-overview.md](01-project-overview.md) | 프로젝트 개요 |
| 2 | [02-getting-started.md](02-getting-started.md) | 실행 방법 |
| 3 | [03-commands.md](03-commands.md) | 전체 명령어 |
| 4 | [04-project-structure.md](04-project-structure.md) | 프로젝트 파일 구조 |
| 5 | [05-user-features.md](05-user-features.md) | 사용자 화면 기능 |
| 6 | [06-admin-features.md](06-admin-features.md) | 관리자 화면 기능 |
| 7 | [07-chatbot.md](07-chatbot.md) | 챗봇 실행 과정 |
| 8 | [08-image-upload.md](08-image-upload.md) | 이미지 업로드 & 저장 과정 |
| 9 | [09-admin-dashboard.md](09-admin-dashboard.md) | 관리자 대시보드 작동 방식 |
| 10 | [10-db-schema.md](10-db-schema.md) | DB 스키마 |
| 11 | [11-auto-sync.md](11-auto-sync.md) | 자동 동기화 |
| 12 | [12-tech-stack.md](12-tech-stack.md) | 기술 스택 |
| 13 | [13-env-variables.md](13-env-variables.md) | 환경 변수 |
| 14 | [14-architecture-score.md](14-architecture-score.md) | 아키텍처 점수 요약 |
| 15 | [15-known-issues.md](15-known-issues.md) | 알려진 이슈 |
