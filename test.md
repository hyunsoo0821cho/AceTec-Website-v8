# AceTec 챗봇 RAG 파이프라인 테스트 결과

**테스트 일시**: 2026-04-14  
**테스트 환경**: Windows 11, Node.js v24.14.1, Vitest 4.1.2, Playwright 1.59.1  
**테스트 도구**: ECC (Everything Claude Code) 기반 자동화 테스트

---

## 1. AI 모델 구성

| 용도 | 모델 | 엔진 |
|------|------|------|
| 채팅 생성 | ministral-3:14b | Ollama (localhost:11434) |
| 텍스트 임베딩 | nomic-embed-text-v2-moe | Ollama (localhost:11434) |
| 벡터 저장/검색 | — | Qdrant (localhost:6333) |
| 리랭킹 | jinaai/jina-reranker-v2-base-multilingual | Infinity (localhost:8787) |

---

## 2. RAG 파이프라인

```
[Content JSON 파일들]
       │
       ▼
[scripts/ingest-embeddings.ts]  ← npm run ingest
       │
       ├── 제품 JSON 파싱 (9개 카테고리)
       ├── 페이지 JSON 파싱 (home, solutions, about 등)
       ├── 텍스트 청크 분할
       │
       ▼
[Ollama nomic-embed-text-v2-moe]
       │
       ├── 각 청크 → 768차원 벡터 변환
       │
       ▼
[Qdrant acetec_knowledge 컬렉션]
       │
       └── 벡터 + 메타데이터(title, content, category) 저장
```

---

## 3. 채팅 응답 생성 흐름

```
[사용자 메시지 입력]
       │
       ▼
[POST /api/chat]
       │
       ├── 1. 메시지 임베딩 생성 (nomic-embed-text-v2-moe)
       ├── 2. Qdrant 벡터 검색 (top 20, cosine similarity ≥ 0.15) ← 리랭킹 후보군
       ├── 3. Jina Reranker v2 리랭킹 (top 5 최종 선별, graceful fallback)
       ├── 4. 관련 문서 컨텍스트 구성
       ├── 5. 시스템 프롬프트 + 컨텍스트 + 대화 히스토리(최근 6턴) + 사용자 메시지
       │
       ▼
[Ollama ministral-3:14b]
       │
       ├── temperature: 0.3, max tokens: 800, context: 4096
       ├── 2.5분 타임아웃
       │
       ▼
[AI 응답 + 참조 소스 목록]
       │
       └── 클라이언트에 JSON 반환
```

---

## 4. 인프라 상태 검증

| 서비스 | 엔드포인트 | 상태 | 비고 |
|--------|-----------|------|------|
| Ollama | localhost:11434 | **UP** (200) | ministral-3:14b + nomic-embed |
| Qdrant | localhost:6333 | **UP** (200) | 131 chunks, 10개 카테고리 |
| Reranker (Infinity) | localhost:8787 | **UP** (200) | Docker: jina-reranker |
| AceTec Server | localhost:8080 | **UP** (200) | Astro SSR |
| AceTec Server | 192.168.10.182:8080 | **UP** (200) | 운영 서버 |

### Qdrant 컬렉션 현황 (acetec_knowledge)

| 카테고리 | 문서 수 | 이전(04/14 오전) | 변동 |
|----------|---------|-----------------|------|
| military | 28 | 7 | +21 |
| ipc | 26 | 26 | — |
| telecom | 18 | 13 | +5 |
| radar | 17 | 17 | — |
| sensor | 13 | 7 | +6 |
| industrial | 8 | 8 | — |
| hpc | 7 | 5 | +2 |
| **interconnect** | **6** | **0** | **+6 (신규)** |
| (메타) | 5 | 4 | +1 |
| railway | 3 | 5 | -2 |
| **총계** | **131** | **92** | **+39** |

---

## 5. Vitest 단위/통합/시스템 테스트

```
Test Files  13 passed | 3 failed (16)
Tests       299 passed | 9 failed (308)
Duration    1.22s
```

