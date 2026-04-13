import { generateEmbedding } from './embeddings';
import { rerankDocuments } from './reranker';
import { searchSimilar } from './vector-store';

export interface RetrievedDocument {
  id: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

// 1차 Qdrant 검색: 리랭킹을 위해 넉넉히 후보군 확보 (기본 20)
const RERANK_CANDIDATES = Number(process.env.RERANKER_CANDIDATES) || 20;

// 리랭킹용 낮은 threshold (더 넓은 후보 확보)
const RERANK_THRESHOLD = 0.15;

export async function retrieveRelevantDocs(query: string, topK = 5): Promise<RetrievedDocument[]> {
  try {
    // 1. 메시지 임베딩 생성
    const embedding = await generateEmbedding(query);

    // 2. 1차 후보군 검색 (Qdrant top 20, cosine similarity ≥ 0.15)
    const results = await searchSimilar(embedding, RERANK_CANDIDATES, RERANK_THRESHOLD);

    const docs = results.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      metadata: r.metadata,
      similarity: r.similarity,
    }));

    // 3. 로컬 리랭킹 (Jina Reranker v2-Base) → 상위 5개만 최종 선별
    //    리랭커 서버 미가동 시 Qdrant 벡터 순서 유지 (graceful fallback)
    return await rerankDocuments(query, docs, topK);
  } catch (err) {
    console.error('RAG retrieval error:', err);
    return [];
  }
}
