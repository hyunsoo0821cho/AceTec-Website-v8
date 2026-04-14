# 6. 관리자 화면 기능

## 6-1. 로그인

- URL: `/login`
- Admin 계정으로 로그인 -> 세션 쿠키 발급 (HttpOnly, 24시간 TTL)
- 로그인 후 이전 페이지로 리다이렉트

---

## 6-2. Admin Bar

- 로그인 상태에서 모든 페이지 상단에 고정 표시
- **Save 버튼**: 현재 페이지의 인라인 편집 내용 저장
- **Dashboard 링크**: `/admin/dashboard`로 이동
- **Logout 버튼**: 세션 삭제 후 로그아웃

---

## 6-3. 인라인 편집 (AdminInline)

| 속성 | 기능 |
|------|------|
| `data-edit="path.to.field"` | 텍스트 인라인 편집. contentEditable로 직접 수정 |
| `data-img="path.to.imageField"` | 이미지 편집. hover 시 Replace 배지 표시, 클릭 시 파일 선택 |
| `data-admin-add="arrayPath"` | 배열에 새 항목 추가 버튼 ("+ Add" 버튼) |
| `data-admin-delete="arrayPath.index"` | 배열에서 특정 항목 삭제 버튼 ("X" 버튼) |
| `data-edit-page="pageName"` | 다른 JSON 파일 편집 지정 (footer.json, megamenu.json 등 다중 페이지 편집) |
| `data-i18n="key"` | Save 시 ko.json 자동 동기화 (i18n 번역 일관성 유지) |

**저장 프로세스**:
1. Admin이 페이지에서 텍스트/이미지 수정
2. Save 버튼 클릭
3. AdminInline이 모든 `data-edit`, `data-img` 요소에서 현재 값 수집
4. `data-edit-page` 속성별로 그룹화하여 각 JSON 파일에 PUT `/api/pages/[page]`
5. `data-i18n` 키가 있는 요소는 ko.json도 자동 업데이트 (`POST /api/i18n/update`)

---

## 6-4. 관리자 대시보드 (`/admin/dashboard`)

**방문자 통계 카드**:
- 오늘 방문자 (고유 IP)
- 월간 방문자 (30일, 고유 IP)
- 연간 방문자 (365일, 고유 IP)
- 일간/월간 페이지뷰

**열람 권한 요청 관리** (Access Requests):
- 대기 중(pending) 요청 수 빨간 배지로 표시
- 요청 목록 테이블: ID, Username, Display Name, Email, Status, 요청일, Actions
- 승인 버튼: person -> customer로 역할 변경, 제품 설명 열람 가능
- 거절 버튼: 역할 유지, 요청 상태만 rejected로 변경

**사용자 관리 테이블**:
- 전체 사용자 목록 (ID, Username, Display Name, Role)
- CRUD: 사용자 생성/수정/삭제
- 역할: Admin, Sales, Customer, Person (색상 코드 배지)
- 모달 폼: 사용자 추가/수정 (username, display name, password, role 선택)

**감사 로그(Audit Logs)**:
- 최근 30건 활동 기록
- 기록 대상: user_create, user_update, user_delete, user_register, password_reset, access_request, access_approve, access_reject

---

## 6-5. 회원가입 시스템 (`/register`)

1. 역할 선택: Admin / Sales / Customer / Person
2. 이메일 입력 -> "인증 코드 발송" 버튼
3. `POST /api/auth/send-code` -> 6자리 코드 생성 (10분 유효) -> 이메일 발송
4. 인증 코드 + Display Name + 비밀번호 입력
5. `POST /api/auth/register` -> 코드 확인 -> 계정 생성
6. audit_logs에 `user_register` 기록

---

## 6-6. 비밀번호 재설정 (`/forgot-password`)

1. 이메일 입력 -> "인증 코드 발송" 버튼
2. `POST /api/auth/send-code` (purpose: reset) -> 6자리 코드 발송
3. 인증 코드 + 새 비밀번호 입력
4. `POST /api/auth/reset-password` -> 코드 확인 -> 비밀번호 변경 -> 기존 세션 삭제
5. audit_logs에 `password_reset` 기록
