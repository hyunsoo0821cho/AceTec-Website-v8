# 10. DB 스키마

SQLite 데이터베이스: `data/acetec.db` (better-sqlite3, WAL 모드)

---

## admins (사용자 계정)

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

---

## sessions (로그인 세션)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | TEXT PK | UUID 세션 ID (HttpOnly 쿠키) |
| `admin_id` | INTEGER NOT NULL FK | admins.id 참조 |
| `expires_at` | INTEGER NOT NULL | 만료 시간 (Unix ms, 24시간) |

---

## verification_codes (이메일 인증 코드)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER PK AUTOINCREMENT | 코드 ID |
| `email` | TEXT NOT NULL | 수신 이메일 |
| `code` | TEXT NOT NULL | 6자리 인증 코드 |
| `purpose` | TEXT NOT NULL | 용도 (register / reset) |
| `role` | TEXT | 회원가입 시 선택한 역할 |
| `expires_at` | INTEGER NOT NULL | 만료 시간 (Unix ms, 10분) |
| `used` | INTEGER NOT NULL DEFAULT 0 | 사용 여부 (0/1) |

---

## visitor_logs (방문자 기록)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER PK AUTOINCREMENT | 로그 ID |
| `ip` | TEXT | 방문자 IP (X-Forwarded-For) |
| `path` | TEXT | 요청 경로 |
| `user_agent` | TEXT | 브라우저 User-Agent |
| `created_at` | INTEGER NOT NULL | 타임스탬프 (Unix ms) |

---

## audit_logs (감사 로그)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER PK AUTOINCREMENT | 로그 ID |
| `admin_id` | INTEGER | 수행한 관리자 ID (null 가능) |
| `action` | TEXT NOT NULL | 작업 유형 (user_create, user_update 등) |
| `detail` | TEXT | 상세 내용 |
| `created_at` | INTEGER NOT NULL | 타임스탬프 (Unix ms) |

---

## access_requests (열람 권한 요청)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER PK AUTOINCREMENT | 요청 ID |
| `user_id` | INTEGER NOT NULL FK | admins.id 참조 (요청한 사용자) |
| `status` | TEXT NOT NULL DEFAULT 'pending' | 상태 (pending / approved / rejected) |
| `created_at` | INTEGER NOT NULL | 요청 시간 (Unix ms) |
| `resolved_at` | INTEGER | 처리 시간 (Unix ms) |
| `resolved_by` | INTEGER FK | admins.id 참조 (처리한 관리자) |

---

## conversations (채팅 대화)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | TEXT PK | 대화 UUID |
| `visitor_id` | TEXT NOT NULL | 방문자 식별자 |
| `title` | TEXT NOT NULL DEFAULT 'New Chat' | 대화 제목 |
| `created_at` | INTEGER NOT NULL | 생성 시간 (Unix ms) |
| `updated_at` | INTEGER NOT NULL | 마지막 업데이트 (Unix ms) |

---

## messages (채팅 메시지)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER PK AUTOINCREMENT | 메시지 ID |
| `conversation_id` | TEXT NOT NULL FK | conversations.id 참조 (CASCADE DELETE) |
| `role` | TEXT NOT NULL | 역할 (user / assistant) |
| `content` | TEXT NOT NULL | 메시지 내용 |
| `sources` | TEXT | RAG 참조 소스 (JSON) |
| `created_at` | INTEGER NOT NULL | 타임스탬프 (Unix ms) |
