# 7. 챗봇 실행 과정 (상세)

## 7-1. AI 모델 구성

| 용도 | 모델 | 엔진 |
|------|------|------|
| 채팅 생성 | ministral-3:14b | Ollama (localhost:11434) |
| 텍스트 임베딩 | nomic-embed-text-v2-moe | Ollama (localhost:11434) |
| 벡터 저장/검색 | - | Qdrant (localhost:6333) |

---

## 7-2. RAG 파이프라인

```
[Content JSON 파일들]
       |
       v
[scripts/ingest-embeddings.ts]  <-- npm run ingest
       |
       +-- 제품 JSON 파싱 (9개 카테고리)
       +-- 페이지 JSON 파싱 (home, solutions, about 등)
       +-- 텍스트 청크 분할
       |
       v
[Ollama nomic-embed-text-v2-moe]
       |
       +-- 각 청크 -> 768차원 벡터 변환
       |
       v
[Qdrant acetec_knowledge 컬렉션]
       |
       +-- 벡터 + 메타데이터(title, content, category) 저장
```

---

## 7-3. 채팅 응답 생성 흐름

```
[사용자 메시지 입력]
       |
       v
[POST /api/chat]
       |
       +-- 1. 메시지 임베딩 생성 (nomic-embed-text-v2-moe)
       +-- 2. Qdrant 벡터 검색 (top 5, cosine similarity >= 0.3)
       +-- 3. 관련 문서 컨텍스트 구성
       +-- 4. 시스템 프롬프트 + 컨텍스트 + 대화 히스토리(최근 6턴) + 사용자 메시지
       |
       v
[Ollama ministral-3:14b]
       |
       +-- temperature: 0.3, max tokens: 300
       +-- 2.5분 타임아웃
       |
       v
[AI 응답 + 참조 소스 목록]
       |
       +-- 클라이언트에 JSON 반환
```

---

## 7-4. 지식베이스 구축

```bash
npm run ingest
```

- `scripts/ingest-embeddings.ts` 실행
- `src/content/products/*.json`의 모든 제품 데이터 파싱
- `src/content/pages/*.json`의 페이지 콘텐츠 파싱
- 각 데이터를 텍스트 청크로 분할
- Ollama로 각 청크의 768차원 임베딩 벡터 생성
- Qdrant `acetec_knowledge` 컬렉션에 100개씩 배치 업서트

---

## 7-5. Chat UI 기능

- **Pill 버튼**: 하단 중앙 floating pill. 클릭 시 패널 확장
- **리사이즈 핸들**: 채팅 패널 상단 드래그로 높이 조절
- **한국어 IME 처리**: `compositionstart`/`compositionend` 이벤트로 한글 조합 중 Enter 키 전송 방지
- **대화 히스토리**: 서버 SQLite(conversations/messages 테이블) + 클라이언트 localStorage 병행
- **Gemini 스타일 사이드바**: 좌측 햄버거 메뉴 클릭 -> 슬라이드인 오버레이, 이전 대화 목록, "New Chat" 버튼
- **New Chat**: 현재 대화 저장 후 새 대화 시작

---

## 7-6. 문의 플로우 (Inquiry Flow)

1. 환영 메시지의 "Product Inquiry" 버튼 클릭
2. 챗봇이 단계별로 정보 수집:
   - 관심 제품/분야
   - 수량/규모
   - 연락처 정보 (이름, 이메일, 전화)
   - 추가 요구사항
3. 수집 완료 시 **요약 카드 UI** 표시 (모든 입력 정보 정리)
4. "이메일 보내기" -> mailto:acetec@acetec-korea.co.kr 또는 Contact 페이지 리다이렉트
