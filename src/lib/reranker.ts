// 온프레미스 Jina Reranker v2 (Base Multilingual) Fast Reranker
// 서빙: Infinity 또는 HuggingFace TEI로 로컬 배포
//
// [Infinity 예시]
//   docker run -p 8787:7997 michaelfeil/infinity:latest \
//     v2 --model-id jinaai/jina-reranker-v2-base-multilingual --port 7997
//
// [TEI 예시]
//   docker run -p 8787:80 ghcr.io/huggingface/text-embeddings-inference:latest \
//     --model-id jinaai/jina-reranker-v2-base-multilingual

const RERANKER_URL = process.env.RERANKER_URL || 'http://localhost:8787';
const RERANKER_MODEL = 'jinaai/jina-reranker-v2-base-multilingual';

// Fast Reranker 타임아웃 — 로컬 모델이므로 짧게 (3초)
const RERANKER_TIMEOUT_MS = 3_000;

// 최소 relevance score (이하 필터링)
const MIN_RELEVANCE_SCORE = 0.01;

interface RerankResult {
  index: number;
  relevance_score: number;
}

interface InfinityResponse {
  results: RerankResult[];
}

// TEI 응답 형식
interface TeiResult {
  index: number;
  score: number;
}

/**
 * Jina Reranker v2 (Base Multilingual) — 로컬 리랭킹
 * 쿼리와 20개의 문서를 비교하여 재점수화, 가장 관련성 높은 상위 topN개만 최종 선별
 * 16GB VRAM 효율을 위해 가벼운 v2-base 모델 사용
 * 리랭커 서버 미가동 시 원본 벡터 유사도 순서 유지 (graceful fallback)
 */
export async function rerankDocuments<T extends { content: string }>(
  query: string,
  documents: T[],
  topN = 5,
): Promise<T[]> {
  if (documents.length === 0) return [];
  if (documents.length <= topN) return documents;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RERANKER_TIMEOUT_MS);

    const res = await fetch(`${RERANKER_URL}/rerank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: RERANKER_MODEL,
        query,
        documents: documents.map((d) => d.content),
        top_n: topN,
        return_documents: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error('Reranker error:', res.status);
      return documents.slice(0, topN);
    }

    const raw = await res.json();
    const ranked = normalizeResponse(raw);

    return ranked
      .filter((r) => r.relevance_score >= MIN_RELEVANCE_SCORE)
      .slice(0, topN)
      .map((r) => ({
        ...documents[r.index],
        similarity: r.relevance_score,
      }));
  } catch (err) {
    console.error('Reranker unavailable, falling back to vector order:', err);
    return documents.slice(0, topN);
  }
}

/** Infinity / TEI 응답 형식 자동 감지 */
function normalizeResponse(raw: unknown): RerankResult[] {
  // Infinity 형식: { results: [{ index, relevance_score }] }
  if (typeof raw === 'object' && raw !== null && 'results' in raw) {
    return (raw as InfinityResponse).results;
  }

  // TEI 형식: [{ index, score }]
  if (Array.isArray(raw)) {
    return (raw as TeiResult[]).map((r) => ({
      index: r.index,
      relevance_score: r.score,
    }));
  }

  return [];
}
