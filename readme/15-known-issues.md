# 15. 알려진 이슈

## 전체 이슈 목록

| # | 이슈 | 심각도 | 상태 | 비고 |
|---|------|--------|------|------|
| 1 | `/images/partners/` 4개 파일 누락 (rti, oktalse, cambridge-pixel, pentek) | LOW | 해결됨 | `/uploads/partners/`로 대체 |
| 2 | `/cart` 페이지 404 (e-commerce 미구현) | LOW | 알려진 이슈 | UI 스텁 |
| 3 | Rate limiter 인메모리 (서버 재시작시 초기화) | MEDIUM | 의도된 동작 | Redis 전환 시 해결 |
| 4 | military-radar 16개 제품 100% 중복 | HIGH | 미해결 | 콘텐츠 정리 필요 |
| 5 | industrial 페이지 고유 이미지 3개뿐 (10개 제품) | HIGH | 미해결 | 이미지 추가 필요 |
| 6 | ipc 페이지 고유 이미지 17개 (25개 제품) | MEDIUM | 미해결 | 이미지 추가 필요 |
| 7 | "ACE-Sever" 오타 (telecom, ipc) | MEDIUM | 미해결 | "Server"로 수정 필요 |
| 8 | `lang="en"` 속성이나 콘텐츠 한국어 | MEDIUM | 미해결 | `lang="ko"` 또는 동적 전환 |
| 9 | canonical URL 모든 페이지 동일 | MEDIUM | 미해결 | 페이지별 canonical 설정 필요 |
| 10 | Login API rate limiting 없음 | HIGH | 미해결 | 브루트포스 방어 추가 필요 |
| 11 | Applications 레슨 항목 클릭 미구현 | MEDIUM | 미해결 | role="button"이지만 동작 없음 |

---

## 심각도별 분류

### HIGH (즉시 대응)

- **#4**: military-radar 제품 중복 -> 콘텐츠 JSON 정리 또는 radar 페이지를 military의 섹션으로 통합
- **#5**: industrial 이미지 부족 -> 각 제품별 고유 이미지 추가
- **#10**: Login rate limiting -> `src/lib/rate-limiter.ts` 적용

### MEDIUM (개선 권장)

- **#6**: ipc 이미지 부족
- **#7**: "ACE-Sever" 오타 -> catalog.json, ipc.json, telecom.json에서 수정
- **#8**: HTML lang 속성 -> LangSwitcher와 연동하여 동적 변경
- **#9**: canonical URL -> 각 페이지 Base.astro에서 동적 설정
- **#11**: Applications 레슨 클릭 -> 이벤트 핸들러 구현 또는 role="button" 제거

### LOW (참고)

- **#1**: 파트너 이미지 -> 이미 대체됨, `/images/partners/` 코드 참조 정리만 필요
- **#2**: /cart 페이지 -> e-commerce 구현 계획 없으면 nav에서 링크 제거
- **#3**: Rate limiter -> 현재 트래픽 수준에서는 문제없음

---

> 상세 테스트 결과: [test.md](../test.md) 참조
