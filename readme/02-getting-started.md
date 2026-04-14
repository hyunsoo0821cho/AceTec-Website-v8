# 2. 실행 방법

## 2-1. 사전 요구사항

| 항목 | 버전 | 필수 |
|------|------|------|
| Node.js | >= 22.12.0 | 필수 |
| npm | >= 10 | 필수 |
| Ollama | 최신 | AI 챗봇용 (선택) |
| Qdrant | 최신 | 벡터 검색용 (선택) |

## 2-2. 의존성 설치

```bash
npm install
```

> Windows에서 `better-sqlite3` 에러 발생 시:
> ```bash
> npm rebuild better-sqlite3
> ```

## 2-3. 개발 서버 실행

```bash
# 기본 (localhost:4321)
npm run dev

# 네트워크 접속 허용 + 포트 지정
npx astro dev --host 0.0.0.0 --port 8080
```

브라우저에서 `http://localhost:4321` 또는 `http://<본인IP>:8080` 으로 접속.

## 2-4. Admin 계정 생성 (최초 1회)

```bash
node -e "
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'acetec.db'));
db.pragma('journal_mode = WAL');
db.exec('CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL);');
db.exec('CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, admin_id INTEGER NOT NULL, expires_at INTEGER NOT NULL, FOREIGN KEY (admin_id) REFERENCES admins(id));');
const hash = bcrypt.hashSync('acetec2024', 10);
db.prepare('INSERT OR REPLACE INTO admins (id, username, password_hash) VALUES (1, ?, ?)').run('admin', hash);
console.log('Admin account created: admin / acetec2024');
db.close();
"
```

또는 `/register` 페이지에서 이메일 인증 후 직접 회원가입 가능.

## 2-5. AI 챗봇 설정 (선택)

```bash
# 1) Ollama 설치 후 모델 다운로드
ollama pull ministral-3:14b          # 채팅 모델
ollama pull nomic-embed-text-v2-moe  # 임베딩 모델

# 2) Qdrant 벡터 DB 실행
docker run -p 6333:6333 qdrant/qdrant

# 3) RAG 지식베이스 구축
npm run ingest
```

## 2-6. 프로덕션 빌드 & 배포

```bash
npm run build        # ./dist/ 에 빌드
npm run preview      # 빌드 결과 미리보기

# Docker 배포
docker build -t acetec-web .
docker run -p 4321:4321 acetec-web
```
