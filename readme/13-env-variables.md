# 13. 환경 변수

## SMTP 설정 (이메일 인증용)

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `SMTP_HOST` | `smtp.acetec-korea.co.kr` | SMTP 서버 호스트 |
| `SMTP_PORT` | `587` | SMTP 포트 (465면 SSL) |
| `SMTP_USER` | (빈 값) | SMTP 계정 |
| `SMTP_PASS` | (빈 값) | SMTP 비밀번호 |
| `SMTP_FROM` | `noreply@acetec-korea.co.kr` | 발신자 이메일 |

> **참고**: `SMTP_USER`와 `SMTP_PASS`가 미설정 시 이메일을 발송하지 않고 콘솔에 인증 코드를 출력합니다 (개발 모드 fallback).

---

## Supabase 설정 (연락처 폼, 선택)

| 변수 | 설명 |
|------|------|
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_ANON_KEY` | Supabase 익명 키 |

> 미설정 시 연락처 폼은 정상 작동하되 DB 저장은 건너뜁니다.
