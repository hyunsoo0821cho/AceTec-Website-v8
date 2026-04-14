# 9. 관리자 대시보드 작동 방식

## 9-1. 접근 제어

- URL: `/admin/dashboard` (SSR, 인증 필수)
- middleware.ts에서 세션 쿠키 검증
- 미인증 시 `/login`으로 리다이렉트

---

## 9-2. 방문자 통계

```
[/admin/dashboard 로드]
       |
       v
[GET /api/admin/stats]
       |
       +-- visitor_logs 테이블 쿼리:
       |   +-- 오늘 고유 IP 수 (COUNT DISTINCT ip WHERE created_at >= 오늘 0시)
       |   +-- 30일 고유 IP 수
       |   +-- 365일 고유 IP 수
       |   +-- 일간 페이지뷰 (COUNT *)
       |   +-- 월간 페이지뷰
       |
       +-- audit_logs 테이블: 최근 30건 활동 로그
       |
       +-- admins 테이블: 역할별 계정 수 (GROUP BY role)
```

---

## 9-3. 사용자 관리

```
[GET /api/admin/users]  -> 전체 사용자 목록 (id, username, role, display_name)

[POST /api/admin/users] -> 사용자 생성
  Body: { username, password, role, display_name }
  -> bcrypt 해시 -> INSERT admins -> audit_logs 기록

[PUT /api/admin/users]  -> 사용자 수정
  Body: { id, username, password?, role, display_name }
  -> password 있으면 bcrypt 해시 -> UPDATE admins -> audit_logs 기록

[DELETE /api/admin/users?id=N] -> 사용자 삭제
  -> sessions 삭제 -> admins 삭제 -> audit_logs 기록
```

---

## 9-4. 역할(Roles) 및 권한

| 역할 | 배지 색상 | 제품 설명 열람 | 관리자 도구 (AdminInline) | 대시보드 접근 | 설명 |
|------|----------|--------------|--------------------------|--------------|------|
| `admin` | 파란색 | 전체 보기 + 편집 | 표시 | 접근 가능 | 최고 관리자. 모든 기능 접근 |
| `sales` | 초록색 | 전체 보기 | 숨김 | 접근 불가 | 영업 담당자 |
| `customer` | 노란색 | 전체 보기 | 숨김 | 접근 불가 | 고객 계정 (승인된 사용자) |
| `person` | 회색 | 잠금 | 숨김 | 접근 불가 | 일반 사용자 (self-register 기본값) |

### 역할별 제품 페이지 동작

- **admin**: 제품 이미지, 이름, 설명(features/specs) 모두 보이며, AdminInline 도구로 인라인 편집 가능
- **customer / sales**: 제품 이미지, 이름, 설명 모두 보이지만 편집 불가. 관리자 도구 숨김
- **person**: 제품 이미지와 이름은 보이지만, **설명(features/specs)은 잠금 처리**. "설명 보기 요청" 버튼으로 열람 권한 요청 가능

### 열람 권한 요청 흐름

```
[person 사용자]                          [관리자 대시보드]
      |                                        |
      +-- 제품 페이지 접속                       |
      |   +-- 설명 대신 잠금 표시                 |
      |                                        |
      +-- "설명 보기 요청" 버튼 클릭              |
      |   +-- POST /api/access-request         |
      |                                        |
      |                    +-------------------+
      |                    | 요청 목록에 표시 (빨간 카운트 배지)
      |                    |                   |
      |                    | [승인] -> person -> customer로 역할 변경
      |                    |                   |  +-- 이후 설명 열람 가능
      |                    | [거절] -> 역할 유지 (person 그대로)
      |                    +-------------------+
```

- 중복 요청 방지: 이미 대기 중(pending)인 요청이 있으면 재요청 불가
- 승인 시 `admins.role`이 `person` -> `customer`로 자동 변경
- 모든 요청/승인/거절 이력은 `audit_logs`에 기록

---

## 9-5. 방문자 로깅

- `src/middleware.ts`에서 모든 HTML 페이지 요청 시 자동 기록
- API 요청(`/api/*`), 내부 요청(`/_*`), 정적 파일(`.` 포함 경로)은 제외
- 기록 데이터: IP (X-Forwarded-For), 경로, User-Agent, 타임스탬프

---

## 9-6. 감사 로깅

| Action | 발생 시점 |
|--------|----------|
| `user_create` | Admin이 사용자를 수동 생성 |
| `user_update` | Admin이 사용자 정보 수정 |
| `user_delete` | Admin이 사용자 삭제 |
| `user_register` | 사용자가 /register에서 자가 등록 |
| `password_reset` | 사용자가 /forgot-password에서 비밀번호 변경 |
| `access_request` | person 사용자가 제품 설명 열람 권한 요청 |
| `access_approve` | Admin이 열람 권한 요청 승인 (person -> customer) |
| `access_reject` | Admin이 열람 권한 요청 거절 |