### 통과 테스트 (13 파일, 299건)

| 영역 | 테스트 파일 | 항목 수 | 결과 |
|------|-----------|---------|------|
| 단위 | sanitize.test.ts | 다수 | PASS |
| 단위 | rate-limiter.test.ts | 다수 | PASS |
| 단위 | vector-store.test.ts | 다수 | PASS |
| 단위 | chat-api-schema.test.ts | 다수 | PASS |
| 단위 | contact-schema.test.ts | 다수 | PASS |
| 단위 | email.test.ts | 다수 | PASS |
| 단위 | db.test.ts | 다수 | PASS |
| 단위 | auth.test.ts | 다수 | PASS |
| 통합 | auth-flow.test.ts | 다수 | PASS |
| 통합 | schema-validation.test.ts | 다수 | PASS |
| 시스템 | architecture.test.ts | 다수 | PASS |
| 시스템 | security.test.ts | 다수 | PASS |
| 시스템 | e2e-live.test.ts | 다수 | PASS |

### 실패 테스트 (3 파일, 9건) — Known Issues

| 테스트 | 실패 항목 | 원인 |
|--------|----------|------|
| content-schema.test.ts | 6건 (military, railway, industrial, telecom, sensor, hpc) | 6개 카테고리 `items[]` 비어있음 (Known Issue) |
| content-completeness.test.ts | 2건 (아이템 수, 카테고리 수) | 동일 원인 — 제품 데이터 미입력 |
| architecture-deep.test.ts | 1건 (API 100줄 제한) | `login.ts` 101줄 (1줄 초과) |

---

## 6. Reranker 정확도 테스트

### 6.1 테스트 설계

- **43개 테스트 쿼리** (9개 카테고리 + 다국어)
- 각 쿼리에 ground-truth 카테고리 라벨 부여
- Qdrant top-20 후보 → 리랭커 top-5 선별 → ground-truth 비교
- **리랭커 서버 상태**: UP (Infinity + Jina v2-base-multilingual)

### 6.2 메트릭 정의

| 메트릭 | 설명 |
|--------|------|
| **Hit@1** | top-1 결과가 정답 카테고리인 비율 |
| **Hit@5** | top-5 내에 정답 카테고리가 하나라도 있는 비율 |
| **MRR@5** | Mean Reciprocal Rank (첫 번째 정답의 역순위 평균) |

### 6.3 전체 결과 (43개 쿼리)

| 모드 | Hit@1 | Hit@5 | MRR@5 | 비고 |
|------|-------|-------|-------|------|
| Vector-only (Qdrant cosine) | 72.1% (31/43) | 93.0% (40/43) | 0.816 | 벡터 유사도만 사용 |
| **Reranked (Jina v2-base)** | **83.7% (36/43)** | **95.3% (41/43)** | **0.891** | **리랭킹 적용** |
| **향상** | **+11.6pp** | **+2.3pp** | **+0.075** | |

### 6.4 이전 vs 현재 비교

| 항목 | 이전 (리랭커 OFF) | 현재 (리랭커 ON) | 변동 |
|------|-------------------|-----------------|------|
| Qdrant 문서 수 | 92 | 131 | +39 |
| Interconnect 데이터 | 0건 | 6건 | **해결** |
| 리랭커 서버 | DOWN | **UP** | **해결** |
| Vector-only Hit@1 | 83.7% | 72.1% | -11.6pp* |
| Reranked Hit@1 | N/A (fallback) | **83.7%** | 신규 |
| Reranked Hit@5 | N/A (fallback) | **95.3%** | 신규 |

> *Vector-only Hit@1 하락 원인: 문서 수 증가(92→131)로 유사도 경쟁 심화. 리랭킹으로 보상됨.

### 6.5 카테고리별 결과

