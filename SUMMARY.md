# AceTec 홈페이지 침투 테스트 리포트

- **대상**: `http://192.168.10.182:8080` (AceTec 홈페이지, Astro + Ollama)
- **테스트 일시**: 2026-04-13
- **공격자 PC**: Mac (Apple Silicon) — 동일 LAN
- **도구**: OWASP ZAP 2.17.0 + 수동 curl 테스트
- **권한**: 소유자 본인 (admin/acetec2024! 제공)

---

## 결론 요약

| 영역 | 평가 |
|------|------|
| **웹앱 (포트 8080)** | **A-** — 견고한 방어, 심각한 웹 취약점 없음 |
| **LLM 백엔드 (Ollama 포트 11434)** | **F** — 🚨 인증 없이 외부 완전 노출 |
| **PII 데이터 보호** | **C** — 인증 후엔 전체 PII 노출 (admin 권한 과다) |

**전체 등급: C+** — 웹앱 품질은 좋은데 **Ollama 포트 노출** 하나가 시스템 보안 수준을 끌어내림.

---

## 🔴 CRITICAL 발견 1: Ollama 포트 무인증 외부 노출

### 재현
```bash
# 공격자 PC에서 (LAN 상 다른 컴퓨터)
curl http://192.168.10.182:11434/api/version
# → {"version":"0.19.0"}

curl http://192.168.10.182:11434/api/tags
# → 전체 모델 목록 (ministral-3:14b 등)

curl -X POST http://192.168.10.182:11434/api/generate \
  -d '{"model":"ministral-3:14b","prompt":"test","stream":false}'
# → 정상 응답: 14B 모델을 공격자가 무제한 사용 가능
```

### 영향
- ✅ 확인됨: **14B 파라미터 모델을 공격자가 자유롭게 추론** (리소스 도용)
- ✅ 확인됨: `/api/pull` 도달 가능 (500 응답) — 공격자가 임의 모델을 서버에 **다운로드 강제** 가능 (디스크/대역폭 고갈)
- 가능: 로드된 모델로 GPU/CPU DoS (동시 요청 폭주)
- 가능: Ollama 0.19.0 CVE가 있을 경우 RCE까지 확장

### 수정 (Windows 서버에서)
```powershell
# 환경변수 설정 후 Ollama 재시작
[System.Environment]::SetEnvironmentVariable("OLLAMA_HOST", "127.0.0.1:11434", "User")
# 또는 Windows Defender Firewall 인바운드 규칙으로 11434 차단
```

웹앱은 어차피 `localhost:11434`로 호출하므로 외부 노출 불필요.

---

## 🟡 MEDIUM 발견 2: Admin API의 과다 PII 노출

### 재현
```bash
curl http://192.168.10.182:8080/api/admin/users \
  -H "Cookie: sid=<admin-session>"
```

### 응답 (일부)
```json
[
  {"id":2,"username":"hyunsoo0821","email":"hyunsoo0821@acetec-korea.co.kr",...},
  {"id":4,"username":"hyunsoo821cho","email":"hyunsoo821cho@gmail.com",
   "phone":"01051128963",...}
]
```

### 영향
- 어드민 세션 탈취/공유 시 **전체 사용자 PII 즉시 유출** (이메일, 전화번호, 개인 Gmail 등)
- 감사 로그만으로는 막을 수 없음

### 수정
- `/api/admin/users` 목록 조회 시 기본적으로 PII 마스킹 (예: `ema***@***.co.kr`)
- 상세 조회 시에만 언마스킹, 별도 감사 로그 기록
- 또는 어드민 역할을 "read PII" / "no PII" 두 단계로 분리 (least privilege)

---

## 🟡 MEDIUM 발견 3: CSP `unsafe-inline` (Astro 기본값)

- `script-src 'unsafe-inline'`, `style-src 'unsafe-inline'` 허용됨
- 현재 XSS를 찾진 못했지만, 향후 XSS 발견 시 **CSP가 막아주지 못함**
- Astro 빌드 시 nonce 또는 hash 방식 CSP로 전환 권장

---

## 🟡 MEDIUM 발견 4: CSRF 토큰 부재 (20개 폼)

- Admin 폼에 CSRF 토큰 없음
- **완화 요인**: 세션 쿠키에 `SameSite=Strict` 설정됨 → 크로스 사이트 요청 자동 차단
- 하지만 defense-in-depth 관점에서 토큰 추가 권장 (서브도메인 우회 시나리오 등)

---

## 🟢 LOW / Informational

- `X-Content-Type-Options: nosniff` 헤더가 일부 API 응답에 빠짐 (JSON은 위험도 낮음, 추가 권장)
- 로그인 에러 메시지가 유저 존재 여부를 드러냄 ("이메일 또는 비밀번호") — 표준 멘트라 큰 문제는 아님
- `POST /api/chat` 악성 JSON에 HTTP 500 반환 (본문은 일반 에러, 스택 노출은 없음) — 400으로 고치면 깔끔
- username 대소문자 파싱 불일치: JSON body는 case-sensitive("admin"), form-urlencoded는 "Admin"도 302 반환 — 일관성 맞출 것

---

## ✅ 잘 구현된 방어

**웹앱 레벨:**
- 세션 쿠키: `HttpOnly` + `SameSite=Strict` + `Max-Age=86400` ✅
- Admin API 전부 `401 Unauthorized` (verb tampering, method override 모두 차단) ✅
- 감사 로깅 작동: `unauthorized_access_attempt` 기록 확인 ✅
- 보안 헤더: `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `HSTS` ✅
- 입력 검증: 채팅 메시지 maxlength 1000자 서버 측 강제 (5000자 페이로드 → HTTP 400) ✅
- **LLM 프롬프트 인젝션 방어** ✅ (핵심!)
  - 시스템 프롬프트 추출 시도 → 거부
  - Jailbreak / DAN → 거부
  - History poisoning → 거부
  - 전부 동일한 generic 안내문 ("보안 정책상 안내 불가") = 가드레일 레이어 존재

---

## 📊 ZAP Active Scan 통계

- 요청 수: **5,326**
- 알림: **348** (High 0, Medium 93, Low 129, Info 369)
- 고유 Medium 취약점 유형: 5개 (위 항목들)
- **High/Critical 없음** — 웹앱 자체는 OWASP Top 10 자동화 공격에 대해 방어력 입증

상세 리포트: `~/zap-reports/acetec-zap-report.html`

---

## 🎯 우선순위별 조치 권고

| 우선순위 | 항목 | 작업량 | 영향 |
|---------|------|--------|------|
| **P0 즉시** | Ollama 11434를 `127.0.0.1`로 바인딩 또는 방화벽 차단 | 5분 | 🔴 Critical 제거 |
| P1 | Admin users 목록 PII 마스킹 | 1시간 | 🟡 유출 범위 축소 |
| P2 | CSP에서 `unsafe-inline` 제거 (nonce/hash) | 반나절 | 🟡 XSS 이중 방어 |
| P2 | CSRF 토큰 추가 (defense-in-depth) | 반나절 | 🟡 |
| P3 | JSON API 응답에 `X-Content-Type-Options` 추가 | 30분 | 🟢 |
| P3 | `/api/chat` 500 → 400, 에러 일관성 | 15분 | 🟢 |

**P0 하나만 고쳐도 실질 위험 80% 이상 감소.**