| 카테고리 | 쿼리 수 | Qdrant 문서 수 | Vector Hit@1 | Rerank Hit@1 | 향상 |
|----------|---------|---------------|-------------|-------------|------|
| hpc | 9 | 7 | 67% (6/9) | 78% (7/9) | +1 |
| industrial | 7 | 8 | 86% (6/7) | **100% (7/7)** | +1 |
| military | 5 | 28 | 60% (3/5) | 60% (3/5) | — |
| railway | 5 | 3 | 80% (4/5) | 80% (4/5) | — |
| sensor | 5 | 13 | **100% (5/5)** | **100% (5/5)** | — |
| telecom | 4 | 18 | 50% (2/4) | **100% (4/4)** | **+2** |
| radar | 4 | 17 | 25% (1/4) | 50% (2/4) | +1 |
| **interconnect** | 4 | 6 | **100% (4/4)** | **100% (4/4)** | — |

### 6.6 리랭커 개선 사례 (6건)

| 쿼리 | 기대 카테고리 | Vector top-1 | Rerank top-1 |
|------|-------------|-------------|-------------|
| AI 학습용 서버 | hpc | military ✗ | **hpc ✓** |
| 철도 신호제어 | railway | telecom ✗ | **railway ✓** |
| Wind River VxWorks | industrial | telecom ✗ | **industrial ✓** |
| 고성능 NIC 카드 | telecom | interconnect ✗ | **telecom ✓** |
| UTM 하드웨어 | telecom | hpc ✗ | **telecom ✓** |
| 해양 레이더 추적 | radar | military ✗ | **radar ✓** |

### 6.7 리랭커 회귀 사례 (1건)

| 쿼리 | 기대 | Vector top-1 | Rerank top-1 | 원인 |
|------|------|-------------|-------------|------|
| SIL4 인증 시스템 | railway | railway ✓ | ✗ | 리랭커가 범용 overview 문서에 높은 점수 |

### 6.8 양쪽 모두 실패 (6건)

| 쿼리 | 기대 | 실제 top-1 (Vector/Rerank) | 원인 |
|------|------|---------------------------|------|
| 비디오 가속 플랫폼 | hpc | interconnect / military | HPC에 비디오 가속 전용 문서 부재 |
| One Stop Systems | hpc | industrial / — | OSS 전용 문서 부재, 브랜드명 매칭 한계 |
| FPGA 신호처리 보드 | military | radar / radar | radar에 신호처리 관련 문서가 더 많음 |
| MIL-STD 컴퓨터 | military | hpc / hpc | "MIL-STD"가 HPC overview에도 언급 |
| Cambridge Pixel SPx | radar | military / military | Cambridge Pixel 문서가 military에 배치 |
| Target tracking radar | radar | military / military | 동일 원인 |

---

## 7. E2E 챗봇 API 테스트

| 테스트 | 쿼리 | 응답 시간 | Sources top-1 | 결과 |
|--------|------|----------|--------------|------|
| HPC 검색 | "GPU 서버 뭐가 있어?" | 19,428ms | hpc | **PASS** |
| Railway 검색 | "HIMA 철도 안전 시스템 알려줘" | 18,936ms | railway | **PASS** |
| Interconnect 검색 | "Dolphin MXH532 제품 정보" | 21,184ms | interconnect | **PASS** |
| Telecom 검색 | "네트워크 어플라이언스 방화벽" | 16,893ms | telecom | **PASS** |
| 네비게이션 | "군수항공 제품 페이지로 가줘" | 11,638ms | military | **PASS** ([NAVIGATE:/products/military]) |

> **평균 응답 시간**: 17,616ms (Ollama CPU 추론 기준)

---

## 8. 리랭커 직접 호출 테스트

```
POST http://localhost:8787/rerank
Body: { query: "군수 항공 제품", documents: ["AceTec은 군수항공 분야 제품", "철도 안전 시스템 HIMA"] }

Response (200 OK):
  [0] relevance_score: 0.827 (군수항공) ← 정확
  [1] relevance_score: 0.080 (철도)     ← 낮은 점수

Model: jinaai/jina-reranker-v2-base-multilingual
Latency: < 100ms (Infinity, CPU)
```

---

## 9. 이전 Reranker 모델 비교 (참고)

### 9.1 BGE-reranker-base (TEI 서빙)

| 메트릭 | Vector-only | BGE Reranked |
|--------|-------------|-------------|
| Hit@1 | 83.7% | 67.4% |
| Hit@5 | 90.7% | 86.0% |
| MRR@5 | 0.868 | 0.746 |

> **결론**: 영어 특화 모델 — 한국어 쿼리에서 8건 regression. **부적합**.

### 9.2 Jina v2-base multilingual (ONNX)

| 메트릭 | Vector-only | Jina ONNX |
|--------|-------------|-----------|
| Hit@1 | 83.7% | 83.7% |
| Hit@5 | 90.7% | 88.4% |
| MRR@5 | 0.868 | 0.853 |

> **결론**: ONNX 익스포트에서 Flash Attention 미반영. Hit@1 동일, Hit@5/MRR 소폭 하락. **중립**.

### 9.3 Jina v2-base multilingual (Infinity PyTorch — 현재 프로덕션)

| 메트릭 | Vector-only | **Jina Infinity** |
|--------|-------------|--------------------|
| Hit@1 | 72.1% | **83.7%** (+11.6pp) |
| Hit@5 | 93.0% | **95.3%** (+2.3pp) |
| MRR@5 | 0.816 | **0.891** (+0.075) |

> **결론**: Infinity(PyTorch 추론)에서 **유의미한 성능 향상** 확인. 6건 개선 / 1건 회귀.

---

## 10. 환경변수 설정

```bash
# .env
RERANKER_URL=http://localhost:8787       # Jina Reranker v2 (Infinity)
RERANKER_CANDIDATES=20                    # 1차 벡터 검색 후보 수
```

> `src/lib/reranker.ts`에서 `process.env.RERANKER_URL` 참조. 미설정 시 `http://localhost:8787` 기본값 fallback.  
> 리랭커 서버 미가동 시 Qdrant 벡터 순서로 graceful fallback (3초 타임아웃).

---

## 11. 핵심 발견사항

### RESOLVED (이전 테스트 대비 해결됨)

1. **Reranker 서버 미가동** → Docker `jina-reranker` 컨테이너 가동 확인 (Infinity + PyTorch)
2. **Interconnect 데이터 누락** → Qdrant에 6건 인제스트 완료 (Hit@1=100%)
3. **리랭커 실질적 미사용** → 프로덕션 빌드에 리랭커 코드 포함 확인, Docker 로그 200 OK
4. **.env 미설정** → `RERANKER_URL`, `RERANKER_CANDIDATES` 환경변수 추가

### REMAINING (기존 Known Issues)

1. **6개 카테고리 제품 데이터 비어있음** (military, railway, industrial, telecom, sensor, hpc의 `items[]`)
2. **login.ts 101줄** (API 100줄 제한 1줄 초과)
3. **카테고리 경계 혼동**: radar 문서가 military에 배치 (Cambridge Pixel SPx 등)
4. **Both-fail 6건**: 문서 배치 개선 또는 카테고리 매핑으로 해결 필요

---

## 12. 재현 방법

```bash
# 1. Vitest 테스트 (단위/통합/시스템)
npm run test

# 2. Reranker 정확도 테스트 (Qdrant + Infinity 필요)
node scripts/reranker-accuracy-test.mjs

# 3. Jina ONNX 직접 추론 테스트 (서버 불필요)
python scripts/jina-reranker-test.py

# 4. 결과 JSON
scripts/reranker-accuracy-results.json     # Infinity 결과
scripts/jina-reranker-results.json         # Jina ONNX 결과
```

---

## 13. Docker 컨테이너 현황

| 컨테이너 | 이미지 | 포트 | 상태 |
|----------|--------|------|------|
| jina-reranker | michaelf34/infinity:latest | 0.0.0.0:8787→7997 | Running |
| heuristic_montalcini | qdrant/qdrant | 0.0.0.0:6333-6334→6333-6334 | Running |
